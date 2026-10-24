import { readAppConfigFile } from '../../config/app-config';
import { ExportLimitExceededException } from './exceptions/export-limit-exceeded.exception';

export const getExportRowLimit = (): number =>
  readAppConfigFile().export.maxRows;

/**
 * Callers fetch one row more than the limit, so an overflow is detected
 * without running a separate count query.
 */
export const assertWithinExportLimit = (
  fetchedCount: number,
  maxRows: number = getExportRowLimit(),
): void => {
  if (fetchedCount > maxRows) {
    throw new ExportLimitExceededException(maxRows);
  }
};
