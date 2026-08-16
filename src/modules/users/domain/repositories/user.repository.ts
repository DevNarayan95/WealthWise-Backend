import { User } from '../entities/user.entity';

export interface CreateUserRepositoryInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export abstract class UserRepository {
  abstract create(input: CreateUserRepositoryInput): Promise<User>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findById(id: string): Promise<User | null>;
}
