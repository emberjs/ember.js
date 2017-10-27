export function hashToArgs(hash: any[]) {
  if (hash === null) { return null; }
  let names = hash[0].map((key) => `@${key}`);
  return [names, hash[1]];
}
