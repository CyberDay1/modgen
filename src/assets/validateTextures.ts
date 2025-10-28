import fs from 'fs';
import path from 'path';

export type TextureValidationErrorCode =
  | 'not-string'
  | 'empty'
  | 'missing-filename'
  | 'invalid-extension'
  | 'traversal'
  | 'absolute-path'
  | 'outside-project'
  | 'missing-file';

export interface TextureValidationError {
  code: TextureValidationErrorCode;
  message: string;
}

export interface TextureValidationOptions {
  /**
   * When true the validator will accept absolute paths. By default only relative
   * paths are considered valid texture locations.
   */
  allowAbsolute?: boolean;
  /**
   * Optional project root. When supplied any resolved paths must remain within
   * this directory to be considered valid.
   */
  projectRoot?: string;
  /**
   * When true the validator will ensure the referenced texture already exists
   * on disk.
   */
  requireExists?: boolean;
  /**
   * Optional override for the existence check, primarily for tests.
   */
  existsSync?: (targetPath: string) => boolean;
}

export interface TextureValidationResult {
  valid: boolean;
  /**
   * Normalised representation of the texture path using POSIX style separators.
   */
  normalisedPath?: string;
  errors: TextureValidationError[];
}

const PNG_EXTENSION = '.png';

function ensureString(value: unknown): value is string {
  return typeof value === 'string';
}

function listSegments(input: string): string[] {
  return input.split(/[\\/]+/).filter((segment) => segment.length > 0);
}

function hasTraversal(segments: string[]): boolean {
  return segments.some((segment) => segment === '.' || segment === '..');
}

function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}

function resolveAgainstProject(targetPath: string, projectRoot?: string): string {
  if (projectRoot) {
    return path.resolve(projectRoot, targetPath);
  }

  return path.resolve(process.cwd(), targetPath);
}

function isWithinProject(targetPath: string, projectRoot: string): boolean {
  const normalisedRoot = path.resolve(projectRoot);
  const normalisedTarget = path.resolve(targetPath);
  const relative = path.relative(normalisedRoot, normalisedTarget);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function validateTexturePath(
  texturePath: unknown,
  options: TextureValidationOptions = {}
): TextureValidationResult {
  const errors: TextureValidationError[] = [];

  if (!ensureString(texturePath)) {
    errors.push({ code: 'not-string', message: 'Texture path must be a string.' });
    return { valid: false, errors };
  }

  const trimmed = texturePath.trim();
  if (trimmed.length === 0) {
    errors.push({ code: 'empty', message: 'Texture path cannot be empty.' });
    return { valid: false, errors };
  }

  const segments = listSegments(trimmed);
  if (segments.length === 0) {
    errors.push({ code: 'missing-filename', message: 'Texture path must include a file name.' });
    return { valid: false, errors };
  }

  if (hasTraversal(segments)) {
    errors.push({ code: 'traversal', message: 'Texture path cannot contain navigation segments.' });
  }

  const normalised = path.normalize(trimmed);
  const baseName = path.basename(normalised);

  if (!baseName || baseName === '.' || baseName === '..') {
    errors.push({ code: 'missing-filename', message: 'Texture path must include a file name.' });
  }

  const extension = path.extname(baseName).toLowerCase();
  if (extension !== PNG_EXTENSION) {
    errors.push({ code: 'invalid-extension', message: 'Textures must be stored as PNG images.' });
  }

  const absolute = path.isAbsolute(normalised);
  if (absolute && !options.allowAbsolute) {
    errors.push({ code: 'absolute-path', message: 'Absolute texture paths are not allowed.' });
  }

  let resolvedPath: string | undefined;

  if (!absolute || options.allowAbsolute) {
    resolvedPath = absolute ? path.resolve(normalised) : resolveAgainstProject(normalised, options.projectRoot);

    if (options.projectRoot && resolvedPath) {
      if (!isWithinProject(resolvedPath, options.projectRoot)) {
        errors.push({ code: 'outside-project', message: 'Texture path must remain within the project root.' });
      }
    }

    if (options.requireExists && resolvedPath) {
      const existsFn = options.existsSync ?? fs.existsSync;
      if (!existsFn(resolvedPath)) {
        errors.push({ code: 'missing-file', message: 'Referenced texture file does not exist.' });
      }
    }
  }

  const valid = errors.length === 0;
  return {
    valid,
    normalisedPath: valid ? toPosixPath(normalised) : undefined,
    errors,
  };
}

export function checkTexturePath(texturePath: string): boolean {
  return validateTexturePath(texturePath).valid;
}
