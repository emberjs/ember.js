// gxt NATIVE layer — alias target for `@ember/-internals/glimmer/lib/renderer`
// (the classic VM renderer and the `@glimmer/runtime` / opcode-compiler /
// program code it pulls in are never imported in native).
//
// A render ROOT is one gxt `Root` (createRoot) with the Ember owner provided as
// gxt context (`OWNER`, read by the native component manager), rendered with
// gxt `renderComponent` inside one render transaction (DEV backtracking scope),
// then inserted at its target. Teardown is gxt's tree destruction
// (`destroyElementSync`): component destructors (Glimmer `destroyComponent` →
// willDestroy / Ember `destroy`) run, DOM is removed. Roots are tracked per
// owner, so `Renderer#debugRenderTree.capture()` (Inspector, `@ember/debug`
// captureRenderTree) sees every root rendered with that owner.
//
// Updates are not driven from here: gxt cells/formulas re-render, scheduled by
// the native host hooks (host-hooks.ts: backburner render queue).
//
//   renderComponent(component, {into, owner, args})  public `@ember/renderer` API;
//                                                      a `RootOutlet`
//                                                      (native/root-outlet.ts, the
//                                                      router's root outlet that
//                                                      `renderRootComponent`
//                                                      renders) goes to the owner's
//                                                      `appendOutletView`
//   renderSettled()                                   host-hooks.ts
//   Renderer (`renderer:-dom`)                         app renderer; `appendOutletView`
//                                                      renders the router's outlet
//                                                      tree (native/outlet.ts) as a
//                                                      root through `renderRoot`
//
// Every owner with live roots has an entry in upstream's `renderers` list
// (glimmer/lib/renderers.ts), which `@ember/debug`'s `captureRenderTree` reads.
import './install';
import { assert } from '@ember/debug';
import { getOwner } from '@ember/-internals/owner';
import {
  captureRenderTree,
  createRoot,
  destroyElementSync,
  initDOM,
  provideContext,
  RENDERED_NODES_PROPERTY,
  renderComponent as gxtRenderComponent,
  type CapturedRenderNode,
  type Root,
} from '@lifeart/gxt';
import { isDestroying, registerDestructor, unregisterDestructor } from './destroyable';
import {
  hasPendingRender,
  renderSettled,
  renderTransaction,
  resetRenderLoop,
  scheduleRevalidate,
} from './host-hooks';
import { instanceOfNode, OWNER, resolveComponentName } from './managers';
import { commitModifiers, debugModifierNodes, INTERACTIVE } from './modifier-manager';
import { commitComponents } from './component-lifecycle';
import { documentedDrop } from './not-implemented';
import type OutletView from './outlet';
import { Outlet, OUTLET_STATE, outletNodeKind } from './outlet';
import { RootOutlet } from './root-outlet';
import { renderers } from '@ember/-internals/glimmer/lib/renderers';

export { renderSettled };

// ---------------------------------------------------------------- roots
export class NativeRenderRoot {
  #destroyed = false;
  /** The component gxt rendered at the top of this root (set once rendered). */
  rendered: object | null = null;

  constructor(
    readonly owner: object,
    readonly root: Root,
    readonly parent: Node
  ) {}

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    let roots = rootsOf(this.owner);
    roots.delete(this);
    if (roots.size === 0) deregisterOwner(this.owner);
    // gxt's teardown removes only CONNECTED nodes (descendants of an already
    // removed element are skipped — its fast clear path). A root rendered into
    // a DETACHED element (renderComponent RFC) would keep its top-level nodes,
    // so collect them first and remove the leftovers after gxt's teardown.
    const leftovers =
      this.rendered !== null && !this.parent.isConnected ? topLevelNodes(this.rendered) : null;
    destroyElementSync(this.root as never, false, initDOM(this.root as never));
    if (leftovers !== null) {
      for (const node of leftovers) node.parentNode?.removeChild(node);
    }
  }
}

