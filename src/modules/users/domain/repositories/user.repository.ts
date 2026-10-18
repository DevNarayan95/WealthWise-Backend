import { User } from '../entities/user.entity';

export interface CreateUserRepositoryInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  emailVerifiedAt?: Date | null;
}

export abstract class UserRepository {
  abstract create(input: CreateUserRepositoryInput): Promise<User>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findById(id: string): Promise<User | null>;

  abstract findPermissionsByUserId(userId: string): Promise<string[]>;

  abstract markEmailVerified(userId: string, verifiedAt: Date): Promise<void>;

  abstract updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void>;
}
