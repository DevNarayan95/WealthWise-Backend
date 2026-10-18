import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EmailDto } from './email.dto';

const validate_ = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(EmailDto, payload));

describe('EmailDto', () => {
  it('accepts a valid email address', async () => {
    expect(
      await validate_({ email: 'john.doe@wealthwise.local' }),
    ).toHaveLength(0);
  });

  it('normalizes the email to trimmed lowercase', () => {
    const dto = plainToInstance(EmailDto, {
      email: '  John.Doe@WealthWise.local ',
    });

    expect(dto.email).toBe('john.doe@wealthwise.local');
  });

  it('rejects a malformed email address', async () => {
    const errors = await validate_({ email: 'john@' });

    expect(errors.map((error) => error.property)).toContain('email');
  });

  it('rejects a non-string email value', async () => {
    const errors = await validate_({ email: 12345 });

    expect(errors.map((error) => error.property)).toContain('email');
  });
});
