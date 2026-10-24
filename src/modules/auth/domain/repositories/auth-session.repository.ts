export type SessionRevokeReason =
  'LOGOUT' | 'LOGOUT_ALL' | 'REFRESH_TOKEN_REUSED' | 'PASSWORD_RESET';

export interface AuthSessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface RefreshTokenRecord {
  id: string;
  sessionId: string;
  usedAt: Date | null;
  session: AuthSessionRecord;
}

export interface CreateAuthSessionInput {
  userId: string;
  expiresAt: Date;
  refreshTokenHash: string;
}

export interface RotateRefreshTokenInput {
  currentTokenId: string;
  sessionId: string;
  nextTokenHash: string;
}

export abstract class AuthSessionRepository {
  /** Creates a session together with its first refresh token. */
  abstract createSession(
    input: CreateAuthSessionInput,
  ): Promise<AuthSessionRecord>;

  /** Returns the session only when it is not revoked and not yet expired. */
  abstract findActiveSessionById(id: string): Promise<AuthSessionRecord | null>;

  /** Looks up a refresh token by the hash of its value, including its session. */
  abstract findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | null>;

  /**
   * Marks the current refresh token as used and stores the next one, in one
   * transaction. Returns false when the current token was already used, which
   * means a concurrent request won the race.
   */
  abstract rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean>;

  /** Revokes one session. Already-revoked sessions keep their original reason. */
  abstract revokeSession(
    sessionId: string,
    reason: SessionRevokeReason,
  ): Promise<void>;

  /** Revokes every still-active session of a user. */
  abstract revokeAllSessionsForUser(
    userId: string,
    reason: SessionRevokeReason,
  ): Promise<void>;

  /** Hard-deletes sessions expired at or before `now`. Their refresh tokens cascade. */
  abstract deleteExpiredSessions(now: Date): Promise<number>;
}