// The DOM nodes a rendered component placed at its own top level: its rendered
// nodes, descending into nested component / control-flow nodes (never into DOM
// children — an element takes its subtree with it).
function topLevelNodes(component: object): Node[] {
  const out: Node[] = [];
  const stack: unknown[] = [(component as Record<PropertyKey, unknown>)[RENDERED_NODES_PROPERTY]];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else if (current !== null && typeof current === 'object') {
      const nested = (current as Record<PropertyKey, unknown>)[RENDERED_NODES_PROPERTY];
      if (nested !== undefined) stack.push(nested);
      else if (typeof (current as Node).nodeType === 'number') out.push(current as Node);
    }
  }
  return out;
}

const ROOTS_BY_OWNER = new WeakMap<object, Set<NativeRenderRoot>>();

// owner → its entry in upstream's `renderers` list, while it has live roots:
// the parts of a `BaseRenderer` that readers of the list use
// (`debugRenderTree.capture()`, `state.roots`).
interface RendererEntry {
  readonly debugRenderTree: { capture(): unknown[] };
  readonly state: { readonly roots: NativeRenderRoot[] };
}
const RENDERER_ENTRIES = new WeakMap<object, RendererEntry>();

function registerOwner(owner: object): void {
  let entry = RENDERER_ENTRIES.get(owner);
  if (entry === undefined) {
    entry = {
      debugRenderTree: { capture: () => captureRootsOf(owner) },
      state: {
        get roots() {
          return Array.from(rootsOf(owner));
        },
      },
    };
    RENDERER_ENTRIES.set(owner, entry);
  }
  if (!(renderers as unknown[]).includes(entry)) (renderers as unknown[]).push(entry);
}

function deregisterOwner(owner: object): void {
  const entry = RENDERER_ENTRIES.get(owner);
  if (entry === undefined) return;
  RENDERER_ENTRIES.delete(owner);
  const index = (renderers as unknown[]).indexOf(entry);
  if (index !== -1) (renderers as unknown[]).splice(index, 1);
}

function rootsOf(owner: object): Set<NativeRenderRoot> {
  let roots = ROOTS_BY_OWNER.get(owner);
  if (roots === undefined) {
    roots = new Set();
    ROOTS_BY_OWNER.set(owner, roots);
  }
  return roots;
}

/**
 * Render `component` as a new root owned by `owner`, inserted into `parent`
 * before `nextSibling`. Rendering happens straight into `parent`, in document
 * order (Glimmer's append-as-you-go element builder), inside one render
 * transaction — so a template can find elements it rendered earlier in the
 * same render (`renderComponent({ into })` / `{{#in-element}}` destinations,
 * `document.getElementById`), and an in-element appending to the render target
 * itself lands after the content before it. On failure the partial root is
 * torn down and the error re-thrown. `context` adds gxt render-context entries
 * on the root (the outlet root provides its outlet state). The building block
 * of `renderComponent` and of the app's outlet root
 * (`Renderer#appendOutletView`).
 */
export function renderRoot(
  component: object,
  {
    owner,
    parent,
    nextSibling = null,
    args = {},
    context = [],
    interactive = true,
  }: {
    owner: object;
    parent: Node;
    nextSibling?: Node | null;
    args?: Record<string, unknown>;
    context?: ReadonlyArray<readonly [symbol, unknown]>;
    /** `false`: no modifiers run in this render tree (SSR-style environments). */
    interactive?: boolean;
  }
): NativeRenderRoot {
  const document = parent.ownerDocument ?? globalThis.document;
  const root = createRoot(document);
  provideContext(root as never, OWNER, owner);
  provideContext(root as never, INTERACTIVE, interactive);
  for (const [key, value] of context) provideContext(root as never, key, value);
  const result = new NativeRenderRoot(owner, root, parent);
  rootsOf(owner).add(result);
  registerOwner(owner);
  try {
    result.rendered = renderTransaction(() =>
      gxtRenderComponent(component as never, {
        owner: root,
        args,
        element: parent as never,
        nextSibling,
      })
    ) as unknown as object;
  } catch (error) {
    try {
      result.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'native renderer: render failed, and tearing down the partial render failed too'
      );
    }
    throw error;
  }
  // The root's elements are in place: run custom-manager didCreate callbacks
  // and install its modifiers (Glimmer's environment commit). A root rendered
  // during a render pass leaves them to the pass's commit (both are no-ops
  // while gxt is rendering).
  commitComponents();
  commitModifiers();
  return result;
}

