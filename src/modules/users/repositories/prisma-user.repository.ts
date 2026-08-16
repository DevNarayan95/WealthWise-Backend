import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

import { User } from '../domain/entities/user.entity';
import {
  CreateUserRepositoryInput,
  UserRepository,
} from '../domain/repositories/user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateUserRepositoryInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: input,
    });

    return this.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  private toDomain(user: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.create({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
