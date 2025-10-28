import fs from 'fs';
import path from 'path';

export type LoaderOption = 'neoforge' | 'fabric' | 'both';

export interface ProjectsJson {
  versions: string[];
  loader: LoaderOption;
}

export function writeProjectsJson(
  root: string,
  versions: string[],
  loader: LoaderOption,
): void {
  const obj: ProjectsJson = { versions, loader };
  const stonecutterDir = path.join(root, 'stonecutter');

  fs.mkdirSync(stonecutterDir, { recursive: true });
  fs.writeFileSync(
    path.join(stonecutterDir, 'projects.json'),
    JSON.stringify(obj, null, 2),
  );
}
