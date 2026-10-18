import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyEmailDto } from './verify-email.dto';

const validPayload = {
  email: 'john.doe@wealthwise.local',
  code: '123456',
};

const validate_ = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(VerifyEmailDto, payload));

describe('VerifyEmailDto', () => {
  it('accepts a valid payload', async () => {
    expect(await validate_(validPayload)).toHaveLength(0);
  });

  it('normalizes the email to trimmed lowercase', () => {
    const dto = plainToInstance(VerifyEmailDto, {
      ...validPayload,
      email: ' John.Doe@WealthWise.local ',
    });

    expect(dto.email).toBe('john.doe@wealthwise.local');
  });

  it('rejects a code that contains non-digit characters', async () => {
    const errors = await validate_({ ...validPayload, code: '12a456' });

    expect(errors.map((error) => error.property)).toContain('code');
  });

  it('rejects a code shorter than 4 digits', async () => {
    const errors = await validate_({ ...validPayload, code: '123' });

    expect(errors.map((error) => error.property)).toContain('code');
  });

  it('rejects a code longer than 10 digits', async () => {
    const errors = await validate_({
      ...validPayload,
      code: '12345678901',
    });

    expect(errors.map((error) => error.property)).toContain('code');
  });

  it('rejects an invalid email address', async () => {
    const errors = await validate_({ ...validPayload, email: 'nope' });

    expect(errors.map((error) => error.property)).toContain('email');
  });
});
