import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { ITokenPayload } from '../types/interfaces';

export class JWTUtil {
  static generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
    });
  }

  static generateRefreshToken(payload: ITokenPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    });
  }

  static verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(token, config.jwt.secret) as ITokenPayload;
  }

  static verifyRefreshToken(token: string): ITokenPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as ITokenPayload;
  }

  static decodeToken(token: string): ITokenPayload | null {
    return jwt.decode(token) as ITokenPayload | null;
  }
}
