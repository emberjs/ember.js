import * as WireFormat from '@glimmer/wire-format';

export function hashToArgs(hash: WireFormat.Core.Hash): WireFormat.Core.Hash {
  if (hash === null) { return null; }
  let names = hash[0].map((key: string) => `@${key}`);
  return [names, hash[1]];
}
