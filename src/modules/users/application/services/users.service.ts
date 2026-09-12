import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserInput } from '../inputs/create-user.input';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { UserAlreadyExistsException } from '../../presentation/exceptions/user-already-exists.exception';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new UserAlreadyExistsException();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
