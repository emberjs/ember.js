// gxt NATIVE layer — custom component manager lifecycle hooks (capabilities
// 3.13 `updateHook` / `asyncLifecycleCallbacks`), Glimmer parity:
//
//   updateComponent(component, args)   Glimmer's UpdateComponentOpcode runs on
//                                      every render pass for every live
//                                      component with `updateHook` (whether or
//                                      not its arguments changed), before the
//                                      pass re-renders — here at the start of
//                                      each native render pass, inside its
//                                      render transaction, with the SAME
//                                      arguments object createComponent got.
//   didCreateComponent(component)      `asyncLifecycleCallbacks`: after the
//   didUpdateComponent(component)      render that created / updated it, in the
//                                      environment commit (before modifiers).
//
// Registered by the native component manager (managers.ts); flushed by
// renderer.ts (root render) and host-hooks.ts (render pass).
import { isRendering } from '@lifeart/gxt';

export interface LifecycleDelegate {
  capabilities: { asyncLifeCycleCallbacks?: boolean; updateHook?: boolean };
  updateComponent?(component: object, args: object): void;
  didCreateComponent?(component: object): void;
  didUpdateComponent?(component: object): void;
}

interface Entry {
  readonly delegate: LifecycleDelegate;
  readonly component: object;
  readonly args: object;
}

const LIVE = new Set<Entry>();
let committed: Array<() => void> = [];

/**
 * Track a component created through a custom manager. Returns the entry's
 * teardown (call when the component is destroyed), or null when the manager
 * has neither hook capability.
 */
export function trackComponent(
  delegate: LifecycleDelegate,
  component: object,
  args: object
): (() => void) | null {
  const { updateHook, asyncLifeCycleCallbacks } = delegate.capabilities;
  if (asyncLifeCycleCallbacks && typeof delegate.didCreateComponent === 'function') {
    committed.push(() => delegate.didCreateComponent!(component));
  }
  if (!updateHook) return null;
  const entry: Entry = { delegate, component, args };
  LIVE.add(entry);
  return () => LIVE.delete(entry);
}

/** Start of a render pass: `updateComponent` for every live component that opted in. */
export function updateComponents(): void {
  if (LIVE.size === 0) return;
  for (const entry of Array.from(LIVE)) {
    if (!LIVE.has(entry)) continue;
    const { delegate, component, args } = entry;
    delegate.updateComponent?.(component, args);
    if (
      delegate.capabilities.asyncLifeCycleCallbacks &&
      typeof delegate.didUpdateComponent === 'function'
    ) {
      committed.push(() => delegate.didUpdateComponent!(component));
    }
  }
}

/** The environment commit: queued didCreate / didUpdate callbacks, in order. */
export function commitComponents(): void {
  if (isRendering()) return;
  while (committed.length > 0) {
    const queue = committed;
    committed = [];
    for (const callback of queue) callback();
  }
}
