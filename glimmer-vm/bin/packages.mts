import { execSync } from 'node:child_process';

export interface Package {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly private: boolean;
}

export function packages(namespace: string): Package[] {
  return JSON.parse(
    execSync(`pnpm ls -r --depth -1 --filter "${namespace}/*" --json`, {
      encoding: 'utf-8',
    })
  ) as Package[];
}
