/**
 * GXT rendering integration for ember.
 *
 * When a template has been compiled with GXT's runtime compiler (detected by
 * the `__gxt` flag on the template factory), this module handles rendering
 * using GXT's DOM engine instead of the glimmer-vm bytecode VM.
 */

import type { SimpleElement, SimpleNode } from '@simple-dom/interface';
import type { Environment, RenderResult as GlimmerRenderResult } from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';
import { getComponentTemplate } from '@glimmer/manager';
import {
  Component as GXTComponent,
  renderComponent as gxtRenderComponent,
  destroyElementSync as gxtDestroyElementSync,
  RENDERED_NODES_PROPERTY,
  $_fin,
} from '@lifeart/gxt';
// @ts-expect-error -- @lifeart/gxt/runtime-compiler types not in npm v0.0.59
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { setupGlobalScope as gxtSetupGlobalScope } from '@lifeart/gxt/runtime-compiler';

let globalScopeReady = false;
function ensureGXTReady() {
  if (!globalScopeReady) {
    gxtSetupGlobalScope();
    globalScopeReady = true;
  }
}

export function isGXTDefinition(definition: object): boolean {
  const factory = getComponentTemplate(definition);
  return !!(factory && (factory as any).__gxt);
}

export function getGXTFn(definition: object): Function | null {
  const factory = getComponentTemplate(definition);
  if (factory && (factory as any).__gxt) {
    return ((factory as any).__gxtFn as () => Function)();
  }
  return null;
}

/**
 * GXT-backed RenderResult compatible with glimmer's RenderResult interface.
 */
export class GXTRenderResult implements GlimmerRenderResult {
  readonly env: Environment;
  readonly drop: object;

  constructor(
    private readonly gxtInstance: object,
    private readonly parentEl: HTMLElement,
    env: Environment
  ) {
    this.env = env;
    this.drop = this;
    registerDestructor(this, () => {
      gxtDestroyElementSync(gxtInstance as any);
    });
  }

  /** GXT handles reactivity automatically — no manual rerender needed. */
  rerender(_opts?: { alwaysRevalidate: false }): void {}

  parentElement(): SimpleElement {
    return this.parentEl as unknown as SimpleElement;
  }

  firstNode(): SimpleNode {
    return (this.parentEl.firstChild ?? this.parentEl) as unknown as SimpleNode;
  }

  lastNode(): SimpleNode {
    return (this.parentEl.lastChild ?? this.parentEl) as unknown as SimpleNode;
  }

  handleException(): void {
    throw new Error('GXTRenderResult.handleException: unreachable');
  }
}

/**
 * Create a GXT Component bridge class for the given GXT template function.
 *
 * The GXT runtime compiler outputs template functions that return an array of
 * roots (e.g. `["Hello"]` or `[$_tag('div', ...)]`). GXT's `$template` protocol
 * for class-based components, however, expects `$_fin(roots, this)` to be
 * called inside the template, which sets RENDERED_NODES_PROPERTY and returns
 * the component instance.
 *
 * This bridge wraps the raw runtime-compiled function with the `$_fin` call so
 * GXT's rendering pipeline works correctly.
 */
function createGXTBridgeClass(
  rawGxtFn: Function,
  emberKlass: any,
  owner: object
): typeof GXTComponent {
  class GXTEmberBridge extends GXTComponent<any> {
    // Backing ember component instance (for class-based components)
    _emberInstance: any = null;

    constructor(args: Record<string, unknown>, fw?: unknown) {
      super(args, fw);

      // For class-based ember components, create the backing instance.
      if (
        emberKlass !== null &&
        typeof emberKlass === 'function' &&
        emberKlass.prototype &&
        emberKlass.name !== 'TemplateOnlyComponent'
      ) {
        try {
          this._emberInstance = new emberKlass(owner, args);
        } catch {
          this._emberInstance = null;
        }
      }
    }

    /**
     * GXT calls `instance.template(args)` to get the rendered content.
     * The runtime-compiled function returns an array of roots.
     * We wrap it with $_fin so GXT's rendering pipeline works correctly:
     *   $_fin(roots, this) → sets this[RENDERED_NODES_PROPERTY] = roots → returns this
     *
     * For properties like `this.someGetter` in the template to work for
     * class-based components, we delegate those through the ember instance.
     */
    // @ts-expect-error -- GXT Component.template type mismatch
    template = function (this: GXTEmberBridge, args: unknown): GXTEmberBridge {
      // Bind to the ember instance if available, otherwise use this bridge.
      const ctx = this._emberInstance ?? this;

      // The runtime-compiled function uses `this` for context.
      // We call it bound to our bridge so that `this.args` works correctly
      // (GXTComponent sets `this.args = constructorArgs`).
      let roots: unknown;
      try {
        roots = rawGxtFn.call(this, args);
      } catch {
        roots = [];
      }

      const rootsArray: unknown[] = Array.isArray(roots) ? roots : roots != null ? [roots] : [];

      // $_fin(roots, this) stores roots on this[RENDERED_NODES_PROPERTY] and returns this.
      return ($_fin as any)(rootsArray, this);
    };
  }

  return GXTEmberBridge as any;
}

/**
 * Render a GXT-compiled template into the given element using GXT's engine.
 */
export function renderWithGXT(
  definition: object,
  gxtFn: Function,
  element: HTMLElement,
  args: Record<string, unknown>,
  owner: object,
  env: Environment
): GXTRenderResult {
  ensureGXTReady();

  const GXTBridge = createGXTBridgeClass(gxtFn, definition, owner);

  const gxtInstance = (gxtRenderComponent as any)(GXTBridge, {
    element,
    args,
  }) as object;

  return new GXTRenderResult(gxtInstance, element, env);
}
