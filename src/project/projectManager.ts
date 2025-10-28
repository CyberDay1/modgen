import * as fs from 'fs';
import * as path from 'path';

export function saveProject(name: string, data: any) {
  const dir = path.join(process.cwd(), 'projects', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(data, null, 2));
}
