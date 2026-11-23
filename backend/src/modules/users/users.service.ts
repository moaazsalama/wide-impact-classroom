import { AppError } from '../../lib/AppError.js';
import { usersRepository } from './users.repository.js';
import { toPublicUser, type User, type UserRole } from './users.types.js';

export const usersService = {
  /** A role is chosen exactly once; changing it later would orphan classrooms/enrollments. */
  async chooseRole(userId: string, role: UserRole): Promise<User> {
    const updated = await usersRepository.setRoleIfUnset(userId, role);
    if (updated) return toPublicUser(updated);

    const existing = await usersRepository.findById(userId);
    if (!existing) throw AppError.unauthenticated('User no longer exists');
    throw new AppError(409, 'ROLE_ALREADY_SET', `Role is already set to "${existing.role}"`);
  },
};