function captureRootsOf(owner: object): CapturedRenderNode[] {
  const roots = Array.from(rootsOf(owner), (r) => r.root);
  // Each gxt Root is a container node; its children are the rendered components.
  const seen = new Set<string>();
  return captureRenderTree(roots as never).flatMap((node) => emberNodes(node.children, seen));
}

// Glimmer's render tree lists components, outlets and route templates only:
// gxt's own block nodes (`{{#if}}` / `{{#each}}` / yield / wrapper / content
// units — the nodes Ember has no name for) are transparent, their children
// take their place. Element modifiers are listed too (`modifier` nodes, under
// the component rendering the element): those of the elements a gxt node
// rendered join that node's children — a transparent node's join its named
// ancestor's. `seen` lists each modifier once (gxt may reach a block twice).
function emberNodes(nodes: CapturedRenderNode[], seen: Set<string>): CapturedRenderNode[] {
  const out: CapturedRenderNode[] = [];
  for (const node of nodes) {
    const instance = node.instance;
    const named =
      instance !== null &&
      typeof instance === 'object' &&
      (outletNodeKind(instance) !== undefined || resolveComponentName(instance) !== undefined);
    if (named) out.push(withOutletKinds(node, seen));
    else out.push(...modifierNodes(node, seen), ...emberNodes(node.children, seen));
  }
  return out;
}

function modifierNodes(node: CapturedRenderNode, seen: Set<string>): CapturedRenderNode[] {
  const instance = node.instance;
  if (instance === null || typeof instance !== 'object') return [];
  const nodes = debugModifierNodes(instance);
  if (nodes.length === 0) return nodes;
  return nodes.filter((modifier) => {
    if (seen.has(modifier.id)) return false;
    seen.add(modifier.id);
    return true;
  });
}

// gxt captures every node as `type: 'component'`; the outlet layer knows which
// nodes are outlets and route templates (classic shapes: an outlet node has no
// args / instance; a route-template node's instance is its controller).
function withOutletKinds(node: CapturedRenderNode, seen: Set<string>): CapturedRenderNode {
  const children = [...modifierNodes(node, seen), ...emberNodes(node.children, seen)];
  switch (outletNodeKind(node.instance)) {
    case 'outlet':
      return {
        ...node,
        type: 'outlet',
        args: { positional: [], named: {} },
        instance: undefined,
        children,
      };
    case 'route-template':
      return { ...node, type: 'route-template', instance: node.args.named['controller'], children };
    default: {
      const instance =
        node.instance !== null && typeof node.instance === 'object'
          ? instanceOfNode(node.instance)
          : node.instance;
      return instance === node.instance ? { ...node, children } : { ...node, instance, children };
    }
  }
}

// ---------------------------------------------------------------- renderComponent
interface Cursor {
  element: Element;
  nextSibling: Node | null;
}
type IntoTarget = Element | Cursor;

/**
 * The returned object from `renderComponent`
 * @public
 * @module @ember/renderer
 */
export interface RenderResult {
  /** Destroys the render tree and removes all rendered content from the element rendered into */
  destroy(): void;
}

function isElement(into: IntoTarget): into is Element {
  return (into as Node).nodeType === 1;
}

interface RenderCacheEntry {
  result: RenderResult;
  /**
   * The root this render produced synchronously — what a later render into the
   * same target replaces. `null` for a render queued behind its owner's render
   * (Glimmer had no render result for it at call time): it is never replaced.
   */
  root: NativeRenderRoot | null;
}

// The last `renderComponent` into each target (an Element or a Cursor object).
const RENDER_CACHE = new WeakMap<object, RenderCacheEntry>();

// Owners whose `renderComponent` root is rendering right now → the renders
// requested with the same owner meanwhile. Glimmer keeps one renderer per
// owner; a root added during that renderer's render transaction is not
// rendered on the spot but by the same transaction, after the current pass
// (`RendererState#renderRoots` re-loops over the added roots), and the
// `renderComponent` call that added it gets no render result.
const QUEUED_RENDERS = new Map<object, Array<() => void>>();

