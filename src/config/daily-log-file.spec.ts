import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildDailyLogFileName,
  createDailyLogFile,
  formatLogDate,
  removeExpiredLogFiles,
} from './daily-log-file';

describe('daily log file', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navro-daily-log-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('formatLogDate', () => {
    it('formats the local date as yyyy-MM-dd with zero padding', () => {
      expect(formatLogDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });
  });

  describe('buildDailyLogFileName', () => {
    it('joins the base name, date, and .log extension', () => {
      expect(buildDailyLogFileName('app', '2026-10-18')).toBe(
        'app-2026-10-18.log',
      );
    });
  });

  describe('createDailyLogFile', () => {
    it('creates the logs folder and writes to today file', () => {
      const logsDir = path.join(tempDir, 'nested', 'logs');
      const stream = createDailyLogFile({
        logsDir,
        baseName: 'app',
        retentionDays: 30,
        now: () => new Date(2026, 9, 18, 10),
      });

      stream.write('{"msg":"hello"}\n');
      stream.close();

      expect(fs.readdirSync(logsDir)).toEqual(['app-2026-10-18.log']);
      expect(
        fs.readFileSync(path.join(logsDir, 'app-2026-10-18.log'), 'utf8'),
      ).toBe('{"msg":"hello"}\n');
    });

    it('switches to a new file at the first write after local midnight', () => {
      const logsDir = path.join(tempDir, 'logs');
      let current = new Date(2026, 9, 18, 23, 59);
      const stream = createDailyLogFile({
        logsDir,
        baseName: 'error',
        retentionDays: 30,
        now: () => current,
      });

      stream.write('before midnight\n');
      current = new Date(2026, 9, 19, 0, 0, 1);
      stream.write('after midnight\n');
      stream.close();

      expect(fs.readdirSync(logsDir).sort()).toEqual([
        'error-2026-10-18.log',
        'error-2026-10-19.log',
      ]);
      expect(
        fs.readFileSync(path.join(logsDir, 'error-2026-10-18.log'), 'utf8'),
      ).toBe('before midnight\n');
      expect(
        fs.readFileSync(path.join(logsDir, 'error-2026-10-19.log'), 'utf8'),
      ).toBe('after midnight\n');
    });

    it('appends to the existing file when the process restarts on the same day', () => {
      const logsDir = path.join(tempDir, 'logs');
      const options = {
        logsDir,
        baseName: 'app',
        retentionDays: 30,
        now: () => new Date(2026, 9, 18, 9),
      };

      const first = createDailyLogFile(options);
      first.write('first run\n');
      first.close();

      const second = createDailyLogFile(options);
      second.write('second run\n');
      second.close();

      expect(
        fs.readFileSync(path.join(logsDir, 'app-2026-10-18.log'), 'utf8'),
      ).toBe('first run\nsecond run\n');
    });
  });

  describe('removeExpiredLogFiles', () => {
    it('keeps retentionDays files including today and deletes older files of the same base name', () => {
      const logsDir = path.join(tempDir, 'logs');
      fs.mkdirSync(logsDir);

      const expired = ['app-2026-10-14.log', 'app-2026-10-15.log'];
      const kept = [
        'app-2026-10-16.log',
        'app-2026-10-17.log',
        'app-2026-10-18.log',
      ];
      const unrelated = [
        'error-2026-10-01.log',
        'app-notes.txt',
        'app-2026-10-01.1.log',
      ];

      for (const name of [...expired, ...kept, ...unrelated]) {
        fs.writeFileSync(path.join(logsDir, name), '');
      }

      removeExpiredLogFiles(logsDir, 'app', '2026-10-18', 3);

      expect(fs.readdirSync(logsDir).sort()).toEqual(
        [...kept, ...unrelated].sort(),
      );
    });

    it('deletes files across month boundaries', () => {
      const logsDir = path.join(tempDir, 'logs');
      fs.mkdirSync(logsDir);
      fs.writeFileSync(path.join(logsDir, 'app-2026-09-30.log'), '');
      fs.writeFileSync(path.join(logsDir, 'app-2026-10-01.log'), '');

      removeExpiredLogFiles(logsDir, 'app', '2026-10-02', 2);

      expect(fs.readdirSync(logsDir)).toEqual(['app-2026-10-01.log']);
    });
  });
});
