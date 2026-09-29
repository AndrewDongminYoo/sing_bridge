import { readFileSync, lstatSync } from 'node:fs';

export function apiKey() {
  const environment = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
  if (environment) return environment;
  const file = new URL('../local.properties', import.meta.url);
  if (lstatSync(file).isSymbolicLink())
    throw new Error('Credential file must not be a symlink');
  const properties = readFileSync(file, 'utf8');
  const match = properties.match(
    /^(?:OPENAI_API_KEY|OPEN_AI_API_KEY)[ \t]*=[ \t]*(\S+)[ \t]*\r?$/m,
  );
  if (!match) throw new Error('Set OPENAI_API_KEY on the server');
  return match[1];
}
