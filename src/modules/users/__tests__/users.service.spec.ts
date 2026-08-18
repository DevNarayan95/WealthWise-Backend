import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';

import { UsersService } from '../services/users.service';
import { PasswordHasherService } from '../services/password-hasher.service';
import { UserRepository } from '../domain/repositories/user.repository';
import { UserAlreadyExistsException } from '../exceptions/user-already-exists.exception';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: repository,
        },
        {
          provide: PasswordHasherService,
          useValue: passwordHasher,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = {
        id: 'user-id',
        email: input.email,
        passwordHash: 'hashed-password',
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any;

      repository.findByEmail.mockResolvedValue(null);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      repository.create.mockResolvedValue(createdUser);

      const result = await service.create(input);

      expect(repository.findByEmail).toHaveBeenCalledWith(input.email);

      expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);

      expect(repository.create).toHaveBeenCalledWith({
        email: input.email,
        passwordHash: 'hashed-password',
        firstName: input.firstName,
        lastName: input.lastName,
      });

      expect(result).toEqual(createdUser);
    });

    it('should reject duplicate email', async () => {
      const existingUser = {
        id: 'existing-user',
        email: 'test@example.com',
      } as any;

      repository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(UserAlreadyExistsException);
      expect(repository.create).not.toHaveBeenCalled();
      expect(passwordHasher.hash).not.toHaveBeenCalled();
    });

    it('should hash the password before storing it', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = {
        id: 'user-id',
        email: input.email,
        passwordHash: 'hashed-password',
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any;

      repository.findByEmail.mockResolvedValue(null);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      repository.create.mockResolvedValue(createdUser);

      await service.create(input);

      expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);

      expect(repository.create).toHaveBeenCalledWith({
        email: input.email,
        passwordHash: 'hashed-password',
        firstName: input.firstName,
        lastName: input.lastName,
      });

      const createCall = repository.create.mock.calls[0][0];

      expect(createCall.passwordHash).not.toBe(input.password);
    });
  });

  describe('findByEmail', () => {
    it('should return the user', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
      } as any;

      repository.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail(user.email);

      expect(result).toEqual(user);
      expect(repository.findByEmail).toHaveBeenCalledWith(user.email);
    });
  });

  describe('findById', () => {
    it('should return the user', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
      } as any;

      repository.findById.mockResolvedValue(user);

      const result = await service.findById(user.id);

      expect(result).toEqual(user);
      expect(repository.findById).toHaveBeenCalledWith(user.id);
    });

    it('should return null when the user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findById('unknown-id');

      expect(result).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith('unknown-id');
    });
  });
});
