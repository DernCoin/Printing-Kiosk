import type { Request, Response, NextFunction } from 'express';

export type ClientType = 'patron' | 'staff' | 'phone';

declare global {
  namespace Express {
    interface Request {
      clientType?: ClientType;
      io?: any;
    }
  }
}

/**
 * Tags requests with client type based on x-client-type header.
 * No authentication — trusted LAN only.
 */
const clientIdentity = (req: Request, _res: Response, next: NextFunction): void => {
  const clientType = req.headers['x-client-type'] as ClientType | undefined;
  req.clientType = clientType || 'patron';
  next();
};

export default clientIdentity;
