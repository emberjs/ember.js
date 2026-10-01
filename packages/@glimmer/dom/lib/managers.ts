import type { CapturedArguments, Helper, Reference } from '@glimmer/interfaces';
import { associateDestroyableChild, destroy } from '@glimmer/destroyable';
import {
  getInternalHelperManager,
  getInternalModifierManager,
} from '@glimmer/manager/lib/internal/api';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag, createCache, getValue, track } from '@glimmer/validator/lib/tracking';
import {
  UPDATE_TAG as updateTag,
  validateTag,
  valueForTag,
} from '@glimmer/validator/lib/validators';

import type { Block, Thunk } from './core';

export type Named = Record<string, Thunk>;

/**
 * Adapt thunks to the references that helper/modifier/component managers
 * expect. This is the only place the compiled-template world touches
 * references.
 */
export function capture(named: Named | null, positional: Thunk[] | null): CapturedArguments {
  let capturedNamed: Record<string, Reference> = Object.create(null) as Record<string, Reference>;
  if (named) {
    for (let key of Object.keys(named)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- iterating own keys
      capturedNamed[key] = createComputeRef(named[key]!);
    }
  }

  let capturedPositional = (positional ?? []).map((thunk) => createComputeRef(thunk));

  return {
    named: capturedNamed,
    positional: capturedPositional,
  } as unknown as CapturedArguments;
}

function resolveHelper(definition: object): Helper {
  let manager = getInternalHelperManager(definition);
  return typeof manager === 'function' ? manager : manager.getHelper(definition);
}

function instantiateHelper(b: Block, definition: object, args: CapturedArguments): Reference {
  let ref = resolveHelper(definition)(args, b.root.owner);
  associateDestroyableChild(b, ref);
  return ref;
}

/**
 * A helper invocation with a statically known definition
 * (usually an import). Returns a thunk for the helper's current value.
 */
export function helper(
  b: Block,
  definition: object,
  positional: Thunk[] | null,
  named: Named | null
): Thunk {
  let ref = instantiateHelper(b, definition, capture(named, positional));
  return () => valueForRef(ref);
}

/**
 * A helper invocation whose definition can change, like `(this.format x)`.
 */
export function helperDyn(
  b: Block,
  definition: Thunk,
  positional: Thunk[] | null,
  named: Named | null
): Thunk {
  let args = capture(named, positional);
  let definitionCache = createCache(definition);
  let current: unknown;
  let ref: Reference | null = null;

  return () => {
    let next = getValue(definitionCache);
    if (next !== current || ref === null) {
      if (ref !== null) destroy(ref);
      current = next;
      ref = instantiateHelper(b, next as object, args);
    }
    return valueForRef(ref);
  };
}

/**
 * Any modifier other than `{{on}}`, which is specialized.
 */
export function modifier(
  b: Block,
  element: Element,
  definition: object,
  positional: Thunk[] | null,
  named: Named | null
): void {
  let manager = getInternalModifierManager(definition);
  let state = manager.create(
    b.root.owner,
    element as never,
    definition,
    capture(named, positional)
  );

  let destroyable = manager.getDestroyable(state);
  if (destroyable) associateDestroyableChild(b, destroyable);

  let tag = manager.getTag(state);

  if (tag === null) {
    b.root.schedule(() => {
      manager.install(state);
    });
    return;
  }

  let lastRevision: number | null = null;

  let run = (hook: (state: unknown) => void) => {
    updateTag(
      tag,
      track(() => {
        hook(state);
      })
    );
    consumeTag(tag);
    lastRevision = valueForTag(tag);
  };

  b.root.schedule(() => {
    run((s) => {
      manager.install(s);
    });
  });

  b.updaters.push(() => {
    consumeTag(tag);
    if (lastRevision === null || validateTag(tag, lastRevision)) return;

    lastRevision = null;
    b.root.schedule(() => {
      run((s) => {
        manager.update(s);
      });
    });
  });
}
