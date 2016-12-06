export default function hashPairForKey(hash, key) {
  for (let i = 0; i < hash.pairs.length; i++) {
    let pair = hash.pairs[i];
    if (pair.key === key) {
      return pair;
    }
  }

  return false;
}
