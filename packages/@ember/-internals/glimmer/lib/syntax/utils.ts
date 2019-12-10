import { Core, Option } from '@glimmer/interfaces';

export function hashToArgs(hash: Option<Core.Hash>): Option<Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}
