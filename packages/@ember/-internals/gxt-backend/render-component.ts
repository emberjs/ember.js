// `renderComponent` in GXT builds, and the GXT render helpers glimmer's
// renderers share, moved here from glimmer/lib/base-renderer.ts. The glimmer
// host (glimmer-host.ts) gives base-renderer.ts the render and the debug render
// tree; classic-roots.ts renders the classic roots with the same helpers, so
// the GXT root context and DOM API below are the only ones of both.
import type {
  CapturedRenderNode,
  Cursor,
  DebugRenderTree,
  RenderResult as GlimmerRenderResult,
} from '@glimmer/interfaces';
import type { SimpleElement } from '@simple-dom/interface';
import { _getCurrentRunLoop } from '@ember/runloop';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { destroy, registerDestructor } from '@glimmer/destroyable';
import type {
  BaseRenderer,
  RendererRoot,
  RendererState,
  RenderResult,
} from '@ember/-internals/glimmer/lib/base-renderer';
import { getGxtRenderer, getAmbientOwner, setAmbientOwner } from './gxt-bridge';

// The render passes of a renderer's roots (`RendererState#renderRoots` in
// base-renderer.ts) in GXT builds: each pass renders the roots there were when
// it started, and a pass runs again while a render adds roots. GXT roots never
// enqueue VM-transaction work (no opcodes run), and the GXT renderer has no VM
// environment to open a transaction on (see the BaseRenderer constructor), so
// the passes run directly. No revision is recorded: `isValid` does not compare
// revisions (gxt renders the updates), and reading `CURRENT_TAG` would
// subscribe the formula a nested `renderComponent` call runs in (a helper that
// renders a component and adds its root) to every tag: the formula would run
// again on any change, and render the component again. The caller removes the
// roots this adds to `removedRoots`.
export function gxtRenderRoots(roots: RendererRoot[], removedRoots: RendererRoot[]): void {
  let initialRootsLength: number;
  let _renderIterations = 0;

  do {
    // GXT safety limit against infinite render loops.
    if (++_renderIterations > 20) {
      break;
    }
    // GXT test-harness loop guard (DEBUG only, so it tree-shakes out of
    // the production dist).
    if (DEBUG && typeof (globalThis as any).__gxtOpCheck === 'function') {
      (globalThis as any).__gxtOpCheck();
    }
    initialRootsLength = roots.length;

    /**
     * `roots.length` is read on each iteration, because a render can
     *
     * - add roots, which this pass skips
     * - remove roots, which makes the array shorter
     */
    for (let i = 0; i < roots.length; i++) {
      let root = roots[i];
      assert('has root', root);

      if (root.destroyed) {
        removedRoots.push(root);
        continue;
      }

      if (i >= initialRootsLength) continue;

      root.render();

      // In GXT mode, lifecycle errors during re-render (destroy, didInsertElement)
      // are deferred to avoid disabling errorLoopTransaction. Re-throw them here
      // so they propagate to assert.throws() in tests.
      if ((root as any).__gxtDeferredError) {
        const err = (root as any).__gxtDeferredError;
        (root as any).__gxtDeferredError = null;
        throw err;
      }
    }
  } while (roots.length > initialRootsLength);
}

// What `renderComponent` renders into (base-renderer.ts).
type IntoTarget = Cursor | Element | SimpleElement;

const isCursor = (into: IntoTarget): into is Cursor => 'element' in into;

// Lazy accessor for @lifeart/gxt symbols through the bridge. Every call site
// below is reached only from GXT-mode code paths. Avoiding a static
// `import * as _gxt from '@lifeart/gxt'` keeps the GXT runtime (and its
// module-load side effects) out of the classic bundle.
export function _gxtLib(): any {
  // GXT-only. Body gated on the literal `__GXT_MODE__` so the `getGxtRenderer`
  // reference (and thus the whole gxt-bridge module) tree-shakes out of the
  // unminified classic dist — rollup folds `if (false)` to nothing but does NOT
  // drop the unreferenced declaration of this cyclic helper cluster.
  if (__GXT_MODE__) {
    return getGxtRenderer()?.gxtLib;
  }
}

// GXT-only: the render-pass hooks of gxt-backend/manager.ts. manager.ts installs
// the renderer bridge when it loads, which is before any GXT render.
export function gxtRenderPass() {
  return getGxtRenderer()!.renderPass;
}

// Cached GXT DOM API for destroyElementSync
let gxtDomApi: any = null;

function getGxtDomApi() {
  if (__GXT_MODE__) {
    if (!gxtDomApi) {
      gxtDomApi = new (_gxtLib().HTMLBrowserDOMApi)(document);
    }
    return gxtDomApi;
  }
}

// Wrapper that provides the GXT DOM API
export function destroyElementSync(component: any, skipDom = false) {
  if (__GXT_MODE__) {
    _gxtLib().destroyElementSync(component, skipDom, getGxtDomApi());
  }
}

// Cached GXT root context for the document
let gxtRootContext: any = null;

// Ensure GXT context is initialized before any GXT rendering
export function ensureGxtContext() {
  if (__GXT_MODE__) {
    const lib = _gxtLib();
    if (!gxtRootContext) {
      gxtRootContext = lib.createRoot(document);
      // CRITICAL: Provide the rendering context with DOM API
      // This sets fastRenderingContext which is checked first by initDOM
      const domApi = getGxtDomApi();
      lib.provideContext(gxtRootContext, lib.RENDERING_CONTEXT, domApi);
      // Share this root context with gxt-backend so it reuses it instead of
      // creating new roots that pollute the shared context chain.
      getGxtRenderer()?.compilePipeline.setRootContext?.(gxtRootContext);
    }
    // Always ensure context is set before rendering
    const currentContext = lib.getParentContext();
    if (!currentContext) {
      lib.setParentContext(gxtRootContext);
    }
    return gxtRootContext;
  }
}

