/**
 * lib/export/zip-helper.ts
 *
 * Safe Archiver ZIP factory helper with CJS/ESM interop fallback.
 * Prevents runtime "archiver is not a function" errors across Next.js / Turbopack / Node runtime versions.
 */
import * as archiverModule from 'archiver';

export function createZipArchive(options: archiverModule.ArchiverOptions = { zlib: { level: 6 } }): archiverModule.Archiver {
  const fn = archiverModule as any;

  // 1. Direct function call: archiver('zip', options)
  if (typeof fn === 'function') {
    return fn('zip', options);
  }

  // 2. Named create method: archiver.create('zip', options)
  if (typeof fn?.create === 'function') {
    return fn.create('zip', options);
  }

  // 3. Namespace default property: archiver.default('zip', options)
  if (typeof fn?.default === 'function') {
    return fn.default('zip', options);
  }

  // 4. Namespace default.create method
  if (typeof fn?.default?.create === 'function') {
    return fn.default.create('zip', options);
  }

  throw new Error(`Failed to initialize archiver (archiver type: ${typeof fn}, keys: ${Object.keys(fn || {}).join(',')})`);
}
