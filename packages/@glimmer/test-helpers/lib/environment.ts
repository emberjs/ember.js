import {
  CompilableTemplate,
  ComponentCapabilities,
  Macros,
  ParsedLayout,
  WrappedBuilder,
  TemplateOptions,
  LazyOpcodeBuilder
} from "@glimmer/opcode-compiler";

import {
  // VM
  VM,
  DynamicScope,

  // Environment
  Environment,
  Helper as GlimmerHelper,
  ModifierManager,
  DOMTreeConstruction,
  DOMChanges,
  IDOMChanges,
  Lookup as LookupResolver,

  // Partials
  PartialDefinition,

  // Components
  ComponentManager,
  PreparedArguments,
  WithStaticLayout,

  // Arguments
  Arguments,
  CapturedArguments,
  CapturedNamedArguments,

  // References
  PrimitiveReference,
  ConditionalReference,

  // Misc
  Bounds,
  ElementOperations,
  getDynamicVar,

  Template,
  templateFactory,
  TopLevelSyntax,
  Program,
  WithDynamicTagName,
  WithDynamicLayout,
  CompilationOptions,
  Handle,
  ScannableTemplate,
  ComponentSpec,
  curry,
  CurriedDefinition
} from "@glimmer/runtime";

import {
  Option,
  Destroyable,
  Dict,
  Opaque,
  assign,
  dict,
  EMPTY_ARRAY,
  unreachable
} from '@glimmer/util';

import GlimmerObject from "@glimmer/object";

import {
  CONSTANT_TAG,
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
  combine,
  isConst
} from "@glimmer/reference";

import {
  UpdatableReference
} from "@glimmer/object-reference";

import * as WireFormat from '@glimmer/wire-format';

import { Simple, Resolver, Unique, ProgramSymbolTable, Recast } from "@glimmer/interfaces";
import { TemplateMeta, SerializedTemplateWithLazyBlock, SerializedTemplateBlock } from "@glimmer/wire-format";
import { precompile } from "@glimmer/compiler";

export type _ = Unique<any>;

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
      for (let i = 0; i < iterable.length; i++) {
        array.push(iterable[i]);
      }
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else if (typeof iterable === 'object') {
      let keys = Object.keys(iterable);

      if (keys.length > 0) {
        let values: Opaque[] = [];

        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          values[i] = iterable[key];
        }

        return new ObjectKeysIterator(keys, values, keyFor);
      } else {
        return EMPTY_ITERATOR;
      }
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
  public element: Element;
  public bounds: Bounds;
}

export class EmberishCurlyComponent extends GlimmerObject {
  public static positionalParams: string[] | string;

  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
  public layout: TestSpecifier;
  public name: string;
  public tagName: Option<string> = null;
  public attributeBindings: Option<string[]> = null;
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Option<EmberishCurlyComponent> = null;
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
  public parentView: Option<EmberishGlimmerComponent> = null;

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

class GenericComponentManager {
  getCapabilities(definition: GenericComponentDefinition<Opaque>): ComponentCapabilities {
    return definition.capabilities;
  }
}

class BasicComponentManager extends GenericComponentManager implements WithStaticLayout<BasicComponent, BasicComponentDefinition, TestSpecifier, TestResolver> {
  prepareArgs(): null {
    throw unreachable();
  }

  create(_env: Environment, definition: BasicComponentDefinition): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass();
  }

  getLayout({ name }: BasicComponentDefinition, resolver: TestResolver): TestSpecifier {
    let compile = (source: string, options: TemplateOptions) => {
      let layout = createTemplate(source);
      return new ScannableTemplate(options, layout).asLayout();
    };

    let specifier = resolver.lookup('template-source', name, {})!;

    return resolver.compileTemplate(specifier, compile);
  }

