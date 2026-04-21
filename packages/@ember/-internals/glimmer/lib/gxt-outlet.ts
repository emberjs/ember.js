/**
 * GXT Outlet System
 *
 * Replaces the glimmer-vm DynamicScope / createComputeRef / revision-tag
 * approach for routing/outlet rendering with GXT's reactive cell + context API.
 *
 * The outlet tree is stored in a GXT Cell.  When the router calls
 * setOutletState(), the cell is updated and GXT's scheduler re-renders
 * the outlet component tree automatically.
 *
 * Reactivity note: GXT only tracks cell accesses that happen inside GXT's
 * opcode system (inside $_if, $_each, $_tag getters, etc.).  We use $_if with
 * the cell as the condition so that GXT sets up the dependency for us.
 */

import {
  cell,
  formula,
  type Cell,
  type MergedCell,
  Component as GXTComponent,
  $_fin,
  $_c,
  $_if,
  provideContext,
  getContext,
  registerDestructor,
  type ComponentReturnType,
} from '@lifeart/gxt';
import type { OutletState } from './utils/outlet';

// ─── Public context symbol ────────────────────────────────────────────────────

/** Context key: carries the current level's outlet-state formula/cell. */
export const GXT_OUTLET_CTX = Symbol('gxt-outlet-ctx');

// ─── Root cell ────────────────────────────────────────────────────────────────

/**
 * The root outlet-state cell.
 * OutletView.setOutletState() writes here; GXTRootOutlet reads from it.
 */
export const rootOutletCell: Cell<OutletState | undefined> = cell(
  undefined,
  'root-outlet-state'
);

// ─── Template function lookup ─────────────────────────────────────────────────

export function gxtFnFor(template: unknown): Function | null {
  if (!template) return null;
  const t = template as any;

  // TemplateImpl has __gxtFn attached in templateFactory's makeTemplate.
  if (typeof t.__gxtFn === 'function') return t.__gxtFn();

  // Template factory itself.
  if (t.__gxt && typeof t.__gxtFn === 'function') return t.__gxtFn();

  // Factory stored on the template object.
  const factory = t.__gxtFactory;
  if (factory?.__gxtFn) return factory.__gxtFn();

  return null;
}

// ─── Route bridge ─────────────────────────────────────────────────────────────

/**
 * Creates a GXT Component class that:
 *   1. Renders the route's GXT template function.
 *   2. Provides the next level of outlet state to children via context.
 *   3. Delegates `this.xxx` property access to the controller.
 */
function createRouteBridge(
  routeTemplateFn: Function,
  controller: unknown,
  childOutletStateCell: Cell<OutletState | undefined> | MergedCell
): any {
  class GXTRouteBridge extends GXTComponent<any> {
    constructor(args: Record<string, unknown>, fw?: unknown) {
      super(args, fw);
      // Provide child outlet state so nested {{outlet}} can find it.
      provideContext(this, GXT_OUTLET_CTX, childOutletStateCell);
    }

    // @ts-expect-error -- GXT Component.template type mismatch
  template = function (this: GXTRouteBridge): ComponentReturnType {
      let result: unknown;
      try {
        result = routeTemplateFn.call(this);
      } catch {
        result = [];
      }
      const roots = Array.isArray(result) ? result : result != null ? [result] : [];
      return ($_fin as any)(roots, this);
    };
  }

  // Forward controller properties so `this.prop` in templates resolves correctly.
  if (controller !== null && controller !== undefined) {
    const proto = Object.getPrototypeOf(controller as object) ?? Object.prototype;
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor') continue;
      if (Object.getOwnPropertyDescriptor(GXTRouteBridge.prototype, name)) continue;
      const desc = Object.getOwnPropertyDescriptor(proto, name);
      if (!desc) continue;
      if (desc.get || desc.set) {
        Object.defineProperty(GXTRouteBridge.prototype, name, {
          get() { return (controller as any)[name]; },
          set(v: unknown) { (controller as any)[name] = v; },
          configurable: true,
          enumerable: false,
        });
      } else if (typeof desc.value === 'function') {
        Object.defineProperty(GXTRouteBridge.prototype, name, {
          value: (...a: unknown[]) => (desc.value as Function).apply(controller, a),
          configurable: true,
          enumerable: false,
        });
      }
    }
  }

  return GXTRouteBridge;
}

// ─── Shared rendering helper ──────────────────────────────────────────────────