// GXT-only: the `{ROOT}` node of each `renderComponent` root, by root (see
// `_renderComponentGxt`).
const GXT_ROOT_NODES = new WeakMap<RendererRoot, () => CapturedRenderNode>();

// GXT-only: the gxt roots of the `renderComponent` renders. The tree under one
// is the `{ROOT}` node of its renderer, so it is not part of the shared tree of
// the classic roots.
const GXT_RENDER_ROOTS = new WeakSet<object>();

// GXT-only: the DebugRenderTree of a renderer, backed by gxt's
// `captureRenderTree`. Only `.capture()` is reachable in GXT mode — the
// `begin`/`create`/`update`/`didRender`/`willDestroy`/`commit` bookkeeping
// lives on the classic Glimmer VM environment, which the GXT build does not
// include (see the `debugRenderTree` getter).
//
// `capture()` lists the trees of the renderer's roots, as Glimmer's debug
// render tree lists the renders of its environment:
//
// - a `renderComponent` root is its `{ROOT}` node. With the debug render tree
//   on (the renderer's environment has one), its children are the components
//   and modifiers the render recorded (gxt-backend debug-render-tree.ts);
//   without it, the tree gxt captures under the render;
// - the classic roots (application outlets, classic components) render in
//   gxt's shared tree. gxt captures it from its own registry of render roots
//   (no arguments), less the gxt roots of `renderComponent` renders. gxt
//   returns Ember-compatible `CapturedRenderNode[]` (it adds a harmless
//   `template: null` field and always reports `type: 'component'`).
//
// gxt errors propagate.
export function gxtDebugRenderTree(state: RendererState): DebugRenderTree {
  // GXT-only. Body gated on the literal `__GXT_MODE__` so the `_gxtLib`
  // reference tree-shakes out of the classic dist.
  if (__GXT_MODE__) {
    const noop = (): void => {};
    return {
      begin: noop,
      create: noop,
      update: noop,
      didRender: noop,
      willDestroy: noop,
      commit: noop,
      capture: (): CapturedRenderNode[] => {
        const nodes: CapturedRenderNode[] = [];
        let hasClassicRoots = false;
        for (const root of state.roots) {
          const rootNode = GXT_ROOT_NODES.get(root);
          if (rootNode === undefined) {
            hasClassicRoots = true;
          } else if (!root.destroyed) {
            nodes.push(rootNode());
          }
        }
        if (hasClassicRoots) {
          for (const node of _gxtLib().captureRenderTree() as CapturedRenderNode[]) {
            if (!GXT_RENDER_ROOTS.has(node.instance as object)) nodes.push(node);
          }
        }
        return nodes;
      },
    } as DebugRenderTree;
  }
  throw new Error('[gxt] gxtDebugRenderTree() called outside GXT mode');
}

/**
 * GXT-mode multi-render bookkeeping. Each `renderComponent` call into a
 * given target produces an independent render entry that tracks its own
 * (firstNode, lastNode) DOM range. Multiple entries can coexist within
 * the same target as siblings; each entry's destroy/re-render operates
 * only on the nodes inside its own range, leaving other entries
 * untouched.
 */
interface GxtRenderEntry {
  /**
   * First and last DOM node belonging to this render. The range is
   * inclusive: every node from firstNode to lastNode (walking nextSibling)
   * is owned by this entry. References update on re-render so the entry's
   * range tracks the live DOM range it occupies.
   */
  firstNode: Node | null;
  lastNode: Node | null;
  destroy: () => void;
  result: RenderResult;
  /**
   * The component definition this entry rendered. Used to dedupe
   * "spurious double-fire" cases where GXT's compiled template invokes
   * the same helper twice for a single source-level mustache (the
   * loose-mode helper-lookup path can do this). When a second
   * renderComponent call into the same target arrives in the SAME
   * runloop with the SAME (component, owner) pair as a prior entry,
   * we treat it as a duplicate of the prior call and reuse the prior
   * result instead of creating a sibling. Genuine sibling renders
   * (e.g. `{{render A 'a' owner}}\n{{render A 'a'}}`) differ in their
   * `owner` arg, so they keep distinct identities.
   */
  component: object;
  ownerObj: object;
  /**
   * The runloop instance that was active when this entry was created.
   * Used to distinguish "sibling renders within the same render pass"
   * (same runloop -> coexist) from "re-render of the same target across
   * runloop boundaries" (different runloop -> destroy prior): synchronous
   * back-to-back renders in one run() are siblings; an outer template
   * re-render that calls renderComponent again replaces.
   */
  runloop: object | null;
  /**
   * Tears down the gxt component tree of a raw gxt template function rendered
   * by this entry (see `rawGxtTemplate`), so its components' destructors run.
   */
  teardownRendered?: () => void;
  /**
   * The gxt component a raw gxt template function rendered as (see
   * `rawGxtTemplate`): its tree is the render's tree.
   */
  renderedTree?: object | null;
  /**
   * The bounds of the render, as they are now: the render's nodes are the
   * children of `boundsParent` after `boundsBefore` and before `boundsAfter`,
   * the nodes around the render (`null`: the render starts, or ends, the
   * parent's children). An update changes the nodes of the render, and the
   * nodes around it stay, so these give the render's first and last node
   * whatever an update did at its edges (`gxtEntryFirstNode` /
   * `gxtEntryLastNode`), as Glimmer's bounds of a root block do. A render
   * inserted next to this one becomes this render's neighbour (see
   * `renderIntoRegion`).
   */
  boundsParent: Element | null;
  boundsBefore: Node | null;
  boundsAfter: Node | null;
}

