// gxt NATIVE layer — the host manager tables gxt consults through
// `registerHostManagers`: the COMPONENT slot (including Ember internal
// components such as LinkTo). Helper and modifier slots live in
// helper-manager.ts / modifier-manager.ts.
//
// How gxt renders a component: `$_c(Def, args, ctx)` → `_component` asks
// `$_MANAGERS.component.canHandle(Def)`; when true, `handle(Def, args, fw, ctx)`
// returns what gxt then CONSTRUCTS (`new X(args, fw)`): either a gxt template
// function (rendered directly) or a constructor-shaped factory whose result has
// a `[$template]`. gxt adds that instance to its render tree, runs
// `instance[$template](args)` with `this` = instance, and later tears the tree
// down, running the destructors registered on each node. So the manager here
// only adapts Ember's component-manager protocol to that shape:
//
//   - canHandle: definitions with a component manager (prototype walk — the
//     @glimmer/component class, any `setComponentManager` class) and
//     `templateOnly()` definitions. NOT gxt template functions (`.gjs`
//     template-only components): gxt renders those natively, fewest hops.
//   - handle (custom manager, e.g. @glimmer/component): a factory that, per
//     INVOCATION, creates the component through the per-owner manager delegate
//     (`createComponent(Def, {named: args, positional: []})` — `args` is gxt's
//     lazy, autotracked args object, so `this.args.x` subscribes the reading
//     formula), gives the template context a gxt tree id, sets its template
//     (own registration > class-body `<template>` > inherited registration >
//     Glimmer's default `{{yield}}`), and registers a gxt destructor that calls `destroyComponent`
//     (Glimmer manager: willDestroy + Ember `destroy()` + isDestroying /
//     isDestroyed on the runloop) when gxt removes the node.
//   - handle (templateOnly definition): its registered template function, else
//     Glimmer's default `{{yield}}`.
//   - handle (Ember INTERNAL component manager — LinkTo's InternalComponent):
//     per invocation, the classic `InternalManager.create` with Glimmer's
//     captured-arguments shape (one compute ref per named argument over gxt's
//     lazy args), the instance itself as the template context (`getSelf`), the
//     registered AOT template (native/templates/link-to.gts) as its
//     `[$template]`, and a gxt destructor that runs Ember `destroy` on
//     `getDestroyable(instance)`.
//
// The owner comes from the gxt render context (`OWNER`, provided on every
// render root by native/renderer.ts) — the nearest provider up the tree.
import { DEBUG } from '@glimmer/env';
import {
  $_GET_ARGS,
  $_GET_FW,
  $_GET_SLOTS,
  $_fin,
  $_slot,
  $_tag,
  $PROPS_SYMBOL,
  $SELF,
  $SLOTS_SYMBOL,
  $template,
  cId,
  COMPONENT_ID_PROPERTY,
  getContext,
  getCurried,
  isTemplateFn,
  registerDestructor as gxtRegisterDestructor,
  resolveCurried,
} from '@lifeart/gxt';
import { nearestTemplateKind } from '../utils';
import { argsProxyFor, unwrapArg } from './args';
import { trackComponent, type LifecycleDelegate } from './component-lifecycle';
import { destroy } from './destroyable';
import {
  CustomComponentManager,
  getComponentTemplate,
  getInternalComponentManager,
  getOwnComponentTemplate,
} from './manager-api';
import { createComputeRef, createConstRef, type Reference, valueForRef } from './reference';
import { componentNotFound, lookupComponent } from './resolver';
import ClassicComponentStub from './stubs/component';
import { documentedDrop } from './not-implemented';
import { TemplateOnlyComponentDefinition } from './template-only';
import { templateFor, type GxtTemplate } from './template-factory';

/** gxt context key for the Ember owner of a render tree (provided on roots). */
export const OWNER: unique symbol = Symbol('ember-native-owner');

interface ComponentDelegate {
  capabilities: { destructor?: boolean };
  createComponent(
    definition: object,
    args: { named: object; positional: readonly unknown[] }
  ): object;
  getContext(component: object): object;
  destroyComponent?(component: object): void;
}

