import { UserResponseMapper } from './user-response.mapper';
import { User } from '../../domain/entities/user.entity';

describe('UserResponseMapper', () => {
  it('should map a user without exposing sensitive fields', () => {
    const user = {
      id: '7f5d9c7e-6f1c-4e2b-8a3e-123456789abc',
      email: 'admin@wealthwise.local',
      passwordHash: '$2b$12$some-hash-value',
      firstName: 'System',
      lastName: 'Administrator',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-06T10:00:00.000Z'),
      updatedAt: new Date('2026-08-06T10:00:00.000Z'),
    } as User;

    const result = UserResponseMapper.toDto(user);

    expect(result).toEqual({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('roles');
    expect(result).not.toHaveProperty('permissions');
  });
});
