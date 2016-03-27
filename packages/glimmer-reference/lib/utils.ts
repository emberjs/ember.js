import { PathReference } from './reference';
import { InternedString, Opaque } from 'glimmer-util';

export function referenceFromParts<T extends PathReference<Opaque>>(path: T, parts: InternedString[]): T {
  return parts.reduce((ref, part) => ref.get(part) as T, path);
}
