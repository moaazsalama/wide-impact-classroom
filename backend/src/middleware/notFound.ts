import type { Request, Response } from 'express';
import { errorBody } from '../lib/AppError.js';

export function notFound(req: Request, res: Response) {
  res.status(404).json(errorBody('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}
