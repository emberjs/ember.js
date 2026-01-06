import { DEBUG } from '@glimmer/env';
import type {
  ClassicResolver,
  ComponentDefinition,
  Nullable,
  Owner,
  ResolutionTimeConstants,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util';

export function resolveComponent(
  resolver: Nullable<ClassicResolver>,
  constants: ResolutionTimeConstants,
  name: string,
  owner: Owner | null
): Nullable<ComponentDefinition> {
  let definition =
    resolver?.lookupComponent?.(
      name,
      expect(owner, 'BUG: expected owner when looking up component')
    ) ?? null;

  if (DEBUG && !definition) {
    throw new Error(
      `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
  return constants.resolvedComponent(definition!, name);
}
