import { z } from 'zod';
import { USER_ROLES } from './users.types.js';

export const setRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
