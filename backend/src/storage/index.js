import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * File storage abstraction:
 * - Cloudinary when CLOUDINARY_URL is set.
 * - Local disk (./uploads) otherwise.
 * Both return { url, publicId } so callers are storage-agnostic.
 */
const LOCAL_DIR = path.resolve('uploads');

class LocalStorage {
  async init() {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
  }
  async upload(buffer, { filename = nanoid() } = {}) {
    const safe = `${Date.now()}-${filename}`.replace(/[^\w.-]/g, '_');
    const dest = path.join(LOCAL_DIR, safe);
    await fs.writeFile(dest, buffer);
    return { url: `/uploads/${safe}`, publicId: safe };
  }
  async remove(publicId) {
    await fs.rm(path.join(LOCAL_DIR, publicId), { force: true });
  }
}

class CloudinaryStorage {
  constructor(client) {
    this.client = client;
  }
  upload(buffer, { folder = 'uploads' } = {}) {
    return new Promise((resolve, reject) => {
      const stream = this.client.uploader.upload_stream({ folder }, (err, result) => {
        if (err) return reject(err);
        return resolve({ url: result.secure_url, publicId: result.public_id });
      });
      stream.end(buffer);
    });
  }
  remove(publicId) {
    return this.client.uploader.destroy(publicId);
  }
}

let storage = new LocalStorage();

export const initStorage = async () => {
  if (!config.cloudinary.enabled) {
    await storage.init();
    logger.info('Storage: local disk (Cloudinary not configured)');
    return storage;
  }
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({ secure: true }); // reads CLOUDINARY_URL from env
    storage = new CloudinaryStorage(cloudinary);
    logger.info('Storage: Cloudinary enabled');
  } catch (err) {
    logger.warn(`Storage: Cloudinary unavailable (${err.message}); using local disk`);
    storage = new LocalStorage();
    await storage.init();
  }
  return storage;
};

export const getStorage = () => storage;
