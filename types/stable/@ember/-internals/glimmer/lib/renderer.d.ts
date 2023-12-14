declare module '@ember/-internals/glimmer/lib/renderer' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type {
    Bounds,
    CompileTimeCompilationContext,
    Cursor,
    DebugRenderTree,
    DynamicScope as GlimmerDynamicScope,
    ElementBuilder,
    Environment,
    RenderResult,
    RuntimeContext,
    Template,
    TemplateFactory,
  } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  import type { Reference } from '@glimmer/reference';
  import type { CurriedValue } from '@glimmer/runtime';
  import { clientBuilder } from '@glimmer/runtime';
  import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
  import RSVP from 'rsvp';
  import type Component from '@ember/-internals/glimmer/lib/component';
  import { BOUNDS } from '@ember/-internals/glimmer/lib/component-managers/curly';
  import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';
  import type { OutletState } from '@ember/-internals/glimmer/lib/utils/outlet';
  import OutletView from '@ember/-internals/glimmer/lib/views/outlet';
  export type IBuilder = (env: Environment, cursor: Cursor) => ElementBuilder;
  export interface View {
    parentView: Nullable<View>;
    renderer: Renderer;
    tagName: string | null;
    elementId: string | null;
    isDestroying: boolean;
    isDestroyed: boolean;
    [BOUNDS]: Bounds | null;
  }
  export class DynamicScope implements GlimmerDynamicScope {
    view: View | null;
    outletState: Reference<OutletState | undefined>;
    constructor(view: View | null, outletState: Reference<OutletState | undefined>);
    child(): DynamicScope;
    get(key: 'outletState'): Reference<OutletState | undefined>;
    set(
      key: 'outletState',
      value: Reference<OutletState | undefined>
    ): Reference<OutletState | undefined>;
  }
  class RootState {
    root: Component | OutletView;
    runtime: RuntimeContext;
    id: string;
    result: RenderResult | undefined;
    destroyed: boolean;
    render: () => void;
    constructor(
      root: Component | OutletView,
      runtime: RuntimeContext,
      context: CompileTimeCompilationContext,
      owner: InternalOwner,
      template: Template,
      self: Reference<unknown>,
      parentElement: SimpleElement,
      dynamicScope: DynamicScope,
      builder: IBuilder
    );
    isFor(possibleRoot: unknown): boolean;
    destroy(): void;
  }
  export function _resetRenderers(): void;
  export function renderSettled(): RSVP.Promise<void>;
  interface ViewRegistry {
    [viewId: string]: unknown;
  }
  export class Renderer {
    private _rootTemplate;
    private _viewRegistry;
    private _roots;
    private _removedRoots;
    private _builder;
    private _inRenderTransaction;
    private _owner;
    private _context;
    private _runtime;
    private _lastRevision;
    private _destroyed;
    /** @internal */
    _isInteractive: boolean;
    readonly _runtimeResolver: ResolverImpl;
    static create(props: { _viewRegistry: any }): Renderer;
    constructor(
      owner: InternalOwner,
      document: SimpleDocument,
      env: {
        isInteractive: boolean;
        hasDOM: boolean;
      },
      rootTemplate: TemplateFactory,
      viewRegistry: ViewRegistry,
      builder?: typeof clientBuilder
    );
    get debugRenderTree(): DebugRenderTree;
    appendOutletView(view: OutletView, target: SimpleElement): void;
    appendTo(view: Component, target: SimpleElement): void;
    _appendDefinition(
      root: OutletView | Component,
      definition: CurriedValue,
      target: SimpleElement
    ): void;
    rerender(): void;
    register(view: any): void;
    unregister(view: any): void;
    remove(view: Component): void;
    cleanupRootFor(view: unknown): void;
    destroy(): void;
    getElement(view: View): Nullable<Element>;
    getBounds(view: View): {
      parentElement: SimpleElement;
      firstNode: SimpleNode;
      lastNode: SimpleNode;
    };
    createElement(tagName: string): SimpleElement;
    _renderRoot(root: RootState): void;
    _renderRoots(): void;
    _renderRootsTransaction(): void;
    _clearAllRoots(): void;
    _scheduleRevalidate(): void;
    _isValid(): boolean;
    _revalidate(): void;
  }
  export {};
}