// The first node of a render (see `GxtRenderEntry.boundsParent`), `null` when
// the render has no nodes.
function gxtEntryFirstNode(entry: GxtRenderEntry): Node | null {
  const parent = entry.boundsParent;
  if (parent === null) return null;
  const first = entry.boundsBefore === null ? parent.firstChild : entry.boundsBefore.nextSibling;
  return first === entry.boundsAfter ? null : first;
}

// The last node of a render, `null` when the render has no nodes.
function gxtEntryLastNode(entry: GxtRenderEntry): Node | null {
  const parent = entry.boundsParent;
  if (parent === null) return null;
  const last = entry.boundsAfter === null ? parent.lastChild : entry.boundsAfter.previousSibling;
  return last === entry.boundsBefore ? null : last;
}
interface GxtRenderTargetState {
  entries: GxtRenderEntry[];
  /**
   * True once we've performed the initial innerHTML='' clear of the target.
   * Subsequent renders into the same target must NOT clear, so they appear
   * as siblings of prior render entries.
   */
  cleared: boolean;
}
const GXT_RENDER_STATE = new WeakMap<Element, GxtRenderTargetState>();

/**
 * A raw gxt template function: a strict-mode `<template>` compiled at build
 * time (e.g. `render(<template>…</template>)` in a `.gjs` test, which
 * `@ember/test-helpers` registers as the template of its render-context
 * definition). It must not be called with the owner. The compat compiler emits
 * it as a plain `function () { $_GET_ARGS(this, arguments); … }` (gxt's
 * `$_tpl` brand is native-layer only). A template factory is
 * either branded by the GXT compile pipeline (`__gxtCompiled` / `__gxtFactory`)
 * or a hand-written factory such as the integration tests' `() => template`,
 * which is an arrow (no `prototype`) or takes the owner (`length` 1).
 */
function isRawGxtTemplateFn(value: unknown): value is (...args: unknown[]) => unknown {
  if (typeof value !== 'function') return false;
  const candidate = value as unknown as Record<string, unknown>;
  return (
    !('asLayout' in value) &&
    !candidate['__gxtCompiled'] &&
    !candidate['__gxtFactory'] &&
    value.length === 0 &&
    Object.prototype.hasOwnProperty.call(value, 'prototype')
  );
}

/**
 * A template object (`render(ctx, parentElement)`) for a raw gxt template
 * function: rendered as a gxt component by gxt's own `renderComponent`, with
 * the render context's args. A re-render or the entry's destruction tears the
 * previous gxt component tree down first.
 */
function rawGxtTemplate(fn: (...args: unknown[]) => unknown, entry: GxtRenderEntry) {
  let rendered: unknown = null;
  const teardown = () => {
    if (rendered !== null) {
      const previous = rendered;
      rendered = null;
      entry.renderedTree = null;
      destroyElementSync(previous);
    }
  };
  entry.teardownRendered = teardown;
  return {
    render(ctx: any, parentElement: Element) {
      teardown();
      rendered = _gxtLib().renderComponent(fn, {
        owner: ensureGxtContext(),
        args: ctx?.args ?? {},
        element: parentElement,
        nextSibling: null,
      });
      entry.renderedTree = rendered as object | null;
    },
  };
}

/**
 * The custom component manager factory (`setComponentManager`) of a component
 * definition: its own or the nearest one on its prototype chain, as
 * `getInternalComponentManager` finds it in @glimmer/manager. A definition can
 * be a class or a plain object.
 */
function gxtCustomComponentManagerFactory(
  definition: object
): ((owner: object) => any) | undefined {
  const managers = getGxtRenderer()?.registries.componentManagers;
  if (!managers) return undefined;
  let pointer: object | null = definition;
  while (pointer && pointer !== Object.prototype && pointer !== Function.prototype) {
    const factory = managers.get(pointer);
    if (typeof factory === 'function') return factory;
    pointer = Object.getPrototypeOf(pointer);
  }
  return undefined;
}

/**
 * The internal component manager (`setInternalComponentManager`) of a
 * component definition, its own or the nearest one on its prototype chain,
 * when that manager has the `hasSubOwner` capability. A nearer custom component
 * manager (`setComponentManager`) is the definition's manager instead, as in
 * @glimmer/manager, where both live in one table.
 */
function gxtSubOwnerComponentManager(definition: object): any {
  const registries = getGxtRenderer()?.registries;
  if (!registries) return undefined;
  let pointer: object | null = definition;
  while (pointer && pointer !== Object.prototype && pointer !== Function.prototype) {
    if (registries.componentManagers.has(pointer)) return undefined;
    const manager = registries.internalManagers.get(pointer);
    if (manager !== undefined) {
      return manager.getCapabilities?.(definition)?.hasSubOwner === true ? manager : undefined;
    }
    pointer = Object.getPrototypeOf(pointer);
  }
  return undefined;
}

/**
 * GXT-specific renderComponent implementation.
 * Bypasses Glimmer VM bytecode compilation entirely.
 */
