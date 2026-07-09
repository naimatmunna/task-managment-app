import dns from 'node:dns/promises';
import { MongoClient } from 'mongodb';

/** Use reliable public DNS — fixes querySrv ECONNREFUSED on some Windows routers/ISPs. */
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

/**
 * On some Windows networks Node's SRV lookup fails (querySrv ECONNREFUSED).
 * Resolve SRV manually, discover the real replica set name, and return mongodb:// URI.
 */
export async function resolveMongoUri(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return uri;

  const withoutScheme = uri.slice('mongodb+srv://'.length);
  const at = withoutScheme.indexOf('@');
  const authPart = at >= 0 ? withoutScheme.slice(0, at + 1) : '';
  const rest = at >= 0 ? withoutScheme.slice(at + 1) : withoutScheme;
  const slash = rest.indexOf('/');
  const host = slash >= 0 ? rest.slice(0, slash) : rest;
  const pathAndQuery = slash >= 0 ? rest.slice(slash) : '/';

  const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
  if (!records.length) throw new Error(`No SRV records for ${host}`);

  records.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
  const hosts = records.map((r) => `${r.name}:${r.port}`).join(',');
  const firstHost = `${records[0].name}:${records[0].port}`;

  const dbPath = pathAndQuery.split('?')[0] || '/';
  const replicaSet = await discoverReplicaSetName(authPart, firstHost, dbPath);

  const params = new URLSearchParams();
  params.set('ssl', 'true');
  params.set('authSource', 'admin');
  params.set('retryWrites', 'true');
  params.set('w', 'majority');
  if (replicaSet) params.set('replicaSet', replicaSet);

  const existing = pathAndQuery.includes('?') ? pathAndQuery.split('?')[1] : '';
  if (existing) {
    for (const part of existing.split('&')) {
      const [k, v] = part.split('=');
      if (k && !params.has(k)) params.set(k, v ?? '');
    }
  }

  return `mongodb://${authPart}${hosts}${dbPath}?${params.toString()}`;
}

async function discoverReplicaSetName(authPart, firstHost, dbPath) {
  const probeUri = `mongodb://${authPart}${firstHost}${dbPath}?ssl=true&authSource=admin&directConnection=true`;
  const client = new MongoClient(probeUri, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  });

  try {
    await client.connect();
    const hello = await client.db('admin').command({ hello: 1 });
    return hello.setName ?? null;
  } finally {
    await client.close().catch(() => {});
  }
}