// Glimmer's InternalComponentManager (`WithCreateInstance`) — the part the
// classic `InternalManager` (components/internal.ts) implements and uses.
interface InternalComponentManager {
  create(
    owner: object,
    definition: object,
    args: { capture(): CapturedArguments },
    env: null,
    dynamicScope: null,
    caller: Reference
  ): object;
  getSelf(instance: object): Reference;
  getDestroyable(instance: object): object | null;
}

// A `wrapped` internal manager (Glimmer's WrappedCapability) renders its layout
// inside an element whose tag name it chooses per instance.
interface WrappedComponentManager extends InternalComponentManager {
  getCapabilities(): { wrapped?: boolean };
  getTagName(instance: unknown): string | null;
}

interface CapturedArguments {
  named: Record<string, Reference>;
  positional: Reference[];
}

type ComponentNode = Record<PropertyKey, unknown> & object;
type InternalOwnerLike = Parameters<typeof lookupComponent>[0];

const EMPTY_POSITIONAL: unknown[] = Object.freeze([]) as unknown as unknown[];

/** The Ember owner of the render tree `ctx` belongs to (nearest OWNER provider). */
export function ownerOfContext(ctx: unknown): object | undefined {
  if (ctx === null || ctx === undefined) return undefined;
  return getContext<object>(ctx as never, OWNER, false) ?? undefined;
}

// `ownerOfContext`, which must exist for a component render.
function ownerFor(ctx: object): object {
  const owner = ownerOfContext(ctx);
  if (owner === undefined) {
    throw new Error(
      'native component manager: no Ember owner in this render tree. Render through `renderComponent` from `@ember/renderer` (or an Ember application), which provides one.'
    );
  }
  return owner;
}

// What a curried component with no definition renders: nothing.
function EMPTY_TEMPLATE(this: object): unknown {
  $_GET_ARGS(this as never, arguments);
  return $_fin([], this as never);
}

// Glimmer's template for a component that has none (no registered or
// class-body template): `{{yield}}` (program/lib/constants.ts
// `defaultTemplate`, for every manager without `dynamicLayout` — template-only,
// custom and Ember's internal managers).
function DEFAULT_TEMPLATE(this: object): unknown {
  $_GET_ARGS(this as never, arguments);
  const slots = $_GET_SLOTS(this, arguments);
  // @ts-expect-error -- gxt types $_slot's result outside the roots $_fin takes
  return $_fin([$_slot('default', () => [], slots, this as never)], this as never);
}

function resolveTemplate(value: unknown, owner: object, definition: object): GxtTemplate {
  const template = templateFor(value, owner);
  if (template === undefined) {
    throw new Error(
      `native component manager: the template registered for \`${nameOfDefinition(definition)}\` is not a gxt template (compile it with the gxt compiler).`
    );
  }
  return template;
}

// ---------------------------------------------------------------- names
// Template context (gxt node) → its Ember component definition, and template
// function → the templateOnly() definition it renders (resolveComponentName).
const DEFINITION_OF_NODE = new WeakMap<object, object>();
// Render node → the custom-manager component it renders (the Inspector's
// `instance`; differs from the node when the node is a fresh `$SELF` node).
const INSTANCE_OF_NODE = new WeakMap<object, object>();

/**
 * The Inspector `instance` of a render node: the custom-manager component it
 * renders, `null` for a template-only component (Glimmer has no instance), else
 * the node itself (a Glimmer / internal component instance).
 */
export function instanceOfNode(node: object): object | null {
  const component = INSTANCE_OF_NODE.get(node);
  if (component !== undefined) return component;
  return isTemplateFn((node as { constructor?: unknown }).constructor) ? null : node;
}
const DEFINITION_OF_TEMPLATE = new WeakMap<object, object>();
// Per rendered NODE (wins over the definition's name): the route name of a
// route template rendered by an outlet (one template function can serve several
// routes — `templateName`, the shared default `{{outlet}}` template), `main`
// for an outlet, `{ROOT}` for a renderComponent root (native/renderer.ts).
const NODE_NAMES = new WeakMap<object, string>();

