import type { IncomingMessage } from 'http';
import type { Response } from 'superagent';

/**
 * Buffers a binary response body so PDF and CSV exports can be asserted
 * byte-for-byte. Supertest only buffers text types by default.
 *
 * Superagent types the parser argument as its own Response, but at runtime it
 * passes the raw Node response stream, which is what is read here.
 */
export const binaryParser = (
  response: Response,
  callback: (error: Error | null, body: Buffer) => void,
): void => {
  const stream = response as unknown as IncomingMessage;
  const chunks: Buffer[] = [];

  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', () => callback(null, Buffer.concat(chunks)));
};
