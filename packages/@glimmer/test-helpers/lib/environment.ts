import {
  // VM
  VM,
  DynamicScope,

  // Compiler
  CompilableLayout,
  CompiledDynamicProgram,
  compileLayout,

  // Environment
  Environment,
  Helper as GlimmerHelper,
  ModifierManager,
  DOMTreeConstruction,
  DOMChanges,
  IDOMChanges,

  // Partials
  PartialDefinition,

  // Components
  Component,
  ComponentManager,
  ComponentDefinition,
  ComponentLayoutBuilder,
  ComponentArgs,
  PreparedArguments,

  // Arguments
  Arguments,
  CapturedArguments,
  CapturedNamedArguments,

  // Syntax Classes
  BlockMacros,
  InlineMacros,

  // References
  PrimitiveReference,
  ConditionalReference,

  // Misc
  Bounds,
  ElementOperations,
  Simple,
  getDynamicVar,

  Template,
  isComponentDefinition,
  CompiledDynamicTemplate,
  NULL_REFERENCE,
  Helper,
} from "@glimmer/runtime";

import {
  compile as rawCompile,
  TestCompileOptions
} from "./helpers";

import {
  Option,
  Destroyable,
  Dict,
  Opaque,
  assign,
  dict,
  EMPTY_ARRAY
} from '@glimmer/util';

import GlimmerObject, { GlimmerObjectFactory } from "@glimmer/object";

import {
  VOLATILE_TAG,
  DirtyableTag,
  Tag,
  TagWrapper,
  Reference,
  PathReference,
  OpaqueIterator,
  OpaqueIterable,
  AbstractIterable,
  IterationItem,
  isConst,
  VersionedPathReference
} from "@glimmer/reference";

import {
  UpdatableReference
} from "@glimmer/object-reference";

import * as WireFormat from '@glimmer/wire-format';

import {
  BlockSymbolTable, ProgramSymbolTable, unsafe
} from "@glimmer/interfaces";
import { TemplateMeta } from "@glimmer/wire-format";

type KeyFor<T> = (item: Opaque, index: T) => string;

class ArrayIterator implements OpaqueIterator {
  private array: Opaque[];
  private keyFor: KeyFor<number>;
  private position = 0;

  constructor(array: Opaque[], keyFor: KeyFor<number>) {
    this.array = array;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): Option<IterationItem<Opaque, number>> {
    let { position, array, keyFor } = this;

    if (position >= array.length) return null;

    let value = array[position];
    let key = keyFor(value, position);
    let memo = position;

    this.position++;

    return { key, value, memo };
  }
}

class ObjectKeysIterator implements OpaqueIterator {
  private keys: string[];
  private values: Opaque[];
  private keyFor: KeyFor<string>;
  private position = 0;

  constructor(keys: string[], values: Opaque[], keyFor: KeyFor<string>) {
    this.keys = keys;
    this.values = values;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.keys.length === 0;
  }

  next(): Option<IterationItem<Opaque, string>> {
    let { position, keys, values, keyFor } = this;

    if (position >= keys.length) return null;

    let value = values[position];
    let memo = keys[position];
    let key = keyFor(value, memo);

    this.position++;

    return { key, value, memo };
  }
}

class EmptyIterator implements OpaqueIterator {
  isEmpty(): boolean {
    return true;
  }

  next(): IterationItem<Opaque, Opaque> {
    throw new Error(`Cannot call next() on an empty iterator`);
  }
}

const EMPTY_ITERATOR = new EmptyIterator();

class Iterable implements AbstractIterable<Opaque, Opaque, IterationItem<Opaque, Opaque>, UpdatableReference<Opaque>, UpdatableReference<Opaque>> {
  public tag: Tag;
  private ref: Reference<Opaque>;
  private keyFor: KeyFor<Opaque>;

