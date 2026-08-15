/**
 * lib/export/zip-helper.ts
 *
 * Deterministic Archiver ZIP factory using pinned top-level archiver 5.3.2 dependency.
 */
import archiver from 'archiver';

export function createZipArchive(options: archiver.ArchiverOptions = { zlib: { level: 6 } }): archiver.Archiver {
  const fn = (typeof archiver === 'function' ? archiver : (archiver as any).default) as unknown as (
    format: string,
    options?: archiver.ArchiverOptions
  ) => archiver.Archiver;

  return fn('zip', options);
}
