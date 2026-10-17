// gxt NATIVE layer — the `$_MANAGERS.modifier` slot.
//
// Under NATIVE_FLAGS.EMBER_NATIVE every element modifier compiles to
//   $n => $_maybeModifier(definition, $n, [args], {named}, ctx)
// with literal-or-thunk arguments. gxt evaluates that inside its own
// element-creation formula; since the arguments are thunks it tracks only the
// modifier DEFINITION (a changed definition — `{{(if c (modifier x))}}`,
// `{{this.modifier}}` — re-creates the modifier, Glimmer parity) and keeps the
// destructor `handle` returns.
//
// Lifecycle (Glimmer's environment transaction):
//   - `handle` (element creation): resolve the definition (curried modifier →
//     Glimmer argument rules), create the modifier (`createModifier` /
//     internal `create`) and SCHEDULE its install;
//   - commit (`commitModifiers`, after the render pass / after a root is
//     inserted — the element is in the document by then): install inside a
//     gxt `effect`, which records what the modifier consumed (arguments read
//     through the lazy args proxy, tracked state read by the modifier);
//   - a consumed value changes → the effect re-runs during the next render
//     pass, which only SCHEDULES an update; the update runs at that pass's
//     commit, again inside a fresh tracking effect. `disableAutoTracking`
//     (3.22) runs install / update untracked (no updates, Glimmer parity);
//   - gxt removes the element → the destructor: tracking stops, a pending
//     install is dropped, and the modifier's state is destroyed through Ember
//     destroyables (`destroyModifier` / listener removal run on the run loop,
//     Glimmer parity).
//
// Non-interactive render trees (`renderComponent(…, { env: { isInteractive:
// false } })`, a non-interactive app environment) create no modifiers at all.
import { DEBUG } from '@glimmer/env';
import { ENV } from '@ember/-internals/environment';
import {
  type CapturedRenderNode,
  effect,
  getContext,
  getCurried,
  getTracker,
  isRendering,
  resolveCurried,
  setTracker,
} from '@lifeart/gxt';
import {
  argsProxyFor,
  namedSource,
  shiftLabels,
  unwrapArg,
  type ArgLabels,
  type ArgsSource,
  type Arguments,
} from './args';
import { destroy, registerDestructor } from './destroyable';
import {
  CustomModifierManager,
  getInternalModifierManager,
  type ModifierDelegate,
} from './manager-api';
import { ownerOfContext } from './managers';
import { lookupModifier, modifierNotFound } from './resolver';
import { type InternalModifierManager } from './runtime-helpers';
import { debug, untrack } from './validator';

/** gxt context key: `false` on render roots whose modifiers must not run. */
export const INTERACTIVE: unique symbol = Symbol('ember-native-interactive');

/**
 * One element modifier: its element, the state destroyed (Ember destroyable)
 * when it is removed, its commit state, and how it installs / updates. A
 * class, so that `install` and `update` are prototype methods: a modifier
 * holds no closures of its own.
 */
abstract class ModifierInstance {
  installed = false;
  scheduled = false;
  removed = false;
  stopTracking: (() => void) | null = null;

  constructor(
    readonly element: Element,
    readonly state: object
  ) {}

  abstract install(): void;
  abstract update(): void;
}

/** A modifier of a native internal manager (`on`). */
export class InternalModifierInstance extends ModifierInstance {
  constructor(
    element: Element,
    private readonly manager: InternalModifierManager,
    private readonly internalState: object
  ) {
    super(element, manager.getDestroyable(internalState));
  }

  install(): void {
    this.manager.install(this.internalState);
  }

  update(): void {
    this.manager.update(this.internalState);
  }
}

/**
 * A modifier of a public custom manager (`setModifierManager`, capabilities
 * 3.22). `untracked`: the manager's `disableAutoTracking`, install / update
 * run untracked.
 */
export class CustomModifierInstance extends ModifierInstance {
  constructor(
    element: Element,
    state: object,
    private readonly delegate: ModifierDelegate,
    private readonly modifier: unknown,
    private readonly args: Arguments,
    private readonly untracked: boolean
  ) {
    super(element, state);
  }

  install(): void {
    if (this.untracked) {
      untrack(() => this.delegate.installModifier(this.modifier, this.element, this.args));
    } else {
      this.delegate.installModifier(this.modifier, this.element, this.args);
    }
  }

  update(): void {
    if (this.untracked) {
      untrack(() => this.delegate.updateModifier(this.modifier, this.args));
    } else {
      this.delegate.updateModifier(this.modifier, this.args);
    }
  }
}

// ---------------------------------------------------------------- commit queue
let pending: ModifierInstance[] = [];

function schedule(instance: ModifierInstance): void {
  if (instance.scheduled || instance.removed) return;
  instance.scheduled = true;
  pending.push(instance);
}