  constructor(ref: Reference<Opaque>, keyFor: KeyFor<Opaque>) {
    this.tag = ref.tag;
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate(): OpaqueIterator {
    let { ref, keyFor } = this;

    let iterable = ref.value() as any;

    if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (iterable === undefined || iterable === null) {
      return EMPTY_ITERATOR;
    } else if (iterable.forEach !== undefined) {
      let array: Opaque[] = [];
      iterable.forEach((item: Opaque) => array.push(item));
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else if (typeof iterable === 'object') {
      let keys = Object.keys(iterable);
      return keys.length > 0 ? new ObjectKeysIterator(keys, keys.map(key => iterable[key]), keyFor) : EMPTY_ITERATOR;
    } else {
      throw new Error(`Don't know how to {{#each ${iterable}}}`);
    }
  }

  valueReferenceFor(item: IterationItem<Opaque, Opaque>): UpdatableReference<Opaque> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference: UpdatableReference<Opaque>, item: IterationItem<Opaque, Opaque>) {
    reference.update(item.value);
  }

  memoReferenceFor(item: IterationItem<Opaque, Opaque>): UpdatableReference<Opaque> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(reference: UpdatableReference<Opaque>, item: IterationItem<Opaque, Opaque>) {
    reference.update(item.memo);
  }
}

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>, newAttrs: Attrs };

export class BasicComponent {
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;

  constructor(attrs: Attrs) {
    this.attrs = attrs;
  }
}

export class EmberishCurlyComponent extends GlimmerObject {
  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public tagName: Option<string> = null;
  public attributeBindings: Option<string[]> = null;
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Component = null;
  public args: CapturedNamedArguments;

  static create(args: { attrs: Attrs }): EmberishCurlyComponent {
    return super.create(args) as EmberishCurlyComponent;
  }

  recompute() {
    this.dirtinessTag.inner.dirty();
  }

  didInitAttrs(_options: { attrs: Attrs }) { }
  didUpdateAttrs(_diff: AttrsDiff) { }
  didReceiveAttrs(_diff: AttrsDiff) { }
  willInsertElement() { }
  willUpdate() { }
  willRender() { }
  didInsertElement() { }
  didUpdate() { }
  didRender() { }
}

export class EmberishGlimmerComponent extends GlimmerObject {
  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Component = null;

  static create(args: { attrs: Attrs }): EmberishGlimmerComponent {
    return super.create(args) as EmberishGlimmerComponent;
  }

  recompute() {
    this.dirtinessTag.inner.dirty();
  }

  didInitAttrs(_options: { attrs: Attrs }) { }
  didUpdateAttrs(_diff: AttrsDiff) { }
  didReceiveAttrs(_diff: AttrsDiff) { }
  willInsertElement() { }
  willUpdate() { }
  willRender() { }
  didInsertElement() { }
  didUpdate() { }
  didRender() { }
}

export interface BasicStateBucket {
  args: CapturedNamedArguments;
  component: BasicComponent;
}

class BasicComponentManager implements ComponentManager<BasicStateBucket> {
  prepareArgs(): null {
    return null;
  }

  create(_env: Environment, definition: BasicComponentDefinition, _args: Arguments): BasicStateBucket {
    let args = _args.named.capture();
    let klass = definition.ComponentClass || BasicComponent;
    let component = new klass(args.value());

    return { args, component };
  }

  layoutFor(definition: BasicComponentDefinition, _bucket: BasicStateBucket, env: TestEnvironment): CompiledDynamicProgram {
    let layout = env.compiledLayouts[definition.name];

    if (layout) {
      return layout;
    }

    layout = rawCompile(definition.layoutString, { env, meta: undefined as any as TemplateMeta }).asLayout([], definition.name).compileDynamic(env);
    return env.compiledLayouts[definition.name] = layout;
  }

  getSelf({ component }: BasicStateBucket): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement({ component }: BasicStateBucket, element: Element): void {
    component.element = element;
  }