  getSelf(component: BasicComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  didCreateElement(component: BasicComponent, element: Element): void {
    component.element = element;
  }

  didRenderLayout(component: BasicComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(): void { }

  update(): void { }

  didUpdateLayout(): void { }

  didUpdate(): void { }

  getDestructor(): null {
    return null;
  }
}

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();

class StaticTaglessComponentManager extends BasicComponentManager {
  getLayout(definition: BasicComponentDefinition, resolver: TestResolver): TestSpecifier {
    let { name, capabilities } = definition;

    let specifier = resolver.lookup('template-source', name, {})!;

    return resolver.compileTemplate(specifier, (source, options) => {
      let template = createTemplate(source, {});
      let compileOptions = { ...options, asPartial: false };
      return new WrappedBuilder(compileOptions, template, capabilities);
    });
  }
}

const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;

export interface EmberishGlimmerStateBucket {
  args: CapturedNamedArguments;
  component: EmberishGlimmerComponent;
}

class EmberishGlimmerComponentManager extends GenericComponentManager implements ComponentManager<EmberishGlimmerStateBucket, EmberishGlimmerComponentDefinition>, WithStaticLayout<EmberishGlimmerStateBucket, EmberishGlimmerComponentDefinition, TestSpecifier, TestResolver> {
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

  getTag({ args: { tag }, component: { dirtinessTag } }: EmberishGlimmerStateBucket): Tag {
    return combine([tag, dirtinessTag]);
  }

  getLayout({ name }: EmberishGlimmerComponentDefinition, resolver: TestResolver): TestSpecifier {
    let compile = (source: string, options: TemplateOptions) => {
      let layout = createTemplate(source);
      return new ScannableTemplate(options, layout).asLayout();
    };

    let specifier = resolver.lookup('template-source', name, {})!;

    return resolver.compileTemplate(specifier, compile);
  }

  getSelf({ component }: EmberishGlimmerStateBucket): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement({ component }: EmberishGlimmerStateBucket, element: Element, operations: ElementOperations): void {
    component.element = element;
    operations.setAttribute('id', PrimitiveReference.create(`ember${component._guid}`), false, null);
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);
  }

  didRenderLayout({ component }: EmberishGlimmerStateBucket, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate({ component }: EmberishGlimmerStateBucket): void {
    component.didInsertElement();
    component.didRender();
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

class EmberishCurlyComponentManager extends GenericComponentManager implements WithDynamicTagName<EmberishCurlyComponent>, WithDynamicLayout<EmberishCurlyComponent, TestSpecifier, TestResolver> {
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

  create(_environment: Environment, definition: EmberishCurlyComponentDefinition, _args: Arguments, dynamicScope: DynamicScope, callerSelf: PathReference<Opaque>, hasDefaultBlock: boolean): EmberishCurlyComponent {
    let klass = definition.ComponentClass || BaseEmberishCurlyComponent;
    let self = callerSelf.value();
    let args = _args.named.capture();
    let attrs = args.value();
    let merged = assign({}, attrs, { attrs }, { args }, { targetObject: self }, { HAS_BLOCK: hasDefaultBlock });
    let component = klass.create(merged);

    component.name = definition.name;
    component.args = args;

    if (definition.layout) {
      component.layout = definition.layout;
    }

    let dyn: Option<string[]> = definition.ComponentClass ? definition.ComponentClass['fromDynamicScope'] : null;

    if (dyn) {
      for (let i = 0; i < dyn.length; i++) {
        let name = dyn[i];
        component.set(name, dynamicScope.get(name).value());
      }
    }

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  getTag({ args: { tag }, dirtinessTag }: EmberishCurlyComponent): Tag {
    return combine([tag, dirtinessTag]);
  }

  getLayout({ layout }: EmberishCurlyComponent, resolver: TestResolver): TestSpecifier {
    if (!layout) {
      throw new Error('BUG: missing dynamic layout');
    }

    let specifier = resolver.lookup('template-source', layout.name, {});

    if (!specifier) {
      throw new Error('BUG: missing dynamic layout');
    }

    return resolver.compileTemplate(specifier, (source, options) => {
      let template = createTemplate(source);
      return new WrappedBuilder({ ...options, asPartial: false }, template, CURLY_CAPABILITIES);
    });
  }

  getSelf(component: EmberishCurlyComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  getTagName({ tagName }: EmberishCurlyComponent): Option<string> {
    if (tagName) {
      return tagName;
    } else if (tagName === null) {
      return 'div';
    } else {
      return null;
    }
  }

  didCreateElement(component: EmberishCurlyComponent, element: Element, operations: ElementOperations): void {
    component.element = element;

    operations.setAttribute('id', PrimitiveReference.create(`ember${component._guid}`), false, null);
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);

    let bindings = component.attributeBindings;
    let rootRef = new UpdatableReference(component);

    if (bindings) {
      for (let i = 0; i < bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.setAttribute(attribute, reference, false, null);
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

  getTag(): Tag {
    return CONSTANT_TAG;
  }

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

  getTag({ args: { tag } }: TestModifier): Tag {
    return tag;
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
  program?: TopLevelSyntax;
}

export interface Lookup {
  helper: GlimmerHelper;
  modifier: ModifierManager;
  partial: PartialDefinition;
  component: ComponentSpec;
  template: { compile(): Handle };
  'template-source': string;
}

export type LookupType = keyof Lookup;
export type LookupValue = Lookup[LookupType];

export interface TestSpecifier<T extends LookupType = LookupType> {
  type: T;
  name: string;
}

class TypedRegistry<T> {
  private inner = dict<T>();

  has(name: string): boolean {
    return name in this.inner;
  }

  get(name: string): Option<T> {
    return this.inner[name];
  }

  register(name: string, value: T): void {
    this.inner[name] = value;
  }
}

export type TestCompilationOptions = CompilationOptions<TemplateMeta, TestSpecifier, TestResolver>;

export type CompileTemplate = CompilableTemplate<ProgramSymbolTable>;

export class TestResolver implements Resolver<TestSpecifier, TemplateMeta> {
  private registry = {
    helper: new TypedRegistry<GlimmerHelper>(),
    modifier: new TypedRegistry<ModifierManager>(),
    partial: new TypedRegistry<PartialDefinition>(),
    component: new TypedRegistry<ComponentSpec>(),
    template: new TypedRegistry<{ compile(): Handle }>(),
    'template-source': new TypedRegistry<string>()
  };

  private options: TemplateOptions;

  register<K extends LookupType>(type: K, name: string, value: Lookup[K]): TestSpecifier {
    (this.registry[type] as TypedRegistry<any>).register(name, value);
    return { type, name };
  }

  lookup(type: LookupType, name: string, _meta: TemplateMeta): Option<TestSpecifier> {
    if (this.registry[type].has(name)) {
      return { type, name };
    } else {
      return null;
    }
  }

  compileTemplate(sourceSpecifier: TestSpecifier, create: (source: string, options: TemplateOptions) => { compile(): Handle }): TestSpecifier {
    let templateName = sourceSpecifier.name;
    let specifier = this.lookup('template', templateName, {});

    if (specifier) {
      return specifier;
    }

    let source = this.resolve<string>(sourceSpecifier);

    return this.register('template', templateName, create(source, this.options));
  }

  lookupHelper(name: string, meta: TemplateMeta): Option<TestSpecifier> {
    return this.lookup('helper', name, meta);
  }

  lookupModifier(name: string, meta: TemplateMeta): Option<TestSpecifier> {
    return this.lookup('modifier', name, meta);
  }

  lookupComponent(name: string, meta: TemplateMeta): Option<TestSpecifier> {
    return this.lookup('component', name, meta);
  }

  lookupPartial(name: string, meta: TemplateMeta): Option<TestSpecifier> {
    return this.lookup('partial', name, meta);
  }

  resolve<T>(specifier: TestSpecifier): T {
    return this.registry[specifier.type].get(specifier.name) as Recast<LookupValue, T>;
  }
}

class TestMacros extends Macros {
  constructor() {
    super();

    let { blocks, inlines} = this;

    blocks.add('identity', (_params, _hash, template, _inverse, builder) => {
      builder.invokeStaticBlock(template!);
    });

    blocks.add('render-inverse', (_params, _hash, _template, inverse, builder) => {
      builder.invokeStaticBlock(inverse!);
    });

    blocks.addMissing((name, params, hash, template, inverse, builder) => {
      if (!params) {
        params = [];
      }

      let lookup = builder.lookup;

      let specifier = lookup.lookupComponent(name, builder.meta);

      if (specifier) {
        builder.component.static(specifier, [params, hashToArgs(hash), template, inverse]);
        return true;
      }

      return false;
    });

    inlines.addMissing((name, params, hash, builder) => {
      let lookup = builder.lookup;
      let specifier = lookup.lookupComponent(name, builder.meta);

      if (specifier) {
        builder.component.static(specifier, [params!, hashToArgs(hash), null, null]);
        return true;
      }

      return false;
    });
  }
}

export class TestEnvironment extends Environment {
  public resolver = new TestResolver();
  private program = new Program(this.resolver);
  private uselessAnchor: HTMLAnchorElement;
  public compiledLayouts = dict<Handle>();
  private lookup: LookupResolver;

  public compileOptions: TemplateOptions = {
    lookup: new LookupResolver(this.resolver),
    program: this.program,
    macros: new TestMacros(),
    Builder: LazyOpcodeBuilder
  };

  constructor(options: TestEnvironmentOptions = {}) {
    // let document = options.document || window.document;
    // let appendOperations = options.appendOperations || new DOMTreeConstruction(document);
    super({
      appendOperations: options.appendOperations || new DOMTreeConstruction(options.document as Document || window.document),
      updateOperations: new DOMChanges((options.document || window.document) as Document)
    });

    // recursive field, so "unsafely" set one half late (but before the resolver is actually used)
    this.resolver['options'] = this.compileOptions;
    this.lookup = new LookupResolver(this.resolver);
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

  registerHelper(name: string, helper: UserHelper): GlimmerHelper {
    let glimmerHelper = (_vm: VM, args: Arguments) => new HelperReference(helper, args);
    this.resolver.register('helper', name, glimmerHelper);
    return glimmerHelper;
  }

  registerInternalHelper(name: string, helper: GlimmerHelper): GlimmerHelper {
    this.resolver.register('helper', name, helper);
    return helper;
  }

  registerModifier(name: string, modifier: ModifierManager<any>): ModifierManager {
    this.resolver.register('modifier', name, modifier);
    return modifier;
  }

  registerPartial(name: string, source: string): PartialDefinition {
    let definition = new PartialDefinition(name, this.compile(source));
    this.resolver.register('partial', name, definition);
    return definition;
  }

  private registerComponent(name: string, definition: GenericComponentDefinition<any>) {
    this.resolver.register('component', name, { definition, manager: definition.manager });
    return definition;
  }

  registerTemplate(name: string, source: string): TestSpecifier {
    return this.resolver.register("template-source", name, source);
  }

  registerBasicComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let layout = this.registerTemplate(name, layoutSource);

    let definition = new BasicComponentDefinition(name, BASIC_COMPONENT_MANAGER, Component, layout);
    this.registerComponent(name, definition);
  }

  registerStaticTaglessComponent(name: string, Component: BasicComponentFactory, layoutSource: string): void {
    let layout = this.registerTemplate(name, layoutSource);

    let definition = new StaticTaglessComponentDefinition(name, STATIC_TAGLESS_COMPONENT_MANAGER, Component, layout);
    this.registerComponent(name, definition);
  }

  registerEmberishCurlyComponent(name: string, Component: Option<EmberishCurlyComponentFactory>, layoutSource: Option<string>): void {
    let layout: Option<TestSpecifier> = null;

    if (layoutSource !== null) {
      layout = this.registerTemplate(name, layoutSource);
    }

    let definition = new EmberishCurlyComponentDefinition(name, EMBERISH_CURLY_COMPONENT_MANAGER, Component || EmberishCurlyComponent, layout);
    this.registerComponent(name, definition);
  }

  registerEmberishGlimmerComponent(name: string, Component: Option<EmberishGlimmerComponentFactory>, layoutSource: string): void {
    if (name.indexOf('-') !== -1) {
      throw new Error("DEPRECATED: dasherized components");
    }

    let layout = this.registerTemplate(name, layoutSource);

    let definition = new EmberishGlimmerComponentDefinition(name, EMBERISH_GLIMMER_COMPONENT_MANAGER, Component || EmberishGlimmerComponent, layout);
    this.registerComponent(name, definition);
  }

  toConditionalReference(reference: Reference<any>): Reference<boolean> {
    if (isConst(reference)) {
      return PrimitiveReference.create(emberToBool(reference.value()));
    }

    return new EmberishConditionalReference(reference);
  }

  resolveHelper(helperName: string, meta: TemplateMeta): Option<GlimmerHelper> {
    let specifier = this.resolver.lookupHelper(helperName, meta);
    return specifier && this.resolver.resolve<GlimmerHelper>(specifier);
  }

  resolvePartial(partialName: string, meta: TemplateMeta): Option<PartialDefinition> {
    let specifier = this.resolver.lookupPartial(partialName, meta);
    return specifier && this.resolver.resolve<PartialDefinition>(specifier);
  }

  componentHelper(name: string, meta: TemplateMeta): Option<CurriedDefinition> {
    let specifier = this.resolver.lookupComponent(name, meta);

    if (!specifier) return null;

    let spec = this.resolver.resolve<ComponentSpec>(specifier);
    return curry(spec);
  }

  resolveModifier(modifierName: string, meta: TemplateMeta): Option<ModifierManager> {
    let specifier = this.resolver.lookupModifier(modifierName, meta);
    return specifier && this.resolver.resolve<ModifierManager>(specifier);
  }

  compile(template: string, meta: TemplateMeta = {}): Template {
    let wrapper = JSON.parse(precompile(template, { meta }));
    let factory = templateFactory(wrapper);
    return factory.create(this.compileOptions);
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

export function createTemplate(templateSource: string, meta: TemplateMeta = {}): ParsedLayout {
  let wrapper: SerializedTemplateWithLazyBlock<TemplateMeta> = JSON.parse(precompile(templateSource, { meta }));
  let block: SerializedTemplateBlock = JSON.parse(wrapper.block);

  return { block, meta };
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

export interface BasicComponentFactory {
  new (): BasicComponent;
}

export abstract class GenericComponentDefinition<T> {
  abstract capabilities: ComponentCapabilities;

  constructor(public name: string, public manager: ComponentManager<T, GenericComponentDefinition<T>>, public ComponentClass: any, public layout: Option<TestSpecifier>) {
  }

  toJSON() {
    return { GlimmerDebug: `<component ${this.name}>` };
  }
}

export class BasicComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public name: string;
  public ComponentClass: BasicComponentFactory;
  public capabilities: ComponentCapabilities = {
    staticDefinitions: false,
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: true,
    elementHook: false
  };
}

class StaticTaglessComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public ComponentClass: BasicComponentFactory;
  public capabilities: ComponentCapabilities = {
    staticDefinitions: false,
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false
  };
}

export interface EmberishCurlyComponentFactory {
  positionalParams: Option<string | string[]>;
  create(options: { attrs: Attrs, targetObject: any }): EmberishCurlyComponent;
}

const CURLY_CAPABILITIES: ComponentCapabilities = {
  staticDefinitions: false,
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true
};

export class EmberishCurlyComponentDefinition extends GenericComponentDefinition<EmberishCurlyComponent> {
  public ComponentClass: EmberishCurlyComponentFactory;

  public capabilities: ComponentCapabilities = CURLY_CAPABILITIES;
}

export interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

export class EmberishGlimmerComponentDefinition extends GenericComponentDefinition<EmberishGlimmerStateBucket> {
  public ComponentClass: EmberishGlimmerComponentFactory;

  public capabilities: ComponentCapabilities = {
    staticDefinitions: false,
    dynamicLayout: false,
    dynamicTag: true,
    prepareArgs: false,
    createArgs: true,
    attributeHook: true,
    elementHook: false
  };
}

export function inspectHooks<T>(ComponentClass: T): T {
  return (ComponentClass as any).extend({
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

function hashToArgs(hash: Option<WireFormat.Core.Hash>): Option<WireFormat.Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}

export function equalsElement(element: Element | null, tagName: string, attributes: Object, content: string) {
  if (element === null) {
    QUnit.assert.pushResult({
      result: false,
      actual: element,
      expected: true,
      message: `failed - expected element to not be null`
    });
    return;
  }

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
      result: expectedAttrs[prop].match(element && element.getAttribute(prop)),
      actual: matcher.fail(element && element.getAttribute(prop)),
      expected: matcher.fail(element && element.getAttribute(prop)),
      message: `Expected element's ${prop} attribute ${matcher.expected()}`
    });
  }

  let actualAttributes = {};
  if (element) {
    for (let i = 0, l = element.attributes.length; i < l; i++) {
      actualAttributes[element.attributes[i].name] = element.attributes[i].value;
    }
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
