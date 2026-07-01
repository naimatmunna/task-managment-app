/**
 * Idempotent database seeder.
 *   npm run seed           # insert seed data
 *   npm run seed:destroy   # wipe seed data
 */
import { connectDatabase, disconnectDatabase } from '../src/loaders/database.js';
import { seedUsers, destroyUsers } from '../src/seeders/user.seeder.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  const destroy = process.argv.includes('--destroy');
  await connectDatabase();
  try {
    if (destroy) await destroyUsers();
    else await seedUsers();
    logger.info(destroy ? 'Seed destroy complete' : 'Seed complete');
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

run().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