/** Name one rendered component node for the Inspector (native/outlet.ts). */
export function nameNode(node: object, name: string): void {
  NODE_NAMES.set(node, name);
}

// The name a strict-mode template's scope gives a definition, as Glimmer (in
// DEBUG) names a component invoked through a lexical variable by that variable.
// Fills the gap for a `precompileTemplate(..., { scope })` value (an anonymous
// `templateOnly()`), whose only name is its binding; a gjs template bakes the
// name in itself. The first name wins, as Glimmer keeps the first it assigns.
const LEXICAL_NAMES = new WeakMap<object, string>();

/** Record the names a strict-mode template's scope gives its values. */
export function recordLexicalNames(scope: Readonly<Record<string, unknown>>): void {
  for (const name of Object.keys(scope)) {
    const value = scope[name];
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !LEXICAL_NAMES.has(value)
    ) {
      LEXICAL_NAMES.set(value, name);
    }
  }
}

function nameOfDefinition(definition: object): string {
  if (definition instanceof TemplateOnlyComponentDefinition) {
    return definition.name !== '(unknown template-only component)'
      ? definition.name
      : definition.moduleName;
  }
  if (typeof definition === 'function' && definition.name) return definition.name;
  return String(definition);
}

/**
 * gxt `resolveComponentName` host hook (captureRenderTree / Inspector): the
 * Ember definition's name for component nodes this layer created and for gxt
 * template-function components; `undefined` for gxt-internal nodes (if / each /
 * slots / roots), so gxt's keyword naming still applies to them.
 */
