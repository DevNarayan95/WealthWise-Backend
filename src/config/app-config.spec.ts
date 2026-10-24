import {
  assertSslFilesExist,
  buildAppConfig,
  loadAppConfigFile,
  validateAppConfigFile,
} from './app-config';
import { loadConfig, REPO_CONFIG_DIR } from './config-loader';

const SECRET = 'x'.repeat(48);

const validSecrets: NodeJS.ProcessEnv = {
  JWT_SECRET: SECRET,
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/navro_db',
  API_KEY_WEB_FRONTEND: SECRET,
  API_KEY_MOBILE_APP: SECRET,
};

const loadRawDefaults = (): Record<string, unknown> =>
  loadConfig({ configDir: REPO_CONFIG_DIR, appEnv: 'local' }).config;

describe('app-config', () => {
  describe('loadAppConfigFile', () => {
    it('returns a validated file for the local environment', () => {
      const file = loadAppConfigFile({
        configDir: REPO_CONFIG_DIR,
        appEnv: 'local',
      });

      expect(file.app.environment).toBe('local');
      expect(file.app.baseUrl).toEqual(expect.any(String));
      expect(file.security.publicRouteMetadataKey).toEqual(expect.any(String));
      expect(file.logging.logsPath).toEqual(expect.any(String));
      expect(file.logging.retentionDays).toBe(30);
    });
  });

  describe('validateAppConfigFile', () => {
    it('rejects an error prefix that is not letters only and names the path', () => {
      const raw = loadRawDefaults();
      (raw.errors as Record<string, unknown>).statusCodePrefix = 'NV1';

      expect(() => validateAppConfigFile(raw)).toThrow(
        'errors.statusCodePrefix',
      );
    });

    it('requires key and certificate paths when SSL is enabled', () => {
      const raw = loadRawDefaults();
      (raw.server as { ssl: Record<string, unknown> }).ssl = {
        enabled: true,
        keyPath: '',
        certPath: '',
        caPath: '',
      };

      expect(() => validateAppConfigFile(raw)).toThrow('server.ssl.keyPath');
    });

    it('rejects an unknown log level', () => {
      const raw = loadRawDefaults();
      (raw.logging as Record<string, unknown>).level = 'verbose';

      expect(() => validateAppConfigFile(raw)).toThrow('logging.level');
    });

    it('rejects a default page size larger than the max page size', () => {
      const raw = loadRawDefaults();
      raw.pagination = { defaultPageSize: 200, maxPageSize: 100 };

      expect(() => validateAppConfigFile(raw)).toThrow('pagination');
    });

    it('rejects a max page size below 1', () => {
      const raw = loadRawDefaults();
      raw.pagination = { defaultPageSize: 1, maxPageSize: 0 };

      expect(() => validateAppConfigFile(raw)).toThrow(
        'pagination.maxPageSize',
      );
    });
    it('rejects an income category name max length below 1', () => {
      const raw = loadRawDefaults();
      raw.income = { categoryNameMaxLength: 0 };

      expect(() => validateAppConfigFile(raw)).toThrow(
        'income.categoryNameMaxLength',
      );
    });

    it('rejects an OTP length below 4', () => {
      const raw = loadRawDefaults();
      (raw.otp as Record<string, unknown>).length = 3;

      expect(() => validateAppConfigFile(raw)).toThrow('otp.length');
    });

    it('rejects zero OTP attempts', () => {
      const raw = loadRawDefaults();
      (raw.otp as Record<string, unknown>).maxAttempts = 0;

      expect(() => validateAppConfigFile(raw)).toThrow('otp.maxAttempts');
    });

    it('rejects an OTP expiry below 60 seconds', () => {
      const raw = loadRawDefaults();
      (raw.otp as Record<string, unknown>).expiresInSeconds = 59;

      expect(() => validateAppConfigFile(raw)).toThrow('otp.expiresInSeconds');
    });

    it('rejects a non-boolean email verification flag', () => {
      const raw = loadRawDefaults();
      raw.registration = { emailVerificationRequired: 'yes' };

      expect(() => validateAppConfigFile(raw)).toThrow(
        'registration.emailVerificationRequired',
      );
    });

    it('rejects the placeholder SMTP host left in the defaults', () => {
      const raw = loadRawDefaults();
      (raw.mail as { smtp: Record<string, unknown> }).smtp.host =
        'CHANGE_ME_SMTP_HOST';

      expect(() => validateAppConfigFile(raw)).toThrow('mail.smtp.host');
    });

    it('rejects an SMTP port outside the valid TCP range', () => {
      const raw = loadRawDefaults();
      (raw.mail as { smtp: Record<string, unknown> }).smtp.port = 70000;

      expect(() => validateAppConfigFile(raw)).toThrow('mail.smtp.port');
    });

    it('accepts a critical API threshold equal to the slow threshold', () => {
      const raw = loadRawDefaults();
      const apiBenchmark = (
        raw.monitoring as { apiBenchmark: Record<string, number> }
      ).apiBenchmark;
      apiBenchmark.slowRequestMs = 1000;
      apiBenchmark.criticalRequestMs = 1000;

      expect(() => validateAppConfigFile(raw)).not.toThrow();
    });

    it('rejects a critical API threshold below the slow threshold', () => {
      const raw = loadRawDefaults();
      const apiBenchmark = (
        raw.monitoring as { apiBenchmark: Record<string, number> }
      ).apiBenchmark;
      apiBenchmark.slowRequestMs = 2000;
      apiBenchmark.criticalRequestMs = 1000;

      expect(() => validateAppConfigFile(raw)).toThrow(
        'monitoring.apiBenchmark.criticalRequestMs',
      );
    });
  });

  describe('export config', () => {
    it('loads export defaults from default.json', () => {
      const file = loadAppConfigFile({
        configDir: REPO_CONFIG_DIR,
        appEnv: 'local',
      });

      expect(file.export.maxRows).toBeGreaterThan(0);
      expect(file.export.fileNamePrefix).toBe('navro');
      expect(file.export.csv.delimiter).toBe(',');
      expect(file.export.pdf.pageSize).toBe('A4');
    });

    it('rejects a zero export row limit', () => {
      const raw = loadRawDefaults();
      (raw.export as Record<string, unknown>).maxRows = 0;

      expect(() => validateAppConfigFile(raw)).toThrow('export.maxRows');
    });

    it('rejects a file name prefix with spaces or symbols', () => {
      const raw = loadRawDefaults();
      (raw.export as Record<string, unknown>).fileNamePrefix = 'my file!';

      expect(() => validateAppConfigFile(raw)).toThrow('export.fileNamePrefix');
    });

    it('rejects a CSV delimiter longer than one character', () => {
      const raw = loadRawDefaults();
      (raw.export as { csv: Record<string, unknown> }).csv.delimiter = ';;';

      expect(() => validateAppConfigFile(raw)).toThrow('export.csv.delimiter');
    });

    it('rejects an unsupported PDF page size', () => {
      const raw = loadRawDefaults();
      (raw.export as { pdf: Record<string, unknown> }).pdf.pageSize = 'A7';

      expect(() => validateAppConfigFile(raw)).toThrow('export.pdf.pageSize');
    });

    it('rejects a PDF font size below 6 points', () => {
      const raw = loadRawDefaults();
      (raw.export as { pdf: Record<string, unknown> }).pdf.fontSize = 5;

      expect(() => validateAppConfigFile(raw)).toThrow('export.pdf.fontSize');
    });
  });

  describe('assertSslFilesExist', () => {
    it('does nothing when SSL is disabled', () => {
      const file = validateAppConfigFile(loadRawDefaults());

      expect(() => assertSslFilesExist(file)).not.toThrow();
    });

    it('throws when enabled SSL files are missing on disk', () => {
      const raw = loadRawDefaults();
      (raw.server as { ssl: Record<string, unknown> }).ssl = {
        enabled: true,
        keyPath: '/does/not/exist/key.pem',
        certPath: '/does/not/exist/cert.pem',
        caPath: '',
      };
      const file = validateAppConfigFile(raw);

      expect(() => assertSslFilesExist(file)).toThrow('SSL key file not found');
    });
  });

  describe('buildAppConfig', () => {
    it('reads secrets from the environment and resolves API client keys', () => {
      const file = validateAppConfigFile(loadRawDefaults());

      const config = buildAppConfig(file, validSecrets);

      expect(config.secrets).toEqual({
        jwtSecret: SECRET,
        databaseUrl: validSecrets.DATABASE_URL,
      });
      expect(config.security.apiClients).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'web-frontend', key: SECRET }),
          expect.objectContaining({ name: 'mobile-app', key: SECRET }),
        ]),
      );
    });

    it('fails when JWT_SECRET is missing', () => {
      const file = validateAppConfigFile(loadRawDefaults());
      const env = { ...validSecrets, JWT_SECRET: undefined };

      expect(() => buildAppConfig(file, env)).toThrow('JWT_SECRET');
    });

    it('fails when JWT_SECRET is shorter than 32 characters', () => {
      const file = validateAppConfigFile(loadRawDefaults());
      const env = { ...validSecrets, JWT_SECRET: 'short' };

      expect(() => buildAppConfig(file, env)).toThrow('JWT_SECRET');
    });

    it('fails when an API client key environment variable is missing', () => {
      const file = validateAppConfigFile(loadRawDefaults());
      const env = { ...validSecrets, API_KEY_MOBILE_APP: undefined };

      expect(() => buildAppConfig(file, env)).toThrow('API_KEY_MOBILE_APP');
    });
  });
});
