const conflictMarkers = ['<<<<<<<', '=======', '>>>>>>>'];

function stripTripleQuotedStrings(source: string): string {
  return source
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/'''[\s\S]*?'''/g, "''");
}

function hasBalancedDelimiters(source: string): boolean {
  const sanitized = stripTripleQuotedStrings(source);
  const stack: string[] = [];
  const opening = new Set(['{', '(', '[']);
  const closing: Record<string, string> = {
    '}': '{',
    ')': '(',
    ']': '[',
  };

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];
    const next = sanitized[i + 1];
    const prev = i > 0 ? sanitized[i - 1] : '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '/' && next === '/') {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (!inDoubleQuote && char === '\'' && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && char === '"' && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      continue;
    }

    if (opening.has(char)) {
      stack.push(char);
      continue;
    }

    if (closing[char]) {
      const expected = closing[char];
      const actual = stack.pop();
      if (actual !== expected) {
        return false;
      }
    }
  }

  return stack.length === 0 && !inSingleQuote && !inDoubleQuote && !inBlockComment && !inLineComment;
}

function containsStructure(source: string): boolean {
  const structuralPatterns = [
    /\bplugins?\s*\{/i,
    /\bdependencies\s*\{/i,
    /\bbuildscript\s*\{/i,
    /\bandroid\s*\{/i,
    /\brepositories\s*\{/i,
    /\ballprojects\s*\{/i,
    /\bsubprojects\s*\{/i,
    /\btasks?\s*\{/i,
    /\bpluginManagement\s*\{/i,
    /\bversionCatalogs\s*\{/i,
    /\bapply\s+plugin\s*:\s*['"]/i,
    /\bid\s*\(/i,
    /\brootProject\.name\s*[=:]/i,
    /\binclude\s*\(/i,
  ];

  return structuralPatterns.some((pattern) => pattern.test(source));
}

export function gradleFileLooksOk(source: string): boolean {
  if (!source || !source.trim()) {
    return false;
  }

  const normalized = source.toLowerCase();

  if (conflictMarkers.some((marker) => normalized.includes(marker.toLowerCase()))) {
    return false;
  }

  const nonCommentLines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'));

  if (nonCommentLines.length === 0) {
    return false;
  }

  const keywordHints = [
    'plugins',
    'dependencies',
    'android',
    'kotlin',
    'buildscript',
    'repositories',
    'application',
    'java',
    'rootproject',
    'include',
    'versioncatalogs',
    'pluginmanagement',
  ];

  if (!keywordHints.some((hint) => normalized.includes(hint))) {
    return false;
  }

  if (!hasBalancedDelimiters(source)) {
    return false;
  }

  if (!containsStructure(source)) {
    return false;
  }

  return true;
}
