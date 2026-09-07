import { DEBUG } from '@glimmer/env';
import { resolvedComponentDefinition } from '@glimmer/program/lib/definitions';
import type {
  ClassicResolver,
  ComponentDefinition,
  Nullable,
  Owner,
  ProgramConstants,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';

export function resolveComponent(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
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
  return resolvedComponentDefinition(constants, definition!, name);
}