/**
 * `@ember/renderer` `renderComponent` (RFC 1099), with Glimmer's semantics for
 * repeated renders into one target:
 *   - the first render into an Element clears it;
 *   - a later render replaces the previous one IN PLACE (Glimmer inserts it
 *     before the previous render's first node and destroys the previous render,
 *     whose DOM goes away when the destruction runs; here it is torn down
 *     synchronously and the new render takes its position);
 *   - a render requested while a root of the same owner is rendering is queued
 *     and rendered right after that root (see QUEUED_RENDERS). A queued render
 *     is never replaced: a later render into the same target is added next to
 *     it ("multiple calls to render in to the same element appear as
 *     siblings"); it stays rendered and reactive until its own `destroy()` or
 *     its owner's destruction. (Glimmer's result for it cannot be destroyed at
 *     all and its root is never torn down — native does not keep that leak.)
 * Queuing applies to the initial render of a root; a render requested from an
 * update renders on the spot.
 */
export function renderComponent(
  component: object,
  {
    owner = {},
    into,
    args,
    env,
  }: {
    into: IntoTarget;
    owner?: object;
    env?: { isInteractive?: boolean; [rendererOption: string]: unknown };
    args?: Record<string, unknown>;
  }
): RenderResult {
  if (component instanceof RootOutlet) {
    return renderRootOutlet(component, into, owner);
  }

  const parent = isElement(into) ? into : into.element;
  let nextSibling = isElement(into) ? null : into.nextSibling;
  const existing = RENDER_CACHE.get(into);
  if (existing === undefined) {
    if (isElement(into)) into.innerHTML = '';
  } else if (existing.root !== null) {
    const after = nodeAfter(existing.root, parent);
    if (after !== undefined) nextSibling = after;
    existing.result.destroy();
  }
  const mount = (): MountedRender =>
    mountRender(component, owner, parent, nextSibling, args, env?.isInteractive ?? true);

  const queue = QUEUED_RENDERS.get(owner);
  if (queue !== undefined) {
    let mounted: MountedRender | null = null;
    let destroyed = false;
    const result: RenderResult = {
      destroy() {
        destroyed = true;
        mounted?.destroy();
        if (RENDER_CACHE.get(into)?.result === result) RENDER_CACHE.delete(into);
      },
    };
    queue.push(() => {
      if (!destroyed) mounted = mount();
    });
    RENDER_CACHE.set(into, { result, root: null });
    return result;
  }

  const queued: Array<() => void> = [];
  QUEUED_RENDERS.set(owner, queued);
  try {
    const mounted = mount();
    const result: RenderResult = {
      destroy() {
        mounted.destroy();
        if (RENDER_CACHE.get(into)?.result === result) RENDER_CACHE.delete(into);
      },
    };
    RENDER_CACHE.set(into, { result, root: mounted.root });
    // A queued render may queue more (same transaction, next loop in Glimmer).
    for (let i = 0; i < queued.length; i++) queued[i]!();
    return result;
  } finally {
    QUEUED_RENDERS.delete(owner);
  }
}

interface MountedRender {
  root: NativeRenderRoot;
  destroy(): void;
}

function mountRender(
  component: object,
  owner: object,
  parent: Element,
  nextSibling: Node | null,
  args: Record<string, unknown> | undefined,
  interactive: boolean
): MountedRender {
  // The anchor was taken when the render was requested; a queued render runs
  // later, by which time it may have left the target (then: append).
  const anchor = nextSibling !== null && nextSibling.parentNode !== parent ? null : nextSibling;
  const root = renderRoot(component, {
    owner,
    parent,
    nextSibling: anchor,
    args: args ?? {},
    interactive,
  });

  // Destroying the owner tears the render down (Ember destroyable graph).
  let ownerDestructor: (() => void) | null = () => root.destroy();
  registerDestructor(owner, ownerDestructor);

  return {
    root,
    destroy() {
      if (ownerDestructor !== null) {
        if (!isDestroying(owner)) unregisterDestructor(owner, ownerDestructor);
        ownerDestructor = null;
      }
      root.destroy();
    },
  };
}