export function resolveComponentName(node: object): string | undefined {
  // Name precedence: an explicit node name ({ROOT} / outlet / route) wins over
  // the lexical scope name, which wins over the definition's own name.
  const nodeName = NODE_NAMES.get(node);
  if (nodeName !== undefined) return nodeName;
  const definition = DEFINITION_OF_NODE.get(node);
  if (definition !== undefined) {
    return LEXICAL_NAMES.get(definition) ?? nameOfDefinition(definition);
  }
  const ctor = (node as { constructor?: unknown }).constructor;
  if (isTemplateFn(ctor)) {
    const templateOnly = DEFINITION_OF_TEMPLATE.get(ctor as object);
    if (templateOnly !== undefined) {
      return LEXICAL_NAMES.get(templateOnly) ?? nameOfDefinition(templateOnly);
    }
    return (ctor as { name?: string }).name || undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------- curried
// A curried component (`(component X a=1)`): Glimmer argument rules —
// the curried layers' named arguments (inner → outer, later wins) under the
// invocation's own arguments (which win); the invocation's blocks and
// forwarded attributes. Values stay lazy (literal-or-thunk / gxt arg getters).
function mergeCurriedArgs(
  layers: ReadonlyArray<Readonly<Record<string, unknown>>>,
  args: Record<PropertyKey, unknown>
): Record<PropertyKey, unknown> {
  const merged: Record<PropertyKey, unknown> = {};
  Object.defineProperty(merged, $SLOTS_SYMBOL, { value: args[$SLOTS_SYMBOL] });
  Object.defineProperty(merged, $PROPS_SYMBOL, {
    value: args[$PROPS_SYMBOL],
    configurable: true,
    writable: true,
  });
  for (const layer of layers) {
    for (const key of Object.keys(layer)) {
      Object.defineProperty(merged, key, {
        get: () => unwrapArg(layer[key]),
        enumerable: true,
        configurable: true,
      });
    }
  }
  for (const key of Object.keys(args)) {
    Object.defineProperty(merged, key, {
      get: () => args[key],
      enumerable: true,
      configurable: true,
    });
  }
  return merged;
}

function handleCurried(curried: object, args: object, fw: unknown, ctx: object): unknown {
  const { definition: curriedDefinition, positional, named } = resolveCurried(curried);
  // `(component "foo-bar")` (loose mode) / a component-or-helper resolved by
  // name with positional arguments (`$_looseAppend`): the registered component.
  const name = typeof curriedDefinition === 'string' ? curriedDefinition : null;
  const definition = name === null ? curriedDefinition : resolveByName(name, ctx);
  const merged = mergeCurriedArgs(named, args as Record<PropertyKey, unknown>);
  if (definition === null || definition === undefined) return EMPTY_TEMPLATE;
  let resolved: unknown;
  if (canHandle(definition)) {
    resolved = handle(definition as object, merged, fw, ctx, positional);
    // A manager factory closes over `merged`; a template function is
    // constructed by gxt with the INVOCATION args — hand it the merged ones.
    if (isTemplateFn(resolved) || resolved === DEFAULT_TEMPLATE || resolved === EMPTY_TEMPLATE) {
      resolved = curriedTemplate(resolved as GxtTemplate, merged);
    }
  } else {
    // a gxt template function (template-only `.gjs` component)
    resolved = curriedTemplate(definition as GxtTemplate, merged);
  }
  return name === null ? resolved : namedByLookup(resolved, name);
}

// ---------------------------------------------------------------- by name
/**
 * Loose mode: the component registered as `component:<name>` for the
 * render tree's owner, or Glimmer's "nothing was found" error.
 */
function resolveByName(name: string, ctx: object): object {
  const definition = lookupComponent(ownerFor(ctx) as InternalOwnerLike, name);
  if (definition === null) throw componentNotFound(name);
  if (
    typeof definition === 'function' &&
    (definition as { prototype?: unknown }).prototype instanceof ClassicComponentStub
  ) {
    // a classic `@ember/component` subclass registered by name
    documentedDrop(
      'Classic `@ember/component` Component',
      'Use @glimmer/component (or a template-only component) instead.'
    );
  }
  if (!canHandle(definition) && !isTemplateFn(definition)) {
    throw new Error(
      DEBUG
        ? `Attempted to load a component, but there wasn't a component manager associated with the definition. The definition was: ${nameOfDefinition(definition)}`
        : 'BUG: component manager expected'
    );
  }
  return definition;
}

/**
 * A definition rendered BY NAME: the Inspector names its node with the
 * resolver name (classic: the name passed to `lookupComponent`, e.g. a loose
 * `<LinkTo>` is `link-to`) — per NODE, so the same class used lexically
 * elsewhere keeps its own name.
 */
function namedByLookup(resolved: unknown, name: string): unknown {
  const inner = resolved as new (args: unknown, fw: unknown) => object;
  return function NamedComponent(args: unknown, fw: unknown): object {
    const node = new inner(args, fw);
    NODE_NAMES.set(node, name);
    return node;
  };
}

function handleByName(name: string, args: object, fw: unknown, ctx: object): unknown {
  const definition = resolveByName(name, ctx);
  const resolved = canHandle(definition) ? handle(definition, args, fw, ctx) : definition;
  return namedByLookup(resolved, name);
}

function curriedTemplate(template: GxtTemplate, merged: object): unknown {
  return function CurriedTemplate(_args: unknown, fw: unknown): object {
    return new (template as unknown as new (a: unknown, f: unknown) => object)(merged, fw);
  };
}

// ---------------------------------------------------------------- component
function canHandle(definition: unknown): boolean {
  if (definition === null || definition === undefined) return false;
  const type = typeof definition;
  // A component NAME: a loose-mode by-name invocation (`$_c("foo-bar")`)
  // or a dynamic component whose value is a name (`{{component this.name}}`).
  if (type === 'string') return (definition as string).length > 0;
  if (type !== 'object' && type !== 'function') return false;
  if (definition instanceof TemplateOnlyComponentDefinition) return true;
  if (getCurried(definition) !== undefined) return true;
  if (isTemplateFn(definition)) return false;
  return getInternalComponentManager(definition as object) !== undefined;
}

function handle(
  definition: object | string,
  args: object,
  fw: unknown,
  ctx: object,
  positional: readonly unknown[] = EMPTY_POSITIONAL
): unknown {
  if (typeof definition === 'string') return handleByName(definition, args, fw, ctx);
  if (getCurried(definition) !== undefined) return handleCurried(definition, args, fw, ctx);
  const owner = ownerFor(ctx);

  if (definition instanceof TemplateOnlyComponentDefinition) {
    const registered = getComponentTemplate(definition);
    const template =
      registered === undefined ? DEFAULT_TEMPLATE : resolveTemplate(registered, owner, definition);
    DEFINITION_OF_TEMPLATE.set(template, definition);
    return template;
  }

  const manager = getInternalComponentManager(definition);
  if (!(manager instanceof CustomComponentManager)) {
    if (isWrappedWithoutLayout(manager, definition)) {
      return wrappedComponent(manager, definition, args, ctx, owner, positional);
    }
    return internalComponent(manager, definition, args, ctx, owner, positional);
  }
  const delegate = manager.getDelegateFor(owner) as ComponentDelegate;
  const ownTemplate = getOwnComponentTemplate(definition);
  const inheritedTemplate =
    ownTemplate === undefined ? getComponentTemplate(definition) : undefined;
  // The nearest template wins, as in Glimmer: an inherited registration that
  // is nearer than the class-body `<template>` the instance inherits.
  const registrationIsNearer =
    inheritedTemplate !== undefined &&
    nearestTemplateKind(definition, (klass) => getOwnComponentTemplate(klass) !== undefined) ===
      'registered';

  // gxt constructs this per INVOCATION (`new NativeComponent(args, fw)`): every
  // invocation creates its own component through the manager.
  return function NativeComponent(): object {
    const captured = {
      named: args,
      positional:
        positional.length === 0
          ? EMPTY_POSITIONAL
          : argsProxyFor({ positional, named: {} }, 'component').positional,
    };
    const component = delegate.createComponent(definition, captured);
    // The template's `this` is `getContext(component)` (Glimmer's self) and its
    // `@args` are the invocation's arguments, read from the render node's
    // `args`. A Glimmer component's context already carries exactly these
    // arguments as `args` — it is its own render node. Any other context (an
    // EmberObject whose `args` is the manager's `{named, positional}`, a
    // manager-returned POJO, `null`) renders on a fresh node whose self
    // (`$SELF`) is the context, so gxt never writes onto it.
    const context = delegate.getContext(component);
    const hasContext =
      context !== null && (typeof context === 'object' || typeof context === 'function');
    let node: ComponentNode;
    if (hasContext && (context as { args?: unknown }).args === args) {
      node = context as ComponentNode;
    } else {
      node = { args } as ComponentNode;
      if (hasContext) node[$SELF] = context;
    }
    INSTANCE_OF_NODE.set(node, component);
    const untrack = trackComponent(delegate as LifecycleDelegate, component, captured);
    if (untrack !== null) gxtRegisterDestructor(node, untrack);
    // gxt tree identity BEFORE gxt adds the node to the render tree (a gxt
    // `Component` gets it as a class field; a manager-created instance does not).
    if (node[COMPONENT_ID_PROPERTY] === undefined) {
      node[COMPONENT_ID_PROPERTY] = cId();
    }
    if (ownTemplate !== undefined) {
      node[$template] = resolveTemplate(ownTemplate, owner, definition);
    } else if (registrationIsNearer) {
      node[$template] = resolveTemplate(inheritedTemplate, owner, definition);
    } else if (!($template in node)) {
      // no class-body `<template>`: inherited registration, else Glimmer's
      // default `{{yield}}`.
      node[$template] =
        inheritedTemplate === undefined
          ? DEFAULT_TEMPLATE
          : resolveTemplate(inheritedTemplate, owner, definition);
    }
    if (delegate.capabilities.destructor && typeof delegate.destroyComponent === 'function') {
      gxtRegisterDestructor(node, () => delegate.destroyComponent!(component));
    }
    DEFINITION_OF_NODE.set(node, definition);
    return node;
  };
}

// ---------------------------------------------------------------- internal
// Ember's own internal components (LinkTo; Input / Textarea are documented
// drops). Glimmer hands the InternalManager a CAPTURED argument set — one
// Reference per argument — and renders the registered layout with `self` =
// `getSelf(instance)`. Here every invocation captures its own refs over gxt's
// lazy args (`createComputeRef(() => args[k])`: a native createCache, so reading
// a ref inside a binding subscribes to exactly the argument cells it reads), so
// two invocations are two instances with their own ids / hrefs.
function internalComponent(
  manager: InternalComponentManager,
  definition: object,
  args: object,
  ctx: object,
  owner: object,
  positional: readonly unknown[]
): unknown {
  const registered = getComponentTemplate(definition);
  const template =
    registered === undefined ? DEFAULT_TEMPLATE : resolveTemplate(registered, owner, definition);
  const source = args as Record<string, unknown>;

  return function NativeInternalComponent(): object {
    const instance = createInternal(manager, definition, source, ctx, owner, positional);
    const node = valueForRef(manager.getSelf(instance)) as ComponentNode;
    if (node[COMPONENT_ID_PROPERTY] === undefined) {
      node[COMPONENT_ID_PROPERTY] = cId();
    }
    node[$template] = template;
    // captureRenderTree reads `_debug_args` (gxt `$_debug_args`) before `args`;
    // an InternalComponent's own `args` field holds the captured References,
    // so hand the Inspector the plain invocation arguments.
    node['_debug_args'] = args;
    const destroyable = manager.getDestroyable(instance);
    if (destroyable !== null) {
      gxtRegisterDestructor(node, () => destroy(destroyable));
    }
    DEFINITION_OF_NODE.set(node, definition);
    return node;
  };
}

// `manager.create` with Glimmer's captured-arguments shape: one compute ref per
// argument over gxt's lazy args.
function createInternal(
  manager: InternalComponentManager,
  definition: object,
  source: Record<string, unknown>,
  ctx: object,
  owner: object,
  positional: readonly unknown[]
): object {
  const named: Record<string, Reference> = {};
  for (const key of Object.keys(source)) {
    named[key] = createComputeRef(() => source[key]);
  }
  const captured: CapturedArguments = {
    named,
    positional: positional.map((value) => createComputeRef(() => unwrapArg(value))),
  };
  return manager.create(
    owner,
    definition,
    { capture: () => captured },
    null,
    null,
    // Glimmer's caller is the invoking template's self (a const ref).
    createConstRef<unknown>(ctx, 'this')
  );
}

// ---------------------------------------------------------------- wrapped
// A `wrapped` internal component with no layout — the `element` helper's
// definition (`<Inner @tag={{element "p"}}>` → `<@tag ...attributes>`): Glimmer
// renders its default `{{yield}}` layout inside an element named by
// `getTagName(instance)` (no element for `null` / `""`) carrying the
// invocation's `...attributes`. The same gxt template function the compiler
// emits for a `{{#let (element "p") as |Tag|}}<Tag>` invocation.
function isWrappedWithoutLayout(
  manager: InternalComponentManager,
  definition: object
): manager is WrappedComponentManager {
  const wrapped = manager as Partial<WrappedComponentManager>;
  return (
    typeof wrapped.getTagName === 'function' &&
    typeof wrapped.getCapabilities === 'function' &&
    wrapped.getCapabilities().wrapped === true &&
    getComponentTemplate(definition) === undefined
  );
}

function wrappedComponent(
  manager: WrappedComponentManager,
  definition: object,
  args: object,
  ctx: object,
  owner: object,
  positional: readonly unknown[]
): unknown {
  const source = args as Record<string, unknown>;
  return function WrappedComponent(this: ComponentNode): object {
    $_GET_ARGS(this as never, arguments);
    const fw = $_GET_FW(this, arguments);
    const slots = $_GET_SLOTS(this, arguments);
    const instance = createInternal(manager, definition, source, ctx, owner, positional);
    const tagName = manager.getTagName(instance) ?? '';
    return $_fin(
      [$_tag(tagName, fw, this as never, [() => $_slot('default', () => [], slots, this)])],
      this as never
    );
  };
}

/** The `$_MANAGERS.component` slot (registered by native/install.ts). */
export const componentManager = {
  canHandle,
  handle: handle as (definition: unknown, args: unknown, fw: unknown, ctx: unknown) => never,
};
