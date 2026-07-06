import type { Environment, Nullable, RenderScopeNode } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { UNDEFINED_REFERENCE } from '@glimmer/reference/lib/reference';
import { provideRenderScopeValue, readRenderScopeValue } from '@glimmer/runtime/lib/render-scope';
import type { OutletState } from './outlet';

// Ember's two ambient render-scope values. `OUTLET_STATE` is how each
// `{{outlet}}` hands the current route's outlet state to descendant outlets;
// `VIEW` is the classic component `parentView` chain.
const OUTLET_STATE = Symbol('OUTLET_STATE');
const VIEW = Symbol('VIEW');

export function provideOutletState(
  env: Environment,
  state: Reference<OutletState | undefined>
): void {
  provideRenderScopeValue(env.renderScope, OUTLET_STATE, state);
}

export function readOutletState(
  scope: Nullable<RenderScopeNode>
): Reference<OutletState | undefined> {
  return (
    (readRenderScopeValue(scope, OUTLET_STATE) as
      | Reference<OutletState | undefined>
      | undefined) ?? UNDEFINED_REFERENCE
  );
}

export function provideView(env: Environment, view: object): void {
  provideRenderScopeValue(env.renderScope, VIEW, view);
}

export function readParentView(scope: Nullable<RenderScopeNode>): object | undefined {
  return readRenderScopeValue(scope, VIEW) as object | undefined;
}
