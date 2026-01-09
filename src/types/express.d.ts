// src/types/express.d.ts
import { IUser } from './interfaces';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      companyId?: string;
    }
  }
}