import { AppError } from '../utils/appError.js';
export const validate = (schema) => (req, res, next) => { const result = schema.safeParse(req.body); if (!result.success) return next(new AppError(result.error.issues[0].message, 422)); req.body = result.data; next(); };
