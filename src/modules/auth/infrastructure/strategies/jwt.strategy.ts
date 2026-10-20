import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedUser } from '../interfaces/authenticated-request.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { AuthSessionRepository } from '../../domain/repositories/auth-session.repository';
import { SessionRevokedException } from '../../presentation/exceptions/session-revoked.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('secrets.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Authentication is required');
    }

    // Access tokens are only valid while their session is still open.
    // The lookup runs on every request on purpose, so logout takes effect immediately.
    if (!payload.sid) {
      throw new SessionRevokedException();
    }

    const session = await this.sessionRepository.findActiveSessionById(
      payload.sid,
    );

    if (!session || session.userId !== user.id) {
      throw new SessionRevokedException();
    }

    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: session.id,
    };
  }
}
