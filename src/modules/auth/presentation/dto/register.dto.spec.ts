import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const validPayload = {
  email: 'john.doe@navro.local',
  password: 'Password@123',
  firstName: 'John',
  lastName: 'Doe',
};

const validate_ = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(RegisterDto, payload));

describe('RegisterDto', () => {
  it('accepts a valid payload', async () => {
    expect(await validate_(validPayload)).toHaveLength(0);
  });

  it('normalizes the email to trimmed lowercase', () => {
    const dto = plainToInstance(RegisterDto, {
      ...validPayload,
      email: '  John.Doe@Navro.local ',
    });

    expect(dto.email).toBe('john.doe@navro.local');
  });

  it('rejects an invalid email address', async () => {
    const errors = await validate_({ ...validPayload, email: 'not-an-email' });

    expect(errors.map((error) => error.property)).toContain('email');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const errors = await validate_({ ...validPayload, password: 'Short1!' });

    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('rejects a password longer than 100 characters', async () => {
    const errors = await validate_({
      ...validPayload,
      password: 'P'.repeat(101),
    });

    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('rejects a blank first name', async () => {
    const errors = await validate_({ ...validPayload, firstName: '' });

    expect(errors.map((error) => error.property)).toContain('firstName');
  });

  it('rejects a missing last name', async () => {
    const { lastName: _ignored, ...withoutLastName } = validPayload;
    const errors = await validate_(withoutLastName);

    expect(errors.map((error) => error.property)).toContain('lastName');
  });
});
