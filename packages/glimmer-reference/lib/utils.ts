import { VersionedPathReference } from './validators';
import { Opaque } from 'glimmer-util';

export function referenceFromParts(root: VersionedPathReference<Opaque>, parts: string[]): VersionedPathReference<Opaque> {
  let reference = root;

  for (let i=0; i<parts.length; i++) {
    reference = reference.get(parts[i]);
  }

  return reference;
}
