import { PasswordHasherService } from '../services/password-hasher.service';

describe('PasswordHasherService', () => {
  let service: PasswordHasherService;

  beforeEach(() => {
    service = new PasswordHasherService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'Password123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
    });

    it('should generate a different hash for the same password', async () => {
      const password = 'Password123!';

      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return true for the correct password', async () => {
      const password = 'Password123!';
      const hash = await service.hash(password);
      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const password = 'Password123!';
      const wrongPassword = 'WrongPassword123!';

      const hash = await service.hash(password);
      const result = await service.verify(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });
});