  didRenderLayout({ component }: BasicStateBucket, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(): void { }

  getTag(): null {
    return null;
  }

  update({ component, args } : BasicStateBucket): void {
    component.attrs = args.value();
  }

  didUpdateLayout(): void { }

  didUpdate(): void { }

  getDestructor(): null {
    return null;
  }
}

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();

class StaticTaglessComponentManager extends BasicComponentManager {
  layoutFor(definition: StaticTaglessComponentDefinition, _component: BasicStateBucket, env: TestEnvironment): CompiledDynamicProgram {
    let layout = env.compiledLayouts[definition.name];

    if (layout) {
      return layout;
    }

    return env.compiledLayouts[definition.name] = compileLayout(new StaticTaglessComponentLayoutCompiler(definition.layoutString), env);
  }
}

const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;

export interface EmberishGlimmerStateBucket {
  args: CapturedNamedArguments;
  component: EmberishGlimmerComponent;
}

class EmberishGlimmerComponentManager implements ComponentManager<EmberishGlimmerStateBucket> {
  prepareArgs(): null {
    return null;
  }

  create(_environment: Environment, definition: EmberishGlimmerComponentDefinition, _args: Arguments, _dynamicScope: any, _callerSelf: PathReference<Opaque>, _hasDefaultBlock: boolean): EmberishGlimmerStateBucket {
    let args = _args.named.capture();
    let klass = definition.ComponentClass || BaseEmberishGlimmerComponent;
    let attrs = args.value();
    let component = klass.create({ attrs });

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return { args, component };
  }

  layoutFor(definition: EmberishGlimmerComponentDefinition, _component: EmberishGlimmerStateBucket, env: TestEnvironment): CompiledDynamicProgram {
    if (env.compiledLayouts[definition.name]) {
      return env.compiledLayouts[definition.name];
    }
    return env.compiledLayouts[definition.name] = compileLayout(new EmberishGlimmerComponentLayoutCompiler(definition.name, definition.layoutString), env);
  }

  getSelf({ component }: EmberishGlimmerStateBucket): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement({ component }: EmberishGlimmerStateBucket, element: Element): void {
    component.element = element;
  }

