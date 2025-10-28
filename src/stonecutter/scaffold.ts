import fs from 'fs';
import path from 'path';

export type LoaderOption = 'neoforge' | 'fabric' | 'both';

export interface ProjectsJson {
  versions: string[];
  loader: LoaderOption;
}

const SUPPORTED_VERSIONS = [
  '1.20.1',
  '1.20.2',
  '1.20.3',
  '1.20.4',
  '1.21',
  '1.21.1',
  '1.21.2',
  '1.21.3',
  '1.21.4',
  '1.21.5',
  '1.21.6',
  '1.21.7',
  '1.21.8',
  '1.21.9',
  '1.21.10',
] as const;

export function writeProjectsJson(
  root: string,
  versions: string[],
  loader: LoaderOption,
): void {
  const validVersions = versions.filter((version) => SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number]));
  const obj: ProjectsJson = { versions: validVersions, loader };
  const stonecutterDir = path.join(root, 'stonecutter');

  fs.mkdirSync(stonecutterDir, { recursive: true });
  fs.writeFileSync(
    path.join(stonecutterDir, 'projects.json'),
    JSON.stringify(obj, null, 2),
  );
}
