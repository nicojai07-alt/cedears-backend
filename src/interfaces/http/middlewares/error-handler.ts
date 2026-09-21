import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[HTTP Error] ${req.method} ${req.path}:`, err);

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Error interno del servidor',
      statusCode
    },
    timestamp: new Date().toISOString()
  });
}
