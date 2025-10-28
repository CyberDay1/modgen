import fs from 'fs';
import path from 'path';

export const GENERATED_ROOT = 'generated_assets';
export const PROJECT_ROOT = 'project';
export const PROJECT_ASSETS_ROOT = path.join(PROJECT_ROOT, 'assets');

const WORKSPACE_ROOT = process.cwd();
const GENERATED_DIRECTORY = path.join(WORKSPACE_ROOT, GENERATED_ROOT);
const PROJECT_ASSETS_DIRECTORY = path.join(WORKSPACE_ROOT, PROJECT_ASSETS_ROOT);

function sanitizeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^\\+/, '').replace(/^\/+/, '');

  if (normalized.startsWith('..')) {
    throw new Error(`Asset path traversal is not allowed: ${relativePath}`);
  }

  return normalized;
}

function ensureParentDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getGeneratedAssetPath(relativePath: string): string {
  const safePath = sanitizeRelativePath(relativePath);
  return path.join(GENERATED_DIRECTORY, safePath);
}

export function getProjectAssetPath(relativePath: string): string {
  const safePath = sanitizeRelativePath(relativePath);
  return path.join(PROJECT_ASSETS_DIRECTORY, safePath);
}

export function getAssetWriteTargets(relativePath: string): string[] {
  return [getGeneratedAssetPath(relativePath), getProjectAssetPath(relativePath)];
}

export function writeAssetFile(relativePath: string, contents: string | Buffer): string[] {
  const targets = getAssetWriteTargets(relativePath);

  for (const target of targets) {
    ensureParentDirectory(target);
    fs.writeFileSync(target, contents);
  }

  return targets;
}
