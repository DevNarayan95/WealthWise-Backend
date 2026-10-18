declare module 'pino-roll' {
  import type { DestinationStream } from 'pino';

  export interface PinoRollLimit {
    count: number;
    removeOtherLogFiles: boolean;
  }

  export interface PinoRollOptions {
    file: string;
    frequency: 'daily' | 'hourly' | 'date' | number;
    dateFormat?: string;
    extension?: string;
    mkdir?: boolean;
    sync?: boolean;
    limit?: PinoRollLimit;
  }

  export interface PinoRollStream extends DestinationStream {
    end(): void;
  }

  export default function pinoRoll(
    options: PinoRollOptions,
  ): Promise<PinoRollStream>;
}
