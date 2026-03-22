import { config } from '@src/config';
import { AuthPayload } from '@src/features/auth/interfaces/auth.interface';
import { NotAuthorizedError } from '@src/shared/globals/helpers/error-handler';
import { Request, Response, NextFunction } from 'express';
import JWT from 'jsonwebtoken';

export class AuthMiddleware {
  // verify the user and check if token is valid

  public verifyUser(req: Request, _res: Response, next: NextFunction): void {

    if (!req.session?.jwt || !req.cookies?.session) {
      req.session = null;
      throw new NotAuthorizedError(' Token invalid');
    }

    try {
      const payload: AuthPayload = JWT.verify(req.session?.jwt, config.JWT_SECRET) as AuthPayload;
      req.currentUser = payload;
    } catch (error) {
      req.session = null;
      throw new NotAuthorizedError(`token invalid. please login again ${JSON.stringify(error)}`);
    }
    next();
  }

  // check if user is authenticated

  public checkAuthentication(req: Request, _res: Response, next: NextFunction): void {
    if (!req.currentUser) {
      throw new NotAuthorizedError('You are not authenticated');
    }
    next();
  }
}

export const authMiddleware: AuthMiddleware = new AuthMiddleware();
