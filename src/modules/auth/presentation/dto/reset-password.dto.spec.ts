import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

const validPayload = {
  email: 'john.doe@navro.local',
  code: '123456',
  newPassword: 'NewPassword@123',
};

const validate_ = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(ResetPasswordDto, payload));

describe('ResetPasswordDto', () => {
  it('accepts a valid payload', async () => {
    expect(await validate_(validPayload)).toHaveLength(0);
  });

  it('normalizes the email to trimmed lowercase', () => {
    const dto = plainToInstance(ResetPasswordDto, {
      ...validPayload,
      email: ' John.Doe@Navro.local ',
    });

    expect(dto.email).toBe('john.doe@navro.local');
  });

  it('rejects a non-numeric code', async () => {
    const errors = await validate_({ ...validPayload, code: 'abcdef' });

    expect(errors.map((error) => error.property)).toContain('code');
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const errors = await validate_({ ...validPayload, newPassword: 'short' });

    expect(errors.map((error) => error.property)).toContain('newPassword');
  });

  it('rejects a new password longer than 100 characters', async () => {
    const errors = await validate_({
      ...validPayload,
      newPassword: 'N'.repeat(101),
    });

    expect(errors.map((error) => error.property)).toContain('newPassword');
  });

  it('rejects a payload without the email field', async () => {
    const { email: _ignored, ...withoutEmail } = validPayload;
    const errors = await validate_(withoutEmail);

    expect(errors.map((error) => error.property)).toContain('email');
  });
});