function run(instance: ModifierInstance): void {
  instance.stopTracking?.();
  instance.stopTracking = null;
  // The install / update runs in its own tracking frame: the cells it
  // consumed are all a later re-run depends on. A modifier that consumed
  // nothing — an {{on}} whose handler is a class field or an `fn` — can never
  // need an update, so it gets no effect at all.
  const consumed = new Set<{ value: unknown }>();
  const prior = getTracker();
  setTracker(consumed as never);
  try {
    if (instance.installed) {
      instance.update();
    } else {
      instance.installed = true;
      instance.install();
    }
  } finally {
    setTracker(prior);
  }
  if (consumed.size === 0) return;
  // Bound to exactly those cells until the next commit replaces it (its
  // teardown unbinds them all); a change only SCHEDULES the update.
  let subscribed = false;
  instance.stopTracking = effect(() => {
    for (const cell of consumed) void cell.value;
    if (subscribed) schedule(instance);
    subscribed = true;
  });
}

/**
 * Install / update the scheduled modifiers. Called after a render root is
 * inserted and after every render pass (native/renderer.ts, host-hooks.ts) —
 * never while gxt is rendering (a root rendered from inside a pass leaves its
 * modifiers to that pass's commit, when every new element is in place).
 */
export function commitModifiers(): void {
  if (isRendering()) return;
  while (pending.length > 0) {
    const queue = pending;
    pending = [];
    for (const instance of queue) {
      instance.scheduled = false;
      if (!instance.removed) runInTransaction(instance);
    }
  }
}

/**
 * DEV: an install / update runs in its own tracking transaction (Glimmer runs
 * modifiers inside the render transaction), so a modifier that READS a value
 * and then WRITES it gets the backtracking assertion. Its own transaction, not
 * the closed render pass's: writing state the render consumed schedules a new
 * pass, as before.
 */
function runInTransaction(instance: ModifierInstance): void {
  if (!DEBUG) {
    run(instance);
    return;
  }
  let failed = true;
  try {
    debug.runInTrackingTransaction!(
      () => debug.runInTrackingTransaction!(() => run(instance), MODIFIER_LABEL),
      '- While rendering:'
    );
    failed = false;
  } finally {
    if (failed) debug.resetTrackingTransaction!();
  }
}

const MODIFIER_LABEL = '(modifier)';

function remove(instance: ModifierInstance): void {
  if (instance.removed) return;
  instance.removed = true;
  instance.stopTracking?.();
  instance.stopTracking = null;
  destroy(instance.state);
}

// ---------------------------------------------------------------- debug render tree
// Glimmer lists every element modifier in the debug render tree, as a
// `modifier` node under the component rendering the element
// (`ComponentElementOperations#addModifier`): its name, its arguments, the
// manager's debug instance and the element as its bounds. Glimmer records them
// only while the environment has a debug render tree (`ENV._DEBUG_RENDER_TREE`:
// DEBUG builds, or the Inspector's opt-in); so does this layer — and with it
// off nothing here runs. Entries are keyed by the gxt render context the
// element was created in (native/renderer.ts attaches them to that context's
// render node) and dropped when the modifier's state is destroyed (Glimmer's
// `willDestroy` destructor on the same state).
interface DebugModifier {
  readonly id: string;
  readonly name: string;
  readonly element: Element;
  readonly source: ArgsSource;
  readonly instance: unknown;
}

const DEBUG_MODIFIERS = new WeakMap<object, Set<DebugModifier>>();
// A custom manager's modifier (its debug instance), by the instance's state.
const DEBUG_INSTANCES = new WeakMap<object, unknown>();
let debugModifierId = 0;

function recordDebugModifier(
  ctx: object,
  instance: ModifierInstance,
  definition: object,
  resolvedName: string | null,
  source: ArgsSource
): void {
  const manager = getInternalModifierManager(definition) as
    | CustomModifierManager
    | InternalModifierManager;
  const custom = manager instanceof CustomModifierManager;
  const entry: DebugModifier = {
    id: `modifier:${++debugModifierId}`,
    // Glimmer: `definition.resolvedName ?? manager.getDebugName(definition.state)`.
    name:
      resolvedName ??
      (custom
        ? typeof definition === 'function'
          ? (definition as { name?: string }).name || definition.toString()
          : '<unknown>'
        : manager.getDebugName()),
    element: instance.element,
    source,
    // Glimmer `getDebugInstance`: a custom manager's modifier, `null` for `on`.
    instance: custom ? (DEBUG_INSTANCES.get(instance.state) ?? null) : null,
  };
  let entries = DEBUG_MODIFIERS.get(ctx);
  if (entries === undefined) {
    entries = new Set();
    DEBUG_MODIFIERS.set(ctx, entries);
  }
  const live = entries;
  live.add(entry);
  registerDestructor(instance.state, () => live.delete(entry));
}

/**
 * The debug render tree's `modifier` nodes for the elements rendered in the
 * gxt render context `ctx` (Glimmer's `CapturedRenderNode` shape; arguments
 * read now, untracked — Glimmer reifies them at capture).
 */
