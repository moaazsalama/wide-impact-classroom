import { Router, type RequestHandler } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { classroomsController as controller } from './classrooms.controller.js';

export interface ClassroomsRouterDeps {
  authenticate: RequestHandler;
  joinRateLimiter: RequestHandler;
}

export function createClassroomsRouter({ authenticate, joinRateLimiter }: ClassroomsRouterDeps): Router {
  const router = Router();
  const anyRole = requireRole('teacher', 'student');
  const teacher = requireRole('teacher');
  const student = requireRole('student');

  router.use(authenticate);

  router.get('/', anyRole, controller.list);
  router.post('/', teacher, controller.create);

  // Static paths must be registered before `/:id`. Rate limited per user to defeat code guessing.
  router.get('/lookup', student, joinRateLimiter, controller.lookup);
  router.post('/join', student, joinRateLimiter, controller.join);

  router.get('/:id', anyRole, controller.get);
  router.patch('/:id', teacher, controller.update);
  router.delete('/:id', teacher, controller.remove);
  router.post('/:id/join-code', teacher, controller.regenerateJoinCode);
  router.get('/:id/students', teacher, controller.listStudents);
  router.delete('/:id/students/:studentId', teacher, controller.removeStudent);
  router.post('/:id/leave', student, controller.leave);

  return router;
}
