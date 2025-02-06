import type { Core, PresentArray } from '@glimmer/ember/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';

export function hashToArgs(hash: Nullable<Core.Hash>): Nullable<Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map((key) => `@${key}`);
  return [names as PresentArray<string>, hash[1]];
}
