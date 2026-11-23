import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import {
  classroomParamsSchema,
  createClassroomSchema,
  joinClassroomSchema,
  lookupQuerySchema,
  studentParamsSchema,
  updateClassroomSchema,
} from './classrooms.schemas.js';
import { classroomsService } from './classrooms.service.js';

export const classroomsController = {
  async list(req: Request, res: Response) {
    res.json({ classrooms: await classroomsService.listForUser(currentUser(req)) });
  },

  async create(req: Request, res: Response) {
    const input = createClassroomSchema.parse(req.body);
    const classroom = await classroomsService.create(currentUser(req).id, input);
    res.status(201).json({ classroom });
  },

  async lookup(req: Request, res: Response) {
    const { code } = lookupQuerySchema.parse(req.query);
    res.json({ classroom: await classroomsService.lookupByCode(code, currentUser(req).id) });
  },

  async join(req: Request, res: Response) {
    const { code, method } = joinClassroomSchema.parse(req.body);
    const result = await classroomsService.join(code, currentUser(req).id, method);
    res.status(result.alreadyEnrolled ? 200 : 201).json(result);
  },

  async get(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    res.json({ classroom: await classroomsService.getForUser(id, currentUser(req)) });
  },

  async update(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    const changes = updateClassroomSchema.parse(req.body);
    res.json({ classroom: await classroomsService.update(id, currentUser(req).id, changes) });
  },

  async remove(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    await classroomsService.remove(id, currentUser(req).id);
    res.status(204).end();
  },

  async regenerateJoinCode(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    res.json({ classroom: await classroomsService.regenerateJoinCode(id, currentUser(req).id) });
  },

  async listStudents(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    res.json({ students: await classroomsService.listStudents(id, currentUser(req).id) });
  },

  async removeStudent(req: Request, res: Response) {
    const { id, studentId } = studentParamsSchema.parse(req.params);
    await classroomsService.removeStudent(id, currentUser(req).id, studentId);
    res.status(204).end();
  },

  async leave(req: Request, res: Response) {
    const { id } = classroomParamsSchema.parse(req.params);
    await classroomsService.leave(id, currentUser(req).id);
    res.status(204).end();
  },
};
