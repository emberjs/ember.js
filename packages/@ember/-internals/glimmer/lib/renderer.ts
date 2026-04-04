import { privatize as P } from '@ember/-internals/container';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
} from '@glimmer/destroyable';
import type {
  Bounds,
  Environment,
  DynamicScope as GlimmerDynamicScope,
  RenderResult as GlimmerRenderResult,
  Template,
  TemplateFactory,
  EvaluationContext,
  CurriedComponent,
  ClassicResolver,
} from '@glimmer/interfaces';

import type { Nullable } from '@ember/-internals/utility-types';
import type { Reference } from '@glimmer/reference';
import { createConstRef, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import type { CurriedValue } from '@glimmer/runtime';
import {
  clientBuilder,
  createCapturedArgs,
  curry,
  EMPTY_POSITIONAL,
  inTransaction,
  renderMain,
} from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { unwrapTemplate } from './component-managers/unwrap-template';
import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import type Component from './component';
import { hasDOM } from '../../browser-environment';
import type ClassicComponent from './component';
import { BOUNDS } from './component-managers/curly';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import ResolverImpl from './resolver';
import type { OutletState } from './utils/outlet';
import OutletView from './views/outlet';
import { makeRouteTemplate } from './component-managers/route-template';

// Import shared pieces from render-component
import {
  errorLoopTransaction,
  BaseRenderer,
  type IBuilder,
  type RootState,
  type ViewRegistry,
} from './render-component';

// Re-export for backward compatibility
export {
  renderComponent,
  renderSettled,
  _resetRenderers,
  BaseRenderer,
  type RenderResult,
  type IBuilder,
  type ViewRegistry,
} from './render-component';

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
  constructor(
    public view: View | null,
    public outletState: Reference<OutletState | undefined>
  ) {}

  child() {
    return new DynamicScope(this.view, this.outletState);
  }

  get(key: 'outletState'): Reference<OutletState | undefined> {
    assert(
      `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    return this.outletState;
  }

  set(key: 'outletState', value: Reference<OutletState | undefined>) {
    assert(
      `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    this.outletState = value;
    return value;
  }
}

class ClassicRootState implements RootState {
  readonly type = 'classic';
  public id: string;
  public result: GlimmerRenderResult | undefined;
  public destroyed: boolean;
  public render: () => void;
  readonly env: Environment;

  constructor(
    public root: Component | OutletView,
    context: EvaluationContext,
    owner: object,
    template: Template,
    self: Reference<unknown>,
    parentElement: SimpleElement,
    dynamicScope: DynamicScope,
    builder: IBuilder
  ) {
    assert(
      `You cannot render \`${valueForRef(self)}\` without a template.`,
      template !== undefined
    );

    this.id = root instanceof OutletView ? guidFor(root) : getViewId(root);
    this.result = undefined;
    this.destroyed = false;
    this.env = context.env;

    this.render = errorLoopTransaction(() => {
      let layout = unwrapTemplate(template).asLayout();

      let iterator = renderMain(
        context,
        owner,
        self,
        builder(context.env, { element: parentElement, nextSibling: null }),
        layout,
        dynamicScope
      );

      let result = (this.result = iterator.sync());

      associateDestroyableChild(this, result);

      this.render = errorLoopTransaction(() => {
        if (isDestroying(result) || isDestroyed(result)) return;

        return result.rerender({
          alwaysRevalidate: false,
        });
      });
    });
  }

  isFor(possibleRoot: unknown): boolean {
    return this.root === possibleRoot;
  }

  destroy() {
    let { result, env } = this;

    this.destroyed = true;

    this.root = null as any;
    this.result = undefined;
    this.render = undefined as any;

    if (result !== undefined) {
      /*
       Handles these scenarios:

       * When roots are removed during standard rendering process, a transaction exists already
         `.begin()` / `.commit()` are not needed.
       * When roots are being destroyed manually (`component.append(); component.destroy() case), no
         transaction exists already.
       * When roots are being destroyed during `Renderer#destroy`, no transaction exists

       */

      inTransaction(env, () => destroy(result!));
    }
  }
}

export class Renderer extends BaseRenderer {
  static override strict(
    owner: object,
    document: SimpleDocument | Document,
    options: { isInteractive: boolean; hasDOM?: boolean }
  ): BaseRenderer {
    return new BaseRenderer(
      owner,
      { hasDOM: hasDOM, ...options },
      document as SimpleDocument,
      new ResolverImpl() as ClassicResolver,
      clientBuilder
    );
  }

  private _rootTemplate: Template;
  private _viewRegistry: ViewRegistry;

  static create(props: { _viewRegistry: any }): Renderer {
    let { _viewRegistry } = props;
    let owner = getOwner(props);
    assert('Renderer is unexpectedly missing an owner', owner);
    let document = owner.lookup('service:-document') as SimpleDocument;
    let env = owner.lookup('-environment:main') as {
      isInteractive: boolean;
      hasDOM: boolean;
    };
    let rootTemplate = owner.lookup(P`template:-root`) as TemplateFactory;
    let builder = owner.lookup('service:-dom-builder') as IBuilder;
    return new this(owner, document, env, rootTemplate, _viewRegistry, builder);
  }

  constructor(
    owner: InternalOwner,
    document: SimpleDocument,
    env: { isInteractive: boolean; hasDOM: boolean },
    rootTemplate: TemplateFactory,
    viewRegistry: ViewRegistry,
    builder = clientBuilder,
    resolver = new ResolverImpl()
  ) {
    super(owner, env, document, resolver as ClassicResolver, builder);
    this._rootTemplate = rootTemplate(owner);
    this._viewRegistry = viewRegistry || owner.lookup('-view-registry:main');
  }

  // renderer HOOKS

  appendOutletView(view: OutletView, target: SimpleElement): void {
    // TODO: This bypasses the {{outlet}} syntax so logically duplicates
    // some of the set up code. Since this is all internal (or is it?),
    // we can refactor this to do something more direct/less convoluted
    // and with less setup, but get it working first
    let outlet = createRootOutlet(view);
    let { name, /* controller, */ template } = view.state;

    let named = dict<Reference>();

    named['Component'] = createConstRef(
      makeRouteTemplate(view.owner, name, template as Template),
      '@Component'
    );

    // TODO: is this guaranteed to be undefined? It seems to be the
    // case in the `OutletView` class. Investigate how much that class
    // exists as an internal implementation detail only, or if it was
    // used outside of core. As far as I can tell, test-helpers uses
    // it but only for `setOutletState`.
    // named['controller'] = createConstRef(controller, '@controller');
    // Update: at least according to the debug render tree tests, we
    // appear to always expect this to be undefined. Not a definitive
    // source by any means, but is useful evidence
    named['controller'] = UNDEFINED_REFERENCE;
    named['model'] = UNDEFINED_REFERENCE;

    let args = createCapturedArgs(named, EMPTY_POSITIONAL);

    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, outlet, view.owner, args, true),
      target
    );
  }

  appendTo(view: ClassicComponent, target: SimpleElement): void {
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, definition, this.state.owner, null, true),
      target
    );
  }

  _appendDefinition(
    root: OutletView | ClassicComponent,
    definition: CurriedValue,
    target: SimpleElement
  ): void {
    let self = createConstRef(definition, 'this');
    let dynamicScope = new DynamicScope(null, UNDEFINED_REFERENCE);
    let rootState = new ClassicRootState(
      root,
      this.state.context,
      this.state.owner,
      this._rootTemplate,
      self,
      target,
      dynamicScope,
      this.state.builder
    );
    this.state.renderRoot(rootState, this);
  }

  cleanupRootFor(component: ClassicComponent): void {
    // no need to cleanup roots if we have already been destroyed
    if (isDestroyed(this)) {
      return;
    }

    let roots = this.state.roots;

    // traverse in reverse so we can remove items
    // without mucking up the index
    let i = roots.length;
    while (i--) {
      let root = roots[i];
      assert('has root', root);
      if (root.type === 'classic' && root.isFor(component)) {
        root.destroy();
        roots.splice(i, 1);
      }
    }
  }

  remove(view: ClassicComponent): void {
    view._transitionTo('destroying');

    this.cleanupRootFor(view);

    if (this.state.isInteractive) {
      view.trigger('didDestroyElement');
    }
  }

  get _roots() {
    return this.state.debug.roots;
  }

  get _inRenderTransaction() {
    return this.state.debug.inRenderTransaction;
  }

  get _isInteractive() {
    return this.state.debug.isInteractive;
  }

  get _context() {
    return this.state.context;
  }

  register(view: any): void {
    let id = getViewId(view);
    assert(
      'Attempted to register a view with an id already in use: ' + id,
      !this._viewRegistry[id]
    );
    this._viewRegistry[id] = view;
  }

  unregister(view: any): void {
    delete this._viewRegistry[getViewId(view)];
  }

  getElement(component: View): Nullable<Element> {
    if (this._isInteractive) {
      return getViewElement(component);
    } else {
      throw new Error(
        'Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).'
      );
    }
  }

  getBounds(component: View): {
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  } {
    let bounds: Bounds | null = component[BOUNDS];

    assert('object passed to getBounds must have the BOUNDS symbol as a property', bounds);

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }
}
