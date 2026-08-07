import { User } from '../../../../prisma/generated/prisma/client';

export abstract class UserRepository {
  abstract create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<User>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findById(id: string): Promise<User | null>;
}