  didRenderLayout({ component }: EmberishGlimmerStateBucket, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate({ component }: EmberishGlimmerStateBucket): void {
    component.didInsertElement();
    component.didRender();
  }

  getTag({ component }: EmberishGlimmerStateBucket): Tag {
    return component.dirtinessTag;
  }

  update({ args, component }: EmberishGlimmerStateBucket): void {
    let oldAttrs = component.attrs;
    let newAttrs = args.value();

    component.set('attrs', newAttrs);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout(): void { }

  didUpdate({ component }: EmberishGlimmerStateBucket): void {
    component.didUpdate();
    component.didRender();
  }

  getDestructor({ component }: EmberishGlimmerStateBucket): Destroyable {
    return {
      destroy() {
        component.destroy();
      }
    };
  }
}

const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();

const BaseEmberishCurlyComponent = EmberishCurlyComponent.extend() as typeof EmberishCurlyComponent;

class EmberishCurlyComponentManager implements ComponentManager<EmberishCurlyComponent> {
  prepareArgs(definition: EmberishCurlyComponentDefinition, args: Arguments): Option<PreparedArguments> {
    const { positionalParams } = definition.ComponentClass || BaseEmberishCurlyComponent;

    if (typeof positionalParams === 'string') {
      if (args.named.has(positionalParams)) {
        if (args.positional.length === 0) {
          return null;
        } else {
          throw new Error(`You cannot specify positional parameters and the hash argument \`${positionalParams}\`.`);
        }
      }

      let named = Object.assign({}, args.named.capture().map);
      named[positionalParams] = args.positional.capture();

      return { positional: EMPTY_ARRAY, named };
    } else if (Array.isArray(positionalParams)) {
      let named = Object.assign({}, args.named.capture().map);
      let count = Math.min(positionalParams.length, args.positional.length);

      for (let i=0; i<count; i++) {
        let name = positionalParams[i];

        if (named[name]) {
          throw new Error(`You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`);
        }

        named[name] = args.positional.at(i);
      }

      return { positional: EMPTY_ARRAY, named };
    } else {
      return null;
    }
  }

  create(_environment: Environment, definition: EmberishCurlyComponentDefinition, _args: Arguments, dynamicScope: DynamicScope, callerSelf: PathReference<Opaque>): EmberishCurlyComponent {
    let klass = definition.ComponentClass || BaseEmberishCurlyComponent;
    let self = callerSelf.value();
    let args = _args.named.capture();
    let attrs = args.value();
    let merged = assign({}, attrs, { attrs }, { args }, { targetObject: self });
    let component = klass.create(merged);

    let dyn: Option<string[]> = definition.ComponentClass ? definition.ComponentClass['fromDynamicScope'] : null;

    if (dyn) {
      dyn.forEach(name => component.set(name, dynamicScope.get(name).value()));
    }

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  layoutFor(definition: EmberishCurlyComponentDefinition, component: EmberishCurlyComponent, env: TestEnvironment): CompiledDynamicProgram {
    let layout = env.compiledLayouts[definition.name];

    if (layout) {
      return layout;
    }

    let layoutString = definition.layoutString;
    let lateBound = !layoutString;

    if (!layoutString && layoutString !== '') {
      layoutString = component['layout'];
    }

    layout = compileLayout(new EmberishCurlyComponentLayoutCompiler(layoutString), env);

    return lateBound ? layout : (env.compiledLayouts[definition.name] = layout);
  }

  getSelf(component: EmberishCurlyComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: EmberishCurlyComponent, element: Element, operations: ElementOperations): void {
    component.element = element;

    let bindings = component.attributeBindings;
    let rootRef = new UpdatableReference(component);

    if (bindings) {
      for (let i = 0; i < bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.addDynamicAttribute(element, attribute, reference, false);
      }
    }
  }

  didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(component: EmberishCurlyComponent): void {
    component.didInsertElement();
    component.didRender();
  }

  getTag(component: EmberishCurlyComponent): Tag {
    return component.dirtinessTag;
  }

  update(component: EmberishCurlyComponent): void {
    let oldAttrs = component.attrs;
    let newAttrs = component.args.value();
    let merged = assign({}, newAttrs, { attrs: newAttrs });

    component.setProperties(merged);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout(): void { }

  didUpdate(component: EmberishCurlyComponent): void {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishCurlyComponent): Destroyable {
    return {
      destroy() {
        component.destroy();
      }
    };
  }
}

const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();

function emberToBool(value: any): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return !!value;
  }
}

class EmberishConditionalReference extends ConditionalReference {
  protected toBool(value: any): boolean {
    return emberToBool(value);
  }
}

export class SimplePathReference<T> implements PathReference<T> {
  private parent: Reference<T>;
  private property: string;
  public tag = VOLATILE_TAG;

  constructor(parent: Reference<T>, property: string) {
    this.parent = parent;
    this.property = property;
  }

  value(): T {
    return this.parent.value()[this.property];
  }

  get(prop: string): PathReference<Opaque> {
    return new SimplePathReference(this, prop);
  }
}

export type UserHelper = (args: ReadonlyArray<Opaque>, named: Dict<Opaque>) => any;

class HelperReference implements PathReference<Opaque> {
  private helper: UserHelper;
  private args: CapturedArguments;
  public tag = VOLATILE_TAG;

  constructor(helper: UserHelper, args: Arguments) {
    this.helper = helper;
    this.args = args.capture();
  }

  value() {
    let { helper, args } = this;

    return helper(args.positional.value(), args.named.value());
  }

  get(prop: string): SimplePathReference<Opaque> {
    return new SimplePathReference(this, prop);
  }
}

class InertModifierManager implements ModifierManager<Opaque> {
  create() { }

  install() { }

  update() { }

  getDestructor(): Option<Destroyable> {
    return null;
  }
}

export class TestModifier {
  constructor(
    public element: Element,
    public args: CapturedArguments,
    public dom: IDOMChanges
  ) { }
}

export class TestModifierManager implements ModifierManager<TestModifier> {
  public installedElements: Element[] = [];
  public updatedElements: Element[] = [];
  public destroyedModifiers: TestModifier[] = [];

  create(element: Element, args: Arguments, _dynamicScope: DynamicScope, dom: IDOMChanges): TestModifier {
    return new TestModifier(element, args.capture(), dom);
  }

  install({ element, args, dom }: TestModifier) {
    this.installedElements.push(element);

    let param = args.positional.at(0).value();
    dom.setAttribute(element, 'data-modifier', `installed - ${param}`);

    return;
  }

  update({ element, args, dom }: TestModifier) {
    this.updatedElements.push(element);

    let param = args.positional.at(0).value();
    dom.setAttribute(element, 'data-modifier', `updated - ${param}`);

    return;
  }

  getDestructor(modifier: TestModifier): Destroyable {
    return {
      destroy: () => {
        this.destroyedModifiers.push(modifier);
        let { element, dom } = modifier;
        dom.removeAttribute(element, 'data-modifier');
      }
    };
  }
}

export interface TestEnvironmentOptions {
  document?: Simple.Document;
  appendOperations?: DOMTreeConstruction;
}

export type CompiledDynamicBlock = CompiledDynamicTemplate<BlockSymbolTable>;
export type CompiledDynamicProgram = CompiledDynamicTemplate<ProgramSymbolTable>;

export class TestEnvironment extends Environment {
  private helpers = dict<GlimmerHelper>();
  private modifiers = dict<ModifierManager<Opaque>>();
  private partials = dict<PartialDefinition<WireFormat.TemplateMeta>>();
  private components = dict<ComponentDefinition<any>>();
  private uselessAnchor: HTMLAnchorElement;
  public compiledLayouts = dict<CompiledDynamicProgram>();

  constructor(options: TestEnvironmentOptions = {}) {
    // let document = options.document || window.document;
    // let appendOperations = options.appendOperations || new DOMTreeConstruction(document);
    super({
      appendOperations: options.appendOperations || new DOMTreeConstruction(options.document || window.document),
      updateOperations: new DOMChanges((options.document || window.document) as Document)
    });

    let document = options.document || window.document;

    this.uselessAnchor = document.createElement('a') as HTMLAnchorElement;
    this.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);
    this.registerHelper("unless", ([cond, yes, no]) => cond ? no : yes);
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
    this.registerModifier("action", new InertModifierManager());

    this.registerInternalHelper("hash", (_vm: VM, args: Arguments) => args.capture().named);
  }

  protocolForURL(url: string): string {
    this.uselessAnchor.href = url;
    return this.uselessAnchor.protocol;
  }

  registerHelper(name: string, helper: UserHelper) {
    this.helpers[name] = (_vm: VM, args: Arguments) => new HelperReference(helper, args);
  }

  registerInternalHelper(name: string, helper: GlimmerHelper) {
    this.helpers[name] = helper;
  }

  registerModifier(name: string, modifier: ModifierManager<Opaque>) {
    this.modifiers[name] = modifier;
  }

  registerPartial(name: string, source: string) {
    this.partials[name] = new PartialDefinition(name, rawCompile(source, { env: this } as unsafe as TestCompileOptions<TemplateMeta>));
  }

  registerComponent(name: string, definition: ComponentDefinition<any>) {
    this.components[name] = definition;
    return definition;
  }

  registerBasicComponent(name: string, Component: BasicComponentFactory, layout: string): ComponentDefinition<BasicComponentDefinition> {
    let definition = new BasicComponentDefinition(name, BASIC_COMPONENT_MANAGER, Component, layout);
    return this.registerComponent(name, definition);
  }

  registerStaticTaglessComponent(name: string, Component: BasicComponentFactory, layout: string): ComponentDefinition<BasicComponentFactory> {
    let definition = new StaticTaglessComponentDefinition(name, STATIC_TAGLESS_COMPONENT_MANAGER, Component, layout);
    return this.registerComponent(name, definition);
  }

  registerEmberishCurlyComponent(name: string, Component: EmberishCurlyComponentFactory, layout: string): ComponentDefinition<EmberishCurlyComponentDefinition> {
    let definition = new EmberishCurlyComponentDefinition(name, EMBERISH_CURLY_COMPONENT_MANAGER, Component, layout);
    return this.registerComponent(name, definition);
  }

  registerEmberishGlimmerComponent(name: string, Component: EmberishGlimmerComponentFactory, layout: string): ComponentDefinition<EmberishGlimmerComponentDefinition> {
    let definition = new EmberishGlimmerComponentDefinition(name, EMBERISH_GLIMMER_COMPONENT_MANAGER, Component, layout);
    return this.registerComponent(name, definition);
  }

  toConditionalReference(reference: Reference<any>): Reference<boolean> {
    if (isConst(reference)) {
      return PrimitiveReference.create(emberToBool(reference.value()));
    }

    return new EmberishConditionalReference(reference);
  }

  populateBuiltins(): { blocks: BlockMacros, inlines: InlineMacros } {
    let macros = super.populateBuiltins();
    populateBlocks(macros.blocks, macros.inlines);
    return macros;
  }

  hasHelper(helperName: string): boolean {
    return (helperName === "component") || (helperName in this.helpers);
  }

  lookupHelper(helperName: string, meta: TemplateMeta): Helper {
    if (helperName === "component") {
      return (_vm: VM, args: Arguments) => new DynamicComponentReference(args.at(0), this, meta);
    }

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperName} not found.`);

    return helper;
  }

  hasPartial(partialName: string) {
    return partialName in this.partials;
  }

  lookupPartial(partialName: string) {
    let partial = this.partials[partialName];

    return partial;
  }

  hasComponentDefinition(name: string): boolean {
    return !!this.components[name];
  }

  getComponentDefinition(name: string, _blockMeta?: WireFormat.TemplateMeta): ComponentDefinition<any> {
    return this.components[name];
  }

  hasModifier(modifierName: string): boolean {
    return modifierName in this.modifiers;
  }

  lookupModifier(modifierName: string): ModifierManager<Opaque> {
    let modifier = this.modifiers[modifierName];

    if (!modifier) throw new Error(`Modifier for ${modifierName} not found.`);

    return modifier;
  }

  compile(template: string): Template<undefined> {
    return rawCompile<any>(template, { env: this } as any);
  }

  iterableFor(ref: Reference<Opaque>, keyPath: string): OpaqueIterable {
    let keyFor: KeyFor<Opaque>;

    if (!keyPath) {
      throw new Error('Must specify a key for #each');
    }

    switch (keyPath) {
      case '@index':
        keyFor = (_, index: number) => String(index);
        break;
      case '@primitive':
        keyFor = (item: Opaque) => String(item);
        break;
      default:
        keyFor = (item: Opaque) => item && item[keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
}

export class TestDynamicScope implements DynamicScope {
  private bucket: any;

  constructor(bucket = null) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): PathReference<Opaque> {
    return this.bucket[key];
  }

  set(key: string, reference: PathReference<Opaque>) {
    return this.bucket[key] = reference;
  }

  child(): TestDynamicScope {
    return new TestDynamicScope(this.bucket);
  }
}

export class DynamicComponentReference implements VersionedPathReference<Option<ComponentDefinition<Opaque>>> {
  public tag: Tag;

  constructor(private nameRef: PathReference<Opaque>, private env: Environment, private meta: WireFormat.TemplateMeta) {
    this.tag = nameRef.tag;
  }

  value(): Option<ComponentDefinition<Opaque>> {
    let { env, nameRef, meta } = this;

    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      return env.getComponentDefinition(nameOrDef, meta);
    } else if (isComponentDefinition(nameOrDef)) {
      return nameOrDef;
    }

    return null;
  }

  get(): VersionedPathReference<Opaque> {
    return NULL_REFERENCE;
  }
}

function dynamicComponentFor(vm: VM, args: Arguments, meta: WireFormat.TemplateMeta) {
  let nameRef = args.positional.at(0);
  let env = vm.env;
  return new DynamicComponentReference(nameRef, env, meta);
};

export interface BasicComponentFactory {
  new (attrs: Dict<any>): BasicComponent;
}

export abstract class GenericComponentDefinition<T> extends ComponentDefinition<T> {
  public layoutString: string;

  constructor(name: string, manager: ComponentManager<T>, ComponentClass: any, layout: string) {
    super(name, manager, ComponentClass);
    this.layoutString = layout;
  }

  toJSON() {
    return { GlimmerDebug: `<component ${this.name}>` };
  }
}

export class BasicComponentDefinition extends GenericComponentDefinition<BasicStateBucket> {
  public ComponentClass: BasicComponentFactory;
}

class StaticTaglessComponentDefinition extends GenericComponentDefinition<BasicStateBucket> {
  public ComponentClass: BasicComponentFactory;
}

export interface EmberishCurlyComponentFactory {
  positionalParams: Option<string | string[]>;
  create(options: { attrs: Attrs, targetObject: any }): EmberishCurlyComponent;
}

export class EmberishCurlyComponentDefinition extends GenericComponentDefinition<EmberishCurlyComponent> {
  public ComponentClass: EmberishCurlyComponentFactory;
}

export interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

export class EmberishGlimmerComponentDefinition extends GenericComponentDefinition<EmberishGlimmerStateBucket> {
  public ComponentClass: EmberishGlimmerComponentFactory;
}

abstract class GenericComponentLayoutCompiler implements CompilableLayout {
  constructor(private layoutString: string) { }

  protected compileLayout(env: Environment): Template<WireFormat.TemplateMeta> {
    return rawCompile(this.layoutString, { env } as unsafe as TestCompileOptions<TemplateMeta>);
  }

  abstract compile(builder: ComponentLayoutBuilder): void;
}

class StaticTaglessComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  compile(builder: ComponentLayoutBuilder) {
    builder.wrapLayout(this.compileLayout(builder.env));
  }
}

function EmberTagName(vm: VM): PathReference<string> {
  let self = vm.getSelf().value() as Object;
  let tagName: string = self['tagName'];
  tagName = tagName === '' ? null : self['tagName'] || 'div';
  return PrimitiveReference.create(tagName);
}

function EmberID(vm: VM): PathReference<string> {
  let self = vm.getSelf().value() as { _guid: string };
  return PrimitiveReference.create(`ember${self._guid}`);
}

class EmberishCurlyComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  compile(builder: ComponentLayoutBuilder) {
    builder.wrapLayout(this.compileLayout(builder.env));
    (builder.tag as any).dynamic(EmberTagName);
    builder.attrs.static('class', 'ember-view');
    (builder.attrs as any).dynamic('id', EmberID);
  }
}

class EmberishGlimmerComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  constructor(private componentName: string, layoutString: string) {
    super(layoutString);
  }

  compile(builder: ComponentLayoutBuilder) {
    builder.fromLayout(this.componentName, this.compileLayout(builder.env));
    builder.attrs.static('class', 'ember-view');
    (builder.attrs as any).dynamic('id', EmberID);
  }
}

export function inspectHooks<T extends Component>(ComponentClass: GlimmerObjectFactory<T>): GlimmerObjectFactory<T> {
  return ComponentClass.extend({
    init(this: any) {
      this._super(...arguments);
      this.hooks = {
        didInitAttrs: 0,
        didUpdateAttrs: 0,
        didReceiveAttrs: 0,
        willInsertElement: 0,
        willUpdate: 0,
        willRender: 0,
        didInsertElement: 0,
        didUpdate: 0,
        didRender: 0
      };
    },

    didInitAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didInitAttrs']++;
    },

    didUpdateAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didUpdateAttrs']++;
    },

    didReceiveAttrs(this: any) {
      this._super(...arguments);
      this.hooks['didReceiveAttrs']++;
    },

    willInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['willInsertElement']++;
    },

    willUpdate(this: any) {
      this._super(...arguments);
      this.hooks['willUpdate']++;
    },

    willRender(this: any) {
      this._super(...arguments);
      this.hooks['willRender']++;
    },

    didInsertElement(this: any) {
      this._super(...arguments);
      this.hooks['didInsertElement']++;
    },

    didUpdate(this: any) {
      this._super(...arguments);
      this.hooks['didUpdate']++;
    },

    didRender(this: any) {
      this._super(...arguments);
      this.hooks['didRender']++;
    }
  });
}

function populateBlocks(blocks: BlockMacros, inlines: InlineMacros): { blocks: BlockMacros, inlines: InlineMacros } {
  blocks.add('identity', (_params, _hash, template, _inverse, builder) => {
    builder.invokeStatic(template!);
  });

  blocks.add('render-inverse', (_params, _hash, _template, inverse, builder) => {
    builder.invokeStatic(inverse!);
  });

  blocks.add('component', (params, hash, template, inverse, builder) => {
    let definitionArgs: ComponentArgs = [params.slice(0, 1), null, null, null];
    let args: ComponentArgs = [params.slice(1), hashToArgs(hash), template, inverse];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
  });

  blocks.addMissing((name, params, hash, template, inverse, builder) => {
    if (!params) {
      params = [];
    }

    let definition = builder.env.getComponentDefinition(name, builder.meta.templateMeta);

    if (definition) {
      builder.component.static(definition, [params, hashToArgs(hash), template, inverse]);
      return true;
    }

    return false;
  });

  inlines.add('component', (_name, params, hash, builder) => {
    let definitionArgs: ComponentArgs = [params!.slice(0, 1), null, null, null];
    let args: ComponentArgs = [params!.slice(1), hashToArgs(hash), null, null];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
  });

  inlines.addMissing((name, params, hash, builder) => {
    let definition = builder.env.getComponentDefinition(name, builder.meta.templateMeta);

    if (definition) {
      builder.component.static(definition, [params!, hashToArgs(hash), null, null]);
      return true;
    }

    return false;
  });

  return { blocks, inlines };
}

function hashToArgs(hash: Option<WireFormat.Core.Hash>): Option<WireFormat.Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}

export function equalsElement(element: Element, tagName: string, attributes: Object, content: string) {
  QUnit.assert.pushResult({
    result: element.tagName === tagName.toUpperCase(),
    actual: element.tagName.toLowerCase(),
    expected: tagName,
    message: `expect tagName to be ${tagName}`
  });

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equalsAttr(expected);
    expectedAttrs[prop] = matcher;

    QUnit.assert.pushResult({
      result: expectedAttrs[prop].match(element.getAttribute(prop)),
      actual: matcher.fail(element.getAttribute(prop)),
      expected: matcher.fail(element.getAttribute(prop)),
      message: `Expected element's ${prop} attribute ${matcher.expected()}`
    });
  }

  let actualAttributes = {};
  for (let i = 0, l = element.attributes.length; i < l; i++) {
    actualAttributes[element.attributes[i].name] = element.attributes[i].value;
  }

  if (!(element instanceof HTMLElement)) {
        QUnit.assert.pushResult({
          result: element instanceof HTMLElement,
          actual: null,
          expected: null,
          message: "Element must be an HTML Element, not an SVG Element"
        });
  } else {
    QUnit.assert.pushResult({
      result: element.attributes.length === expectedCount,
      actual: element.attributes.length,
      expected: expectedCount,
      message: `Expected ${expectedCount} attributes; got ${element.outerHTML}`
    });

    if (content !== null) {
      QUnit.assert.pushResult({
        result: element.innerHTML === content,
        actual: element.innerHTML,
        expected: content,
        message: `The element had '${content}' as its content`
      });
    }
  }
}

interface Matcher {
  "3d4ef194-13be-4ccf-8dc7-862eea02c93e": boolean;
  match(actual: any): boolean;
  fail(actual: any): string;
  expected(): string;
}

export const MATCHER = "3d4ef194-13be-4ccf-8dc7-862eea02c93e";

export function equalsAttr(expected: any) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: any) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: any) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function equals<T>(expected: T) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: T) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: T) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function regex(r: RegExp) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(v: string) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual: string) {
      return `${actual} did not match ${r}`;
    }
  };
}

export function classes(expected: string) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual: string) {
      return actual && (expected.split(' ').sort().join(' ') === actual.split(' ').sort().join(' '));
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual: string) {
      return `'${actual}'' did not match '${expected}'`;
    }
  };
}