// A getter for the root argument `key` of a `renderComponent` render: it reads
// `args[key]` as Glimmer reads a root argument (`childRefFor` of the args'
// const reference, the environment's `getProp`), through gxt-backend's
// `gxtLib.readProperty`: read once, consuming the key's property tag, so a
// binding that reads it depends on that argument only (its tag, and what
// reading it consumes, e.g. a `trackedObject`'s key). It used to read the
// classic-validator bridge cell too, which every classic tag change bumps: a
// binding that read `@foo` ran again on any change anywhere, such as a write
// to another argument.
function rootArgGetter(args: Record<string, unknown>, key: string): () => unknown {
  return () => _gxtLib().readProperty(args, key);
}

// `rendererFor` is base-renderer.ts's `rendererFor(owner, env)`: it finds or
// creates the owner's renderer when the render adds its root (`addRoot`).
export function _renderComponentGxt(
  component: object,
  into: IntoTarget,
  owner: object,
  args: Record<string, unknown> | undefined,
  rendererFor: () => BaseRenderer
): RenderResult {
  const globalTemplates = getGxtRenderer()?.registries.componentTemplates;

  // The render-error queue is global. The errors queued from here on are this
  // render's: it throws the first one when it completes, and drops them when
  // its own error propagates (see the catch at the end of the render).
  const renderErrorMark = gxtRenderPass().renderErrorMark();

  // Get the target element
  const targetElement =
    into instanceof Element ? into : 'element' in into ? (into as any).element : into;

  // A render into a cursor goes before the cursor's `nextSibling`, as the
  // Glimmer element builder inserts there. A `nextSibling` that is no longer a
  // child of the element makes the insertion throw (a DOM `NotFoundError`).
  const cursorNextSibling: Node | null =
    !(into instanceof Element) && isCursor(into)
      ? (into.nextSibling as unknown as Node | null)
      : null;

  // Multi-render scoping: each renderComponent call into a target gets its
  // own (firstNode, lastNode) DOM range. Multiple renders coexist as
  // siblings (per the renderComponent RFC's "subsequent renders to the
  // same element are prepended" semantics); each entry's destroy /
  // re-render only affects its own range, not the other entries' content.
  // Capture the current runloop instance so the new entry can decide
  // whether prior entries in the same target are "siblings" (same runloop,
  // i.e. same render pass) or "stale" (different runloop, i.e. an outer
  // re-render replacing the prior content).
  const currentRunloop = _getCurrentRunLoop();

  // The render entry is created up-front so the destroy/region helpers can
  // close over a single mutable reference. firstNode/lastNode are filled in
  // after the initial render captures the actual rendered DOM range.
  const entry: GxtRenderEntry = {
    firstNode: null,
    lastNode: null,
    destroy: () => {
      /* set below */
    },
    result: undefined as unknown as RenderResult,
    component,
    ownerObj: owner,
    runloop: currentRunloop,
    boundsParent: null,
    boundsBefore: null,
    boundsAfter: null,
  };

  let targetState: GxtRenderTargetState | undefined;
  if (targetElement instanceof Element) {
    targetState = GXT_RENDER_STATE.get(targetElement);
    if (!targetState) {
      targetState = { entries: [], cleared: false };
      GXT_RENDER_STATE.set(targetElement, targetState);
    }
    // Spurious-duplicate guard: GXT's compiled template can invoke the
    // same helper-mustache twice in a single render pass when the helper
    // resolves through a loose-mode owner.lookup chain (the `{{a-helper}}`
    // path in `<Loose />` style components). Without this guard, each
    // mustache produces TWO render entries on the target — the first
    // from the helper's first invocation, the second from its spurious
    // second invocation. Dedupe by checking whether a prior entry with
    // the SAME (component, owner) tuple already exists in the same
    // runloop: if so, return the prior entry's result instead of
    // creating a sibling. Distinct siblings (different component or
    // different owner — e.g. the documented `{{render A 'a' owner}}\n
    // {{render A 'a'}}` pattern where the second omits owner) get
    // distinct identities and proceed normally.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      for (const e of targetState.entries) {
        if (e.component === component && e.ownerObj === owner && e.runloop === currentRunloop) {
          // Skip the rest of the render path; we haven't mutated any
          // global state yet at this point in the function.
          return e.result;
        }
      }
    }
    // Replacement vs. sibling decision for prior entries already in this
    // target. A prior entry must be torn down (REPLACED) only when it
    // was created in a DIFFERENT runloop instance — the canonical
    // "renderComponent is eager, tracks with parent" case where an
    // outer @cached getter re-runs after a tag dirty and calls
    // renderComponent again. Plain back-to-back renderComponent calls
    // in the same runloop are kept as concurrent renders (the
    // documented "siblings" pattern of two `{{render A 'a'}}`
    // invocations in one template). Spurious-duplicate calls from the
    // same runloop with the same identity are caught earlier by the
    // dedupe check above.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      const stale: GxtRenderEntry[] = [];
      for (const e of targetState.entries) {
        if (e.runloop !== currentRunloop) stale.push(e);
      }
      // What the destruction throws (a destructor, a manager's
      // destroyComponent) reaches the caller, as replacing a classic render
      // destroys the last one unguarded.
      for (const e of stale) {
        e.destroy();
      }
    }
    // Initial render into a target that has not yet been claimed by
    // renderComponent: clear any pre-existing contents of the target element.
    // A cursor with a `nextSibling` renders at that position among the
    // element's other nodes, which stay.
    if (!targetState.cleared) {
      if (cursorNextSibling === null) targetElement.innerHTML = '';
      targetState.cleared = true;
    }
  }

  // Set the ambient owner so the manager system can resolve services
  const prevOwner = getAmbientOwner();
  setAmbientOwner(owner);

  // Ensure GXT context is initialized
  ensureGxtContext();

  let destroyed = false;
  let domCleanupDone = false;
  // The render's own gxt root, and the context it rendered its template with.
  // What the render creates hangs off that root in gxt's render tree (see the
  // template's `render`), and gxt registers the destructors of what the
  // template renders at its top level on the context, so destroying the
  // context's tree destroys exactly the render.
  let renderRoot: object | null = null;
  let renderedContext: object | null = null;
  // A custom component manager (`setComponentManager`) and the component it
  // created, for its destroyComponent hook.
  let customManager: any = null;
  let customComponent: unknown = undefined;
  // The owner of everything this render renders: `owner`, or the owner a
  // `hasSubOwner` internal manager returns for its component (set below).
  let renderOwner: object = owner;
  // That manager's destroyable for its component, destroyed with the render.
  let subOwnerDestroyable: object | null = null;
  // The render's root in its renderer (set below), and the component the
  // render created (`null` for a template-only component).
  let root: RendererRoot | null = null;
  let rootInstance: unknown = null;
  // The node the render's components and modifiers are recorded under in the
  // debug render tree, when its renderer has one (set with `root`).
  let debugRoot: object | null = null;

  // Remove all DOM nodes belonging to this entry's range (firstNode through
  // lastNode, inclusive). Used for both destroy and the re-render
  // "clear my region" step. After clearing, firstNode/lastNode are reset
  // so the next render can populate them.
  const clearRegion = () => {
    let first = entry.firstNode;
    const last = entry.lastNode;
    if (!first || !last) return;
    while (first) {
      const next: Node | null = first.nextSibling;
      first.parentNode?.removeChild(first);
      if (first === last) break;
      first = next;
    }
    entry.firstNode = null;
    entry.lastNode = null;
  };

  // DOM teardown: removes this render's content range from the target.
  const doDomCleanup = () => {
    if (domCleanupDone) return;
    domCleanupDone = true;
    if (entry.firstNode || entry.lastNode) {
      clearRegion();
    }
    if (targetState) {
      const idx = targetState.entries.indexOf(entry);
      if (idx >= 0) targetState.entries.splice(idx, 1);
      // Once all entries are destroyed, drop the target's bookkeeping so a
      // future renderComponent call on the same element behaves like a
      // fresh first-render (clears any new pre-existing contents).
      if (targetState.entries.length === 0 && targetElement instanceof Element) {
        GXT_RENDER_STATE.delete(targetElement);
      }
    }
  };

  // The render's bindings stop and its blocks and components are destroyed,
  // as destroying a Glimmer render result destroys its tree.
  const destroyRenderTree = () => {
    if (renderedContext !== null) {
      const context = renderedContext;
      renderedContext = null;
      destroyElementSync(context, true);
    }
    if (renderRoot !== null) {
      const gxtRoot = renderRoot;
      renderRoot = null;
      GXT_RENDER_ROOTS.delete(gxtRoot);
      destroyElementSync(gxtRoot, true);
    }
  };

  // Synchronous teardown: destroy the render's tree and remove its DOM range.
  // Cross-runloop replacement (the eager case) needs sync DOM cleanup so the
  // new render appears alone; the sibling case never reaches doDestroy until
  // the user explicitly calls result.destroy() (e.g. via owner destruction), at
  // which point sync cleanup is also correct.
  const doDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    entry.teardownRendered?.();
    destroyRenderTree();
    doDomCleanup();
    if (
      customManager?.capabilities?.destructor &&
      typeof customManager.destroyComponent === 'function'
    ) {
      customManager.destroyComponent(customComponent);
    }
    if (subOwnerDestroyable !== null) {
      destroy(subOwnerDestroyable);
    }
    // The root leaves its renderer (the destructor `RendererState.renderRoot`
    // registered), and a renderer without roots leaves the renderer list.
    if (root !== null) {
      destroy(root);
    }
  };
  entry.destroy = doDestroy;

  // Render the template into the target. The "direct" path renders into
  // the target (zero DOM movement, letting GXT's processNodes wire
  // effects against the actual ancestor chain) and is used whenever the
  // parent has no foreign live content from OTHER entries and the render goes
  // at its end. The "insert" path renders into a temporary host of the same
  // tag, then moves the resulting children before the cursor's `nextSibling`,
  // or to the FRONT of the actual parent — this gives the documented
  // "subsequent renders are prepended" behavior while preserving live sibling
  // content from prior render entries on the same target.
  const renderTemplate = (template: any, ctx: any, parent: Element) => {
    if (renderRoot === null) {
      const lib = _gxtLib();
      renderRoot = lib.createRoot(document) as object;
      lib.provideContext(renderRoot, lib.RENDERING_CONTEXT, getGxtDomApi());
      GXT_RENDER_ROOTS.add(renderRoot);
    }
    if (ctx !== null && typeof ctx === 'object') renderedContext = ctx;
    template.render(ctx, parent, renderRoot);
  };
  const renderIntoRegion = (template: any, ctx: any) => {
    if (!(targetElement instanceof Element)) {
      renderTemplate(template, ctx, targetElement);
      return;
    }
    const parent: Element = targetElement;
    let hasForeignLiveContent = false;
    if (targetState) {
      for (const e of targetState.entries) {
        if (e === entry) continue;
        if (e.firstNode && e.firstNode.parentNode === parent) {
          hasForeignLiveContent = true;
          break;
        }
      }
    }
    if (!hasForeignLiveContent && cursorNextSibling === null) {
      const lastBefore = parent.lastChild;
      renderTemplate(template, ctx, parent);
      entry.firstNode = parent.firstChild;
      entry.lastNode = parent.lastChild;
      entry.boundsParent = parent;
      entry.boundsBefore = lastBefore;
      entry.boundsAfter = null;
      // A render of this target that ended the parent now ends before this one.
      const firstRendered = lastBefore === null ? parent.firstChild : lastBefore.nextSibling;
      if (firstRendered !== null) {
        for (const e of targetState?.entries ?? []) {
          if (e !== entry && e.boundsParent === parent && e.boundsAfter === null) {
            e.boundsAfter = firstRendered;
          }
        }
      }
      return;
    }
    // Insert render: render into a temporary host of the same tag and namespace
    // (so any tag-sensitive child construction inside <table>, <select>, <svg>,
    // etc. keeps the same parent context), then move the children before the
    // cursor's `nextSibling`, or to the FRONT of the actual parent.
    const host = parent.namespaceURI
      ? document.createElementNS(parent.namespaceURI, parent.localName)
      : document.createElement(parent.localName);
    renderTemplate(template, ctx, host);
    const insertBefore = cursorNextSibling ?? parent.firstChild;
    const previous = insertBefore === null ? parent.lastChild : insertBefore.previousSibling;
    const firstCollected: Node | null = host.firstChild;
    const lastCollected: Node | null = host.lastChild;
    if (firstCollected !== null && lastCollected !== null) {
      const frag = document.createDocumentFragment();
      while (host.firstChild) {
        frag.appendChild(host.firstChild);
      }
      parent.insertBefore(frag, insertBefore);
      entry.firstNode = firstCollected;
      entry.lastNode = lastCollected;
      // The renders of this target that were next to the insertion point now
      // have this render as their neighbour.
      for (const e of targetState?.entries ?? []) {
        if (e === entry || e.boundsParent !== parent) continue;
        if (e.boundsBefore === previous) {
          e.boundsBefore = lastCollected;
        } else if (e.boundsAfter === insertBefore) {
          e.boundsAfter = firstCollected;
        }
      }
    }
    entry.boundsParent = parent;
    entry.boundsBefore = previous;
    entry.boundsAfter = insertBefore;
  };

  // The `{ROOT}` node of the render in its renderer's debug render tree, as
  // Glimmer names the root component of a `renderComponent` render: the
  // component the render created, the render's arguments and bounds, and the
  // nodes under it: those the render recorded (`debugRoot`), else the tree gxt
  // captures under the render.
  const captureRootNode = (): CapturedRenderNode => {
    const named: Record<string, unknown> = {};
    if (args) {
      for (const key of Object.keys(args)) named[key] = args[key];
    }
    const debugRenderTree = getGxtRenderer()?.debugRenderTree;
    let captured: CapturedRenderNode | undefined;
    if (debugRoot !== null && debugRenderTree !== undefined) {
      captured = debugRenderTree.capture(debugRoot);
    } else {
      const tree = entry.renderedTree ?? renderRoot;
      captured =
        tree !== null && tree !== undefined
          ? (_gxtLib().captureRenderTree([tree]) as CapturedRenderNode[])[0]
          : undefined;
    }
    const parentElement = entry.boundsParent;
    const firstNode = gxtEntryFirstNode(entry);
    const lastNode = gxtEntryLastNode(entry);
    return {
      id: captured?.id ?? '',
      type: 'component',
      name: '{ROOT}',
      args: { positional: [], named },
      instance: rootInstance,
      bounds:
        parentElement !== null && firstNode !== null && lastNode !== null
          ? ({ parentElement, firstNode, lastNode } as unknown as CapturedRenderNode['bounds'])
          : null,
      children: captured?.children ?? [],
    };
  };

  // The render is a root of its owner's renderer, as a Glimmer
  // `renderComponent` render is (`RendererState.renderRoot`): the renderer is
  // in Ember's renderer list while it has roots (`captureRenderTree`, Ember
  // Inspector, read the list), and destroying the render removes its root.
  // The root is added before the render, so the roots keep the order of their
  // renders. gxt updates a render in place, so a render pass of the renderer
  // has nothing to render for it (`render`), and the render does not wait for
  // a pass in progress: a render made during another one (a nested
  // `renderComponent`) renders now, as every GXT render does. The root's
  // `result` has the bounds of the render.
  let rendered = false;
  const rootResult = {
    parentElement: () => entry.boundsParent,
    firstNode: () => gxtEntryFirstNode(entry),
    lastNode: () => gxtEntryLastNode(entry),
  } as unknown as GlimmerRenderResult;
  const addRoot = () => {
    const rendererRoot: RendererRoot = {
      type: 'component',
      get result() {
        return rendered ? rootResult : undefined;
      },
      get destroyed() {
        return destroyed;
      },
      render() {
        // gxt updates the render in place.
      },
      destroy: doDestroy,
      isFor: () => false,
    };
    root = rendererRoot;
    GXT_ROOT_NODES.set(rendererRoot, captureRootNode);
    const renderer = rendererFor();
    // The render records its components and modifiers when its renderer has a
    // debug render tree, as Glimmer's environment records them in one.
    const rendererEnv = renderer.state.env as unknown as { gxtDebugRenderTree?: boolean };
    if (rendererEnv.gxtDebugRenderTree === true) {
      debugRoot = getGxtRenderer()?.debugRenderTree?.createRoot() ?? null;
    }
    renderer.state.renderRoot(rendererRoot);
    registerDestructor(rendererRoot, doDestroy);
  };

  try {
    addRoot();

    // Resolve template from COMPONENT_TEMPLATES
    let template = globalTemplates?.get(component);

    // Walk prototype chain if not found directly (for class-based components)
    if (!template && component) {
      let proto = Object.getPrototypeOf(component);
      while (proto && proto !== Function.prototype && proto !== Object.prototype) {
        template = globalTemplates?.get(proto);
        if (template) break;
        proto = Object.getPrototypeOf(proto);
      }
    }

    // If template is a factory function, call it with owner to get actual
    // template. A raw gxt template function renders as a gxt component.
    if (typeof template === 'function' && !template.render) {
      template = isRawGxtTemplateFn(template) ? rawGxtTemplate(template, entry) : template(owner);
    }

    // A component class with a component manager (its own or a base class's)
    // and no registered template: a class with a class-body `<template>`,
    // which gxt compiles to an instance field rather than a
    // `setComponentTemplate` call. gxt renders the class as it renders one
    // invoked in a template: the component manager creates the component and
    // renders that template (gxt-backend manager.ts).
    const classBodyComponent =
      !template &&
      typeof component === 'function' &&
      gxtCustomComponentManagerFactory(component) !== undefined;
    if (classBodyComponent) {
      template = rawGxtTemplate(component as (...args: unknown[]) => unknown, entry);
    }

    // A raw gxt template function that is the component itself, which no
    // component manager handles: a `<template>` expression
    // (`renderComponent(<template>…</template>)` in a `.gjs` module) is a
    // template-only component, and the compat compiler emits it as its
    // template function alone, with no definition around it. It renders as its
    // own template.
    const ownTemplateComponent =
      !template &&
      isRawGxtTemplateFn(component) &&
      (globalThis as any).$_MANAGERS?.component?.canHandle?.(component) !== true;
    if (ownTemplateComponent) {
      template = rawGxtTemplate(component as (...args: unknown[]) => unknown, entry);
    }

    if (!template || !template.render) {
      // No template found — try using the manager system directly
      const managers = (globalThis as any).$_MANAGERS;
      if (managers?.component?.canHandle?.(component)) {
        // The root arguments, read as Glimmer reads them (see `rootArgGetter`).
        const gxtArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            Object.defineProperty(gxtArgs, key, {
              get: rootArgGetter(args, key),
              enumerable: true,
              configurable: true,
            });
          }
        }
        const handleResult = managers.component.handle(component, gxtArgs, null, { owner });
        let nodes: Node | null = null;
        if (typeof handleResult === 'function') {
          nodes = handleResult();
        } else {
          nodes = handleResult;
        }
        if (nodes instanceof Node) {
          if (targetElement instanceof Element) {
            // Insert before the cursor's `nextSibling`, or prepend (matches
            // the documented "subsequent renders are prepended" semantic) and
            // capture the inserted node as both firstNode and lastNode of
            // this entry so destroy can scope.
            const insertBefore = cursorNextSibling ?? targetElement.firstChild;
            entry.boundsParent = targetElement;
            entry.boundsBefore =
              insertBefore === null ? targetElement.lastChild : insertBefore.previousSibling;
            entry.boundsAfter = insertBefore;
            targetElement.insertBefore(nodes, insertBefore);
            entry.firstNode = nodes;
            entry.lastNode = nodes;
          } else {
            (targetElement as Element).appendChild(nodes);
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('[renderComponent GXT] No GXT template found for component:', component);
      }
      gxtRenderPass().flushRenderErrors(renderErrorMark);
      rendered = true;

      const result: RenderResult = { destroy: doDestroy };
      entry.result = result;
      if (targetState) {
        targetState.entries.unshift(entry);
      }
      // Register destructor on owner so owner.destroy() cleans up DOM. An
      // owner that is being destroyed throws, as classic's
      // `associateDestroyableChild(owner, root)` does.
      registerDestructor(owner, doDestroy);
      return result;
    }

    // A root render invokes its component dynamically, as Glimmer's
    // VIRTUAL_ROOT_SCOPE opcode does: when the component's internal manager has
    // the `hasSubOwner` capability, the manager creates the component with the
    // caller's owner, and what the component renders sees
    // `manager.getOwner(state)` as its owner (the components it creates, the
    // components, helpers and services looked up in it). Its `this` is the
    // manager's self; this renders the template with no component, as a
    // template-only component. Glimmer passes the manager VM arguments only
    // for `createArgs`, which a GXT render has none of.
    const subOwnerManager = gxtSubOwnerComponentManager(component);
    if (subOwnerManager !== undefined) {
      const state = subOwnerManager.create(owner, component, null, {}, null, null, false);
      renderOwner = subOwnerManager.getOwner(state);
      subOwnerDestroyable = subOwnerManager.getDestroyable(state) ?? null;
      setAmbientOwner(renderOwner);
    }

    // A definition with a custom component manager (a class or a plain
    // object) renders the context its manager creates; a class without one is
    // instantiated; anything else is template-only and renders with `{}`.
    const isClass = typeof component === 'function' && component.prototype;
    const customManagerFactory = gxtCustomComponentManagerFactory(component);
    const isTemplateOnly =
      subOwnerManager !== undefined ||
      classBodyComponent ||
      ownTemplateComponent ||
      (!isClass && !customManagerFactory) ||
      (component as any).__templateOnly === true ||
      getGxtRenderer()?.compilePipeline.isTemplateOnlyDefinition?.(component) === true ||
      getGxtRenderer()?.registries.internalManagers.has(component) === true;

    let instance: any = null;

    // The component is created as part of the render, as Glimmer creates it in
    // the render transaction: what its constructor writes (a tracked field, a
    // `trackedArray` it pushes to) is the state the render starts from, not a
    // change for the next sync to render again.
    const createComponentInstance = () => {
      if (!isTemplateOnly) {
        const ComponentClass = component as any;

        if (customManagerFactory) {
          const manager = customManagerFactory(owner);
          if (manager && typeof manager.createComponent === 'function') {
            customManager = manager;
            // The named args are read lazily, like Glimmer's args proxy.
            const namedArgs: Record<string, unknown> = {};
            if (args) {
              for (const key of Object.keys(args)) {
                Object.defineProperty(namedArgs, key, {
                  get: rootArgGetter(args, key),
                  enumerable: true,
                  configurable: true,
                });
              }
            }
            customComponent = manager.createComponent(component, {
              named: namedArgs,
              positional: [],
            });
            instance = customComponent;
            // Get the rendering context from the manager
            if (typeof manager.getContext === 'function') {
              const ctx = manager.getContext(customComponent);
              if (ctx && ctx !== instance) {
                // Use the manager's context as the render context
                instance = ctx;
              }
            }
          }
        }

        if (!instance && isClass) {
          if (typeof ComponentClass.create === 'function') {
            instance = ComponentClass.create(Object.assign({}, args || {}, { owner }));
          } else {
            instance = new ComponentClass(owner, args || {});
          }
        }

        // Set args on Glimmer-style components
        if (instance && args) {
          if (!instance.args) {
            instance.args = {};
          }
          // Use Object.keys + defineProperty instead of Object.entries to avoid
          // eagerly evaluating arg getters. Arg getters may have side effects
          // (e.g., tracking steps in tests) and should only be called lazily.
          for (const key of Object.keys(args)) {
            Object.defineProperty(instance.args, key, {
              get: rootArgGetter(args, key),
              enumerable: true,
              configurable: true,
            });
          }
        }
      }
    };
    const withCurrentlyRendering = getGxtRenderer()?.compilePipeline.withCurrentlyRendering;
    if (typeof withCurrentlyRendering === 'function') {
      withCurrentlyRendering(createComponentInstance);
    } else {
      createComponentInstance();
    }
    rootInstance = instance;

    // Build render context with reactive arg getters
    const renderContext: any = instance || {};
    if (args) {
      // For template-only components, args go directly on the context as getters
      if (!instance) {
        for (const key of Object.keys(args)) {
          Object.defineProperty(renderContext, key, {
            get: rootArgGetter(args, key),
            enumerable: true,
            configurable: true,
          });
        }
      }
      // The args object the template reads `@foo` from (see `rootArgGetter`).
      const argsObj: any = {};
      for (const key of Object.keys(args)) {
        Object.defineProperty(argsObj, key, {
          get: rootArgGetter(args, key),
          enumerable: true,
          configurable: true,
        });
      }
      renderContext.args = argsObj;
    }
    if (!customManager) {
      renderContext.owner = renderOwner;
    } else if (!('owner' in renderContext)) {
      // A custom manager's context is its own object: it keeps an `owner` it
      // already has, and the one added here is not enumerable.
      Object.defineProperty(renderContext, 'owner', {
        value: owner,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }

    // Render inside `withRendering` so GXT formulas created during
    // template.render() properly track cell dependencies (e.g., trackedObject
    // cells). It is a depth counter, so nested renders are handled correctly.
    //
    // The render updates in place: a binding re-evaluates when what it read
    // changes, as Glimmer's revalidation re-runs only the opcodes whose tags
    // changed. Nothing renders the root again, and a render made while another
    // one is in progress (a nested `renderComponent`) is as live as any other.
    //
    // What it renders is recorded under its own debug render tree node, or not
    // at all (a render made during another one is not part of that one's tree).
    const _withRendering = getGxtRenderer()?.compilePipeline.withRendering;
    const debugRenderTree = getGxtRenderer()?.debugRenderTree;
    const renderRegion = () =>
      debugRenderTree === undefined
        ? renderIntoRegion(template, renderContext)
        : debugRenderTree.renderWith(debugRoot, () => renderIntoRegion(template, renderContext));
    if (typeof _withRendering === 'function') {
      _withRendering(renderRegion);
    } else {
      renderRegion();
    }

    // Flush queued didInsertElement / didRender hooks. What a hook throws
    // aborts the render (below), as a hook error in Glimmer's commit does.
    gxtRenderPass().flushAfterInsertQueue();
    // didCreateComponent runs once the render and its children's hooks are
    // done, as Glimmer's transaction commit runs it.
    if (
      customManager?.capabilities?.asyncLifecycleCallbacks &&
      typeof customManager.didCreateComponent === 'function'
    ) {
      customManager.didCreateComponent(customComponent);
    }
    gxtRenderPass().flushRenderErrors(renderErrorMark);
    rendered = true;
  } catch (error) {
    // The caller receives this error and no result, so nothing can destroy
    // this render: what it rendered before the error is destroyed here, and
    // its root leaves its renderer. (A classic root whose render failed stops
    // rendering too, see errorLoopTransaction.)
    destroyed = true;
    entry.teardownRendered?.();
    destroyRenderTree();
    if (root !== null) {
      destroy(root);
    }
    // The queue can hold a copy of the caller's error (several sites queue an
    // error and also throw it) or errors of this same aborted render; left
    // there, the next unrelated render would throw them.
    gxtRenderPass().dropRenderErrors(renderErrorMark);
    throw error;
  } finally {
    setAmbientOwner(prevOwner);
  }

  const result: RenderResult = { destroy: doDestroy };
  entry.result = result;
  if (targetState) {
    targetState.entries.unshift(entry);
  }

  // Register destructor on owner so that destroying the owner cleans up the DOM.
  // An owner that is being destroyed throws, as classic's
  // `associateDestroyableChild(owner, root)` does.
  registerDestructor(owner, doDestroy);

  return result;
}
