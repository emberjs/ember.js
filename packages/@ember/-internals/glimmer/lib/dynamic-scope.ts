import type { DynamicScope as GlimmerDynamicScope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { UNDEFINED_REFERENCE } from '@glimmer/reference/lib/reference';
import type { OutletArgProvider } from '../../routing/route-managers/root-outlet';
import type { View } from './renderer';

/**
 * A variable of the dynamic scope.
 *
 * - a string: a name from `-with-dynamic-vars`
 * - an object: a key that only Ember code has, for example a context of `createContext`
 *
 * Templates can only write strings, so the two kinds never collide.
 */
export type DynamicVar = string | object;

export class DynamicScope implements GlimmerDynamicScope {
  /**
   * The variables of this scope.
   *
   * A child shares the map of its parent until one of them sets a variable.
   * Most scopes never set one, so `child()` does not copy.
   */
  #vars: Map<DynamicVar, Reference>;
  #shared = false;

  constructor(
    public view: View | null,
    vars: Map<DynamicVar, Reference> = new Map()
  ) {
    this.#vars = vars;
  }

  child(): DynamicScope {
    let child = new DynamicScope(this.view, this.#vars);
    child.#shared = this.#shared = true;
    return child;
  }

  has(key: DynamicVar): boolean {
    return this.#vars.has(key);
  }

  get(key: 'outletState'): Reference<OutletArgProvider | null | undefined>;
  get(key: DynamicVar): Reference;
  get(key: DynamicVar): Reference {
    return this.#vars.get(key) ?? UNDEFINED_REFERENCE;
  }

  set(key: DynamicVar, value: Reference): Reference {
    if (this.#shared) {
      this.#vars = new Map(this.#vars);
      this.#shared = false;
    }

    this.#vars.set(key, value);
    return value;
  }
}
