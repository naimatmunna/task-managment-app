/**
 * Idempotent database seeder for the PropVia demo workspace.
 *   npm run seed           # create the demo org, users, teams and tasks
 *   npm run seed:destroy   # remove the demo data
 */
import { connectDatabase, disconnectDatabase } from '../src/loaders/database.js';
import { seedDemo, destroyDemo } from '../src/seeders/demo.seeder.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  const destroy = process.argv.includes('--destroy');
  await connectDatabase();
  try {
    if (destroy) await destroyDemo();
    else await seedDemo();
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
