import fs from 'node:fs';
import path from 'node:path';

import pino, { type DestinationStream } from 'pino';

export interface DailyLogFileOptions {
  logsDir: string;
  baseName: string;
  retentionDays: number;
  now?: () => Date;
}

export interface DailyLogFile extends DestinationStream {
  close: () => void;
}

type FileDestination = ReturnType<typeof pino.destination>;

const LOG_DATE_PATTERN = '\\d{4}-\\d{2}-\\d{2}';

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatLogDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const buildDailyLogFileName = (
  baseName: string,
  logDate: string,
): string => `${baseName}-${logDate}.log`;

const shiftLogDate = (logDate: string, days: number): string => {
  const [year, month, day] = logDate.split('-').map(Number);

  return formatLogDate(new Date(year, month - 1, day + days));
};

// Dates are yyyy-MM-dd, so string order matches date order.
export const removeExpiredLogFiles = (
  logsDir: string,
  baseName: string,
  logDate: string,
  retentionDays: number,
): void => {
  const oldestKeptDate = shiftLogDate(logDate, 1 - retentionDays);
  const fileNamePattern = new RegExp(
    `^${baseName}-(${LOG_DATE_PATTERN})\\.log$`,
  );

  for (const entry of fs.readdirSync(logsDir)) {
    const match = fileNamePattern.exec(entry);

    if (match && match[1] < oldestKeptDate) {
      fs.rmSync(path.join(logsDir, entry), { force: true });
    }
  }
};

/**
 * Writes JSON lines to one file per day, named `<baseName>-YYYY-MM-DD.log`.
 * The file switches at the first write after local midnight. Files older than
 * `retentionDays` (today counts as one day) are deleted at each switch.
 */
export const createDailyLogFile = ({
  logsDir,
  baseName,
  retentionDays,
  now = () => new Date(),
}: DailyLogFileOptions): DailyLogFile => {
  let activeDate: string | undefined;
  let destination: FileDestination | undefined;

  const currentDestination = (): FileDestination => {
    const logDate = formatLogDate(now());

    if (destination && logDate === activeDate) {
      return destination;
    }

    destination?.end();
    destination = pino.destination({
      dest: path.join(logsDir, buildDailyLogFileName(baseName, logDate)),
      sync: true,
      mkdir: true,
    });
    activeDate = logDate;
    removeExpiredLogFiles(logsDir, baseName, logDate, retentionDays);

    return destination;
  };

  return {
    write: (msg: string): void => {
      currentDestination().write(msg);
    },
    close: (): void => {
      destination?.end();
      destination = undefined;
      activeDate = undefined;
    },
  };
};
