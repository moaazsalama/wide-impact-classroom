import { z } from 'zod';
import { JOIN_CODE_PATTERN } from '../../lib/joinCode.js';
import { JOIN_METHODS } from './classrooms.types.js';

/** Optional free-text field: trimmed, and an empty string is stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === '' ? null : value));

const classroomFields = {
  name: z.string().trim().min(1, 'Name is required').max(100),
  subject: optionalText(100),
  description: optionalText(500),
};

export const createClassroomSchema = z.object(classroomFields);

export const updateClassroomSchema = z
  .object({
    name: classroomFields.name.optional(),
    subject: classroomFields.subject,
    description: classroomFields.description,
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

const joinCode = z.string().regex(JOIN_CODE_PATTERN, 'Join code must be exactly 6 digits');

export const lookupQuerySchema = z.object({ code: joinCode });

export const joinClassroomSchema = z.object({
  code: joinCode,
  method: z.enum(JOIN_METHODS),
});

export const classroomParamsSchema = z.object({ id: z.uuid() });

export const studentParamsSchema = z.object({ id: z.uuid(), studentId: z.uuid() });
