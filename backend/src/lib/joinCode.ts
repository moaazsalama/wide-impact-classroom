import { randomInt } from 'node:crypto';

export const JOIN_CODE_PATTERN = /^[0-9]{6}$/;
export const JOIN_CODE_CONSTRAINT = 'classrooms_join_code_key';
export const MAX_JOIN_CODE_ATTEMPTS = 5;

/** Cryptographically random 6-digit numeric code, zero-padded (000000–999999). */
export function generateJoinCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Runs `attempt` with fresh join codes until it succeeds or the attempts run out.
 * Only retries on a unique violation of the join-code constraint; other errors propagate.
 */
export async function withUniqueJoinCode<T>(attempt: (code: string) => Promise<T>): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await attempt(generateJoinCode());
    } catch (error) {
      if (i >= MAX_JOIN_CODE_ATTEMPTS || !isJoinCodeCollision(error)) throw error;
    }
  }
}

function isJoinCodeCollision(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === '23505' &&
    (error as { constraint?: unknown }).constraint === JOIN_CODE_CONSTRAINT
  );
}
