import { Router } from 'express';
import * as taskController from '../../controllers/task.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg } from '../../middlewares/resolveOrg.js';
import {
  createTaskSchema,
  updateTaskSchema,
  reorderSchema,
  commentSchema,
  taskIdSchema,
  listTasksSchema,
} from '../../validators/task.validator.js';

const router = Router();

// All task routes are authenticated + org-scoped. Any active member may manage
// tasks in their org (finer per-task rules can be layered on later).
router.use(authenticate, resolveOrg);

router.get('/', validate(listTasksSchema), taskController.listTasks);
router.get('/board', validate(listTasksSchema), taskController.boardTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/:id', validate(taskIdSchema), taskController.getTask);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.post('/:id/reorder', validate(reorderSchema), taskController.reorderTask);
router.post('/:id/comment', validate(commentSchema), taskController.commentTask);
router.delete('/:id', validate(taskIdSchema), taskController.deleteTask);

export default router;
