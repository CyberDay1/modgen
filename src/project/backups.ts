import fs from 'fs';
import path from 'path';

function readLastSuccessMarker(dir: string): string | undefined {
  const markerPath = path.join(dir, 'last-success');
  if (!fs.existsSync(markerPath)) {
    return undefined;
  }

  try {
    const contents = fs.readFileSync(markerPath, 'utf8').trim();
    return contents.length > 0 ? contents : undefined;
  } catch {
    return undefined;
  }
}

function removeEntry(entryPath: string) {
  try {
    const stat = fs.lstatSync(entryPath);
    if (stat.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(entryPath);
    }
  } catch {
    // Ignore removal errors – best effort cleanup
  }
}

export function rotateBackups(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== 'last-success')
    .map((entry) => {
      const entryPath = path.join(dir, entry.name);
      const stat = fs.statSync(entryPath);
      return {
        name: entry.name,
        path: entryPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const keep = new Set<string>();
  const lastSuccess = readLastSuccessMarker(dir);

  for (let i = 0; i < Math.min(entries.length, 5); i += 1) {
    keep.add(entries[i].name);
  }

  if (lastSuccess && entries.some((entry) => entry.name === lastSuccess)) {
    keep.add(lastSuccess);
  }

  entries.forEach((entry) => {
    if (!keep.has(entry.name)) {
      removeEntry(entry.path);
    }
  });
}
