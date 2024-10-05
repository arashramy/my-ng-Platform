
import { resolve } from 'path';

export function getEnvPath(dest: string): string {
  return resolve(`${dest}/${(process.env.NODE_ENV as string) || ''}.env`);
}