/**
 * Render an outlet state into GXT component nodes.
 * Called from both GXTRootOutlet and GXTOutlet template functions.
 */
function renderOutletState(
  state: OutletState | undefined,
  childCtxCell: Cell<OutletState | undefined> | MergedCell,
  parent: GXTComponent
): ComponentReturnType[] {
  if (!state?.render) return [];

  const { template, controller } = state.render;
  const fn = gxtFnFor(template);
  if (!fn) return [];

  const RouteBridge = createRouteBridge(fn, controller, childCtxCell);
  // $_c signature: (comp, args, ctx) — 3 args, fw is extracted internally
  return [($_c as any)(RouteBridge, { model: state.render.model }, parent)];
}

// ─── GXT Root Outlet ─────────────────────────────────────────────────────────

/**
 * The root of the outlet tree.
 *
 * Reads from rootOutletCell using $_if so GXT tracks the dependency.
 * When rootOutletCell updates (route transitions), GXT re-renders this
 * component automatically.
 */
export class GXTRootOutlet extends GXTComponent<any> {
  private _appFormula: MergedCell;
  private _childFormula: MergedCell;

  constructor(args: Record<string, unknown>, fw?: unknown) {
    super(args, fw);

    // The root outlet state has TWO levels:
    //   rootOutletCell.value → the root level (uses internal {{component this}} template)
    //   rootOutletCell.value.outlets.main → the APPLICATION route level
    //
    // We skip the root level (it's a glimmer-vm internal) and directly render
    // the application route. This is the entry point that renders application.hbs.

    // Formula for the APPLICATION route state.
    this._appFormula = formula(
      () => rootOutletCell.value?.outlets?.main,
      'root-outlet-app-state'
    );

    // Formula for the child outlet state of the application route.
    this._childFormula = formula(
      () => rootOutletCell.value?.outlets?.main?.outlets?.main,
      'root-outlet-child-state'
    );

    // Provide child outlet state context so nested {{outlet}} in app template can find it.
    provideContext(this, GXT_OUTLET_CTX, this._childFormula as unknown as Cell<OutletState | undefined>);
  }

  // @ts-expect-error -- GXT Component.template type is Component<any> but we use a function
    template = function (this: GXTRootOutlet): ComponentReturnType {
    const self = this;

    // Pass `self` as the ctx (4th arg) so $_if can call initDOM(ctx)
    // to get the DOM API and create outlet/placeholder nodes.
    return ($_fin as any)([
      ($_if as any)(
        self._appFormula,
        () => {
          const appState = self._appFormula.value;
          return renderOutletState(appState, self._childFormula as unknown as Cell<OutletState | undefined>, self as any);
        },
        () => [],
        self,  // ctx — required by GXT's ifCond
      ),
    ], self);
  };
}

// ─── GXT Outlet component ─────────────────────────────────────────────────────

/**
 * GXT component that renders the current level's outlet state.
 *
 * Used for `{{outlet}}` in route templates.  Reads its state from the GXT
 * context provided by the parent outlet/bridge, making it fully reactive.
 */
export class GXTOutlet extends GXTComponent<any> {
  // @ts-expect-error -- GXT Component.template type is Component<any> but we use a function
    template = function (this: GXTOutlet): ComponentReturnType {
    const self = this;

    const stateCell = getContext<Cell<OutletState | undefined>>(this, GXT_OUTLET_CTX);
    if (!stateCell) return ($_fin as any)([], this);

    const childFormula = formula(
      () => (stateCell as any).value?.outlets?.main,
      'outlet-child-state'
    );

    return ($_fin as any)([
      ($_if as any)(
        stateCell,
        () => {
          const state = (stateCell as any).value;
          return renderOutletState(state, childFormula as unknown as Cell<OutletState | undefined>, self as any);
        },
        () => [],
        self,  // ctx — required by GXT's ifCond
      ),
    ], self);
  };
}

// ─── Helper for -outlet ───────────────────────────────────────────────────────

/** The `-outlet` helper function — returns GXTOutlet class for component rendering. */
export function outletHelper(): typeof GXTOutlet {
  return GXTOutlet;
}

/** Store the factory reference on a template for gxtFnFor() to find. */
export function linkTemplateFactory(
  template: object,
  factory: { __gxt?: boolean; __gxtFn?: () => Function }
): void {
  (template as any).__gxtFactory = factory;
}
