import User from '../models/user.model.js';
import { ROLES } from '../constants/roles.js';
import logger from '../utils/logger.js';

const SEED_USERS = [
  { name: 'Super Admin', email: 'superadmin@example.com', password: 'Password123!', roles: [ROLES.SUPER_ADMIN], isEmailVerified: true },
  { name: 'Admin', email: 'admin@example.com', password: 'Password123!', roles: [ROLES.ADMIN], isEmailVerified: true },
  { name: 'Manager', email: 'manager@example.com', password: 'Password123!', roles: [ROLES.MANAGER], isEmailVerified: true },
  { name: 'Regular User', email: 'user@example.com', password: 'Password123!', roles: [ROLES.USER], isEmailVerified: true },
];

export const seedUsers = async () => {
  for (const data of SEED_USERS) {
    const exists = await User.exists({ email: data.email });
    if (!exists) {
      // Use create (not insertMany) so the password-hash hook runs.
      await User.create(data);
      logger.info(`Seeded user: ${data.email}`);
    }
  }
};

export const destroyUsers = async () => {
  await User.deleteMany({});
  logger.info('Removed all users');
};
