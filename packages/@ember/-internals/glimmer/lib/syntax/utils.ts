import { Core, Option, PresentArray } from '@glimmer/interfaces';

export function hashToArgs(hash: Option<Core.Hash>): Option<Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map((key) => `@${key}`);
  return [names as PresentArray<string>, hash[1]];
}