// The node right after `root`'s last top-level node in `parent` (`null`: that
// node is the last child), or `undefined` when `root` has no node there.
function nodeAfter(root: NativeRenderRoot, parent: Element): Node | null | undefined {
  if (root.isDestroyed || root.rendered === null) return undefined;
  const own = new Set(topLevelNodes(root.rendered));
  let last: Node | undefined;
  for (let node = parent.firstChild; node !== null; node = node.nextSibling) {
    if (own.has(node)) last = node;
  }
  return last === undefined ? undefined : last.nextSibling;
}

/**
 * The router's root outlet (`ApplicationInstance#renderRootComponent`):
 * rendered by the owner's application renderer (`appendOutletView`), torn down
 * with the owner.
 */
function renderRootOutlet(component: RootOutlet, into: IntoTarget, owner: object): RenderResult {
  const target = isElement(into) ? into : into.element;
  const typedOwner = owner as { lookup(name: string): unknown };
  const view = component.state.viewFor(owner as never);
  const renderer = typedOwner.lookup('renderer:-dom') as Renderer;
  renderer.appendOutletView(view, target);
  let ownerDestructor: (() => void) | null = () => view.destroy();
  registerDestructor(owner, ownerDestructor);
  return {
    destroy() {
      if (ownerDestructor !== null) {
        if (!isDestroying(owner)) unregisterDestructor(owner, ownerDestructor);
        ownerDestructor = null;
      }
      view.destroy();
    },
  };
}

/**
 * `setRenderer(owner, renderer)`: upstream seeds the owner's renderer for
 * `renderComponent` (a router-aware resolver for `{{mount}}`). Native renders
 * every root with the gxt runtime and resolves through the owner, so there is
 * nothing to seed.
 */
export function setRenderer(_owner: object, _renderer: unknown): void {}

export function _resetRenderers(): void {
  renderers.length = 0;
  resetRenderLoop();
}

// ---------------------------------------------------------------- Renderer
const CLASSIC_VIEWS = 'Classic `@ember/component` views';
const USE_GLIMMER = 'Use @glimmer/component (or a template-only component) instead.';

/** The application renderer (`renderer:-dom`). */
export class Renderer {
  static create(props: { _viewRegistry?: unknown }): Renderer {
    const owner = getOwner(props);
    assert('Renderer is unexpectedly missing an owner', owner);
    return new Renderer(owner, props._viewRegistry);
  }

  constructor(
    readonly owner: object,
    readonly _viewRegistry?: unknown
  ) {}

  /**
   * Render the router's outlet tree into `target` (scheduled in the render
   * queue by `OutletView#appendTo`, classic parity): one root whose component
   * is the root `Outlet`, reading the view's top-level outlet state.
   */
  appendOutletView(view: OutletView, target: Element | null): void {
    assert(
      'native renderer: the application root element was not found (rootElement)',
      target !== null && target !== undefined
    );
    const environment = (view.owner as { lookup(name: string): unknown }).lookup(
      '-environment:main'
    ) as { isInteractive?: boolean } | undefined;
    view.attachRoot(
      renderRoot(Outlet, {
        owner: view.owner,
        parent: target,
        context: [[OUTLET_STATE, view.rootRef]],
        interactive: environment?.isInteractive ?? true,
      })
    );
  }

  // classic-component roots / view registry: legacy (curly components dropped)
  appendTo(_view: unknown, _target: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }
  register(_view: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }
  unregister(_view: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }
  remove(_view: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }
  getElement(_view: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }
  getBounds(_view: unknown): never {
    return documentedDrop(CLASSIC_VIEWS, USE_GLIMMER);
  }

  /** Schedule a render pass (everything stale re-renders in it). */
  rerender(): void {
    scheduleRevalidate();
  }

  isValid(): boolean {
    return !hasPendingRender();
  }

  get debugRenderTree(): { capture(): CapturedRenderNode[] } {
    const { owner } = this;
    return { capture: () => captureRootsOf(owner) };
  }

  destroy(): void {
    for (const root of Array.from(rootsOf(this.owner))) root.destroy();
  }
}

/** A rendered view (classic `View` type surface; classic views are dropped). */
export interface View {
  parentView: View | null;
  renderer: Renderer;
  tagName: string | null;
  elementId: string | null;
  isDestroying: boolean;
  isDestroyed: boolean;
  [key: string]: unknown;
}
