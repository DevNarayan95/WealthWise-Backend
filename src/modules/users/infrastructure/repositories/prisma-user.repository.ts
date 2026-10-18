import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import { User, UserStatus } from '../../domain/entities/user.entity';
import {
  CreateUserRepositoryInput,
  UserRepository,
} from '../../domain/repositories/user.repository';

type PrismaDatabaseClient = Pick<PrismaService, 'user' | 'rolePermission'>;

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaDatabaseClient,
  ) {
    super();
  }

  async create(input: CreateUserRepositoryInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: { ...input, emailVerifiedAt: input.emailVerifiedAt ?? null },
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

  async markEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: verifiedAt },
    });
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async findPermissionsByUserId(userId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: {
          users: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map(
      ({ permission }) => `${permission.resource}:${permission.action}`,
    );
  }

  private toDomain(user: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.create({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
