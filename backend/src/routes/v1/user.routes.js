import { Router } from 'express';
import * as userController from '../../controllers/user.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermissions } from '../../middlewares/authorize.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  listUsersSchema, userIdSchema, createUserSchema, updateUserSchema,
} from '../../validators/user.validator.js';

const router = Router();
const P = PERMISSIONS;

router.use(authenticate);

router
  .route('/')
  .get(requirePermissions(P.USER_READ), validate(listUsersSchema), userController.listUsers)
  .post(requirePermissions(P.USER_CREATE), validate(createUserSchema), userController.createUser);

router
  .route('/:id')
  .get(requirePermissions(P.USER_READ), validate(userIdSchema), userController.getUser)
  .patch(requirePermissions(P.USER_UPDATE), validate(updateUserSchema), userController.updateUser)
  .delete(requirePermissions(P.USER_DELETE), validate(userIdSchema), userController.deleteUser);

export default router;
