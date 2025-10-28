export function validateJSON(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function validateJava(content: string): boolean {
  return content.includes('class ');
}
