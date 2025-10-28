import fs from 'fs';
import path from 'path';

export interface SavePngResult {
  assetPath: string;
  generatedPath: string;
}

const PROJECT_ROOT_ENV_KEYS = ['MODGEN_ACTIVE_PROJECT_ROOT', 'MODGEN_PROJECT_ROOT', 'MODGEN_PROJECT_DIR'];

function resolveProjectRoot(): string {
  for (const key of PROJECT_ROOT_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return path.resolve(value.trim());
    }
  }

  return path.join(process.cwd(), 'projects', 'active');
}

function ensureWithinProject(targetPath: string, projectRoot: string): void {
  const normalisedRoot = path.resolve(projectRoot);
  const normalisedTarget = path.resolve(targetPath);
  const relative = path.relative(normalisedRoot, normalisedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Destination path "${targetPath}" is outside of the project root "${normalisedRoot}".`);
  }
}

function ensurePngExtension(filename: string): string {
  if (filename.toLowerCase().endsWith('.png')) {
    return filename;
  }

  return `${filename}.png`;
}

function sanitiseRelativePath(dest: string): string {
  const withoutLeadingSlashes = dest.replace(/^[\\/]+/, '');
  const segments = withoutLeadingSlashes
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

  if (segments.length === 0) {
    throw new Error('Destination must include a valid file name.');
  }

  return segments.join(path.sep);
}

function resolveAssetPath(dest: string, projectRoot: string): string {
  if (path.isAbsolute(dest)) {
    const absolute = ensurePngExtension(path.normalize(dest));
    ensureWithinProject(absolute, projectRoot);
    return absolute;
  }

  const sanitised = ensurePngExtension(sanitiseRelativePath(dest));
  const hasAssetsDir =
    sanitised.startsWith(`assets${path.sep}`) || sanitised.includes(`${path.sep}assets${path.sep}`);
  const baseDir = hasAssetsDir ? projectRoot : path.join(projectRoot, 'assets');
  const fullPath = path.join(baseDir, sanitised);

  ensureWithinProject(fullPath, projectRoot);
  return fullPath;
}

function resolveGeneratedPath(assetPath: string, projectRoot: string): string {
  const normalised = path.normalize(assetPath);
  const match = normalised.match(/^(.*[\\/])assets[\\/](.*)$/);

  if (match) {
    return path.join(match[1], 'generated_assets', match[2]);
  }

  const relative = path.relative(projectRoot, normalised);
  const safeRelative =
    relative.length === 0 || relative.startsWith('..') || path.isAbsolute(relative)
      ? path.basename(normalised)
      : relative;

  return path.join(projectRoot, 'generated_assets', safeRelative);
}

function ensureDirectoryForFile(targetPath: string): void {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
}

export function savePng(buf: Buffer, dest: string): SavePngResult {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error('PNG buffer is empty or invalid.');
  }

  if (typeof dest !== 'string' || dest.trim().length === 0) {
    throw new Error('Destination path must be provided.');
  }

  const projectRoot = resolveProjectRoot();
  const assetPath = resolveAssetPath(dest, projectRoot);
  const generatedPath = resolveGeneratedPath(assetPath, projectRoot);

  ensureDirectoryForFile(assetPath);
  fs.writeFileSync(assetPath, buf);

  ensureDirectoryForFile(generatedPath);
  fs.writeFileSync(generatedPath, buf);

  return { assetPath, generatedPath };
}