export function debugModifierNodes(ctx: object): CapturedRenderNode[] {
  const entries = DEBUG_MODIFIERS.get(ctx);
  if (entries === undefined || entries.size === 0) return [];
  const nodes: CapturedRenderNode[] = [];
  for (const entry of entries) {
    const { element, source } = entry;
    const parentElement = element.parentNode;
    nodes.push({
      id: entry.id,
      type: 'modifier',
      name: entry.name,
      args: untrack(() => {
        const named: Record<string, unknown> = {};
        for (const key of Object.keys(source.named)) named[key] = unwrapArg(source.named[key]);
        return { positional: source.positional.map(unwrapArg), named };
      }),
      instance: entry.instance,
      template: null,
      bounds:
        parentElement === null ? null : { parentElement, firstNode: element, lastNode: element },
      children: [],
    });
  }
  return nodes;
}

// ---------------------------------------------------------------- create
function createInstance(
  definition: object,
  element: Element,
  source: ArgsSource,
  ownerFor: () => object | undefined
): ModifierInstance {
  const manager = getInternalModifierManager(definition) as
    | CustomModifierManager
    | InternalModifierManager
    | undefined;
  if (manager === undefined) {
    throw new Error(
      DEBUG
        ? `Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. The definition was: ${
            typeof definition === 'function'
              ? (definition as { name?: string }).name || '(anonymous function)'
              : String(definition)
          }`
        : 'BUG: modifier manager expected'
    );
  }

  if (manager instanceof CustomModifierManager) {
    const args = argsProxyFor(source, 'modifier');
    const delegate = manager.getDelegateFor(ownerFor()) as ModifierDelegate;
    const modifier = delegate.createModifier(definition, args);
    const state = {};
    registerDestructor(state, () => delegate.destroyModifier(modifier, args));
    if (ENV._DEBUG_RENDER_TREE) DEBUG_INSTANCES.set(state, modifier);
    return new CustomModifierInstance(
      element,
      state,
      delegate,
      modifier,
      args,
      delegate.capabilities.disableAutoTracking === true
    );
  }

  // Native internal modifier manager (`on`): it reads the call site's
  // literal-or-thunk arguments itself and does not use the owner.
  return new InternalModifierInstance(
    element,
    manager,
    manager.create(element, definition, source)
  );
}

// ---------------------------------------------------------------- the slot
function canHandle(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const type = typeof value;
  // Every function / object is claimed — one without a manager must fail
  // loudly (Glimmer's assertion), never fall through to gxt's function
  // modifier path (which would silently do nothing in an Ember build).
  return type === 'function' || type === 'object' || type === 'string';
}

function handle(
  modifier: unknown,
  element: Element,
  props: readonly unknown[],
  named: Readonly<Record<string, unknown>> | (() => Readonly<Record<string, unknown>>) | undefined,
  ctx?: unknown,
  // gxt EMBER_ARG_LABELS (DEBUG builds): the source paths of the arguments.
  labels?: ArgLabels
): (() => void) | undefined {
  const renderCtx = ctx !== null && typeof ctx === 'object' ? ctx : undefined;
  if (renderCtx !== undefined && getContext(renderCtx as never, INTERACTIVE, false) === false) {
    return undefined;
  }

  let definition: unknown = modifier;
  let positional = props;
  let namedArgs = namedSource(typeof named === 'function' ? named() : named);

  if (getCurried(modifier) !== undefined) {
    const resolved = resolveCurried(modifier);
    definition = resolved.definition;
    if (resolved.positional.length > 0) positional = [...resolved.positional, ...props];
    if (resolved.named.length > 0) {
      namedArgs = namedSource(Object.assign({}, ...resolved.named, namedArgs));
    }
    labels = shiftLabels(labels, resolved.positional.length);
  }

  // The render tree's owner — looked up only when it is used (a modifier
  // name, a custom manager's delegate).
  const ownerFor = (): object | undefined => ownerOfContext(renderCtx);

  // A modifier NAME (`{{on}}`, a loose-mode `<div {{foo-bar}}>`):
  // classic `lookupModifier` for the render tree's owner.
  let resolvedName: string | null = null;
  if (typeof definition === 'string') {
    const resolved = lookupModifier(ownerFor() as Parameters<typeof lookupModifier>[0], definition);
    if (resolved === null) throw modifierNotFound(definition);
    resolvedName = definition;
    definition = resolved;
  }
  if (definition === null || definition === undefined) return undefined;

  const source: ArgsSource = { positional, named: namedArgs, labels };
  const instance = createInstance(definition as object, element, source, ownerFor);
  if (ENV._DEBUG_RENDER_TREE && renderCtx !== undefined) {
    recordDebugModifier(renderCtx, instance, definition as object, resolvedName, source);
  }
  schedule(instance);
  return () => remove(instance);
}

/** The `$_MANAGERS.modifier` slot (registered by native/install.ts). */
export const modifierManager = {
  canHandle,
  handle: handle as (
    modifier: unknown,
    element: Element,
    props: unknown[],
    hashArgs: () => Record<string, unknown>
  ) => unknown,
};
