import {
  // VM
  VM,
  DynamicScope,

  // Compiler
  CompiledProgram,
  CompilableLayout,
  compileLayout,
  compileArgs,

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
  ComponentBuilder,

  // Values
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs,

  // Syntax Classes
  BlockMacros,
  InlineMacros,
  NestedBlockSyntax,
  CompileBlockMacro,
  BaselineSyntax,

  // References
  PrimitiveReference,
  ConditionalReference,

  // Misc
  Bounds,
  ElementOperations,
  FunctionExpression,
  OpcodeBuilderDSL,
  Simple,
  getDynamicVar,

  Template,
  Layout,
  isComponentDefinition,
  PositionalArgsSyntax,
  GetSyntax
} from "glimmer-runtime";

import {
  compile as rawCompile,
  compileLayout as rawCompileLayout
} from "./helpers";

import {
  Destroyable,
  Dict,
  Opaque,
  FIXME,
  assign,
  dict,
  unwrap
} from 'glimmer-util';

import GlimmerObject, { GlimmerObjectFactory } from "glimmer-object";

import {
  VOLATILE_TAG,
  DirtyableTag,
  RevisionTag,
  Reference,
  PathReference,
  OpaqueIterator,
  OpaqueIterable,
  AbstractIterable,
  IterationItem,
  isConst
} from "glimmer-reference";

import {
  UpdatableReference
} from "glimmer-object-reference";

import {
  SymbolTable
} from 'glimmer-interfaces';

import * as WireFormat from 'glimmer-wire-format';

import {
  TemplateMeta,
} from "glimmer-wire-format";

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

  next(): IterationItem<Opaque, number> {
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

  next(): IterationItem<Opaque, string> {
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
  public tag: RevisionTag;
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
      let array = [];
      iterable.forEach(function(item) {
        array.push(item);
      });
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
export type AttrsDiff = { oldAttrs: Attrs, newAttrs: Attrs };

export class BasicComponent {
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;

  constructor(attrs: Attrs) {
    this.attrs = attrs;
  }
}

export class EmberishCurlyComponent extends GlimmerObject {
  public dirtinessTag = new DirtyableTag();
  public tagName: string = null;
  public attributeBindings: string[] = null;
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Component = null;
  public args: ProcessedArgs;

  static create(args: { attrs: Attrs }): EmberishCurlyComponent {
    return super.create(args) as EmberishCurlyComponent;
  }

  recompute() {
    this.dirtinessTag.dirty();
  }

  didInitAttrs(options : { attrs : Attrs }) {}
  didUpdateAttrs(diff : AttrsDiff) {}
  didReceiveAttrs(diff : AttrsDiff) {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

export class EmberishGlimmerComponent extends GlimmerObject {
  public dirtinessTag = new DirtyableTag();
  public attrs: Attrs;
  public element: Element;
  public bounds: Bounds;
  public parentView: Component = null;

  static create(args: { attrs: Attrs }): EmberishGlimmerComponent {
    return super.create(args) as EmberishGlimmerComponent;
  }

  recompute() {
    this.dirtinessTag.dirty();
  }

  didInitAttrs(options : { attrs : Attrs }) {}
  didUpdateAttrs(diff : AttrsDiff) {}
  didReceiveAttrs(diff : AttrsDiff) {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

class BasicComponentManager implements ComponentManager<BasicComponent> {
  prepareArgs(definition: BasicComponentDefinition, args: EvaluatedArgs): EvaluatedArgs {
    return args;
  }

  create(environment: Environment, definition: BasicComponentDefinition, args: EvaluatedArgs): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass(args.named.value());
  }

  layoutFor(definition: BasicComponentDefinition, component: BasicComponent, env: TestEnvironment): CompiledProgram {
    let layout = env.compiledLayouts[definition.name];

    if (layout) {
      return layout;
    }

    return env.compiledLayouts[definition.name] = compileLayout(new BasicComponentLayoutCompiler(definition.layoutString), env);
  }

  getSelf(component: BasicComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: BasicComponent, element: Element) {
    component.element = element;
  }

  didRenderLayout(component: BasicComponent, bounds: Bounds) {
    component.bounds = bounds;
  }

  didCreate() {}

  getTag() {
    return null;
  }

  update(component: BasicComponent, attrs: EvaluatedArgs) {
    component.attrs = attrs.named.value();
  }

  didUpdateLayout() {}

  didUpdate() {}

  getDestructor() {
    return null;
  }
}

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();

class StaticTaglessComponentManager extends BasicComponentManager {
  layoutFor(definition: StaticTaglessComponentDefinition, component: BasicComponent, env: TestEnvironment): CompiledProgram {
    let layout = env.compiledLayouts[definition.name];

    if (layout) {
      return layout;
    }

    return env.compiledLayouts[definition.name] = compileLayout(new StaticTaglessComponentLayoutCompiler(definition.layoutString), env);
  }
}

const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;

class EmberishGlimmerComponentManager implements ComponentManager<EmberishGlimmerComponent> {
  prepareArgs(definition: EmberishGlimmerComponentDefinition, args: EvaluatedArgs): EvaluatedArgs {
    return args;
  }

  create(environment: Environment, definition: EmberishGlimmerComponentDefinition, args: EvaluatedArgs, dynamicScope, callerSelf: PathReference<Opaque>, hasDefaultBlock: boolean): EmberishGlimmerComponent {
    let klass = definition.ComponentClass || BaseEmberishGlimmerComponent;
    let attrs = args.named.value();
    let component = klass.create({ attrs });

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  layoutFor(definition: EmberishGlimmerComponentDefinition, component: EmberishGlimmerComponent, env: TestEnvironment): CompiledProgram {
    if (env.compiledLayouts[definition.name]) {
      return env.compiledLayouts[definition.name];
    }
    return env.compiledLayouts[definition.name] = compileLayout(new EmberishGlimmerComponentLayoutCompiler(definition.layoutString), env);
  }

  getSelf(component: EmberishGlimmerComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: EmberishGlimmerComponent, element: Element) {
    component.element = element;
  }

  didRenderLayout(component: EmberishGlimmerComponent, bounds: Bounds) {
    component.bounds = bounds;
  }

  didCreate(component: EmberishGlimmerComponent) {
    component.didInsertElement();
    component.didRender();
  }

  getTag(component: EmberishGlimmerComponent) {
    return component.dirtinessTag;
  }

  update(component: EmberishGlimmerComponent, args: EvaluatedArgs) {
    let oldAttrs = component.attrs;
    let newAttrs = args.named.value();

    component.set('attrs', newAttrs);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout() {}

  didUpdate(component: EmberishGlimmerComponent) {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishGlimmerComponent): Destroyable {
    return {
      destroy() {
        component.destroy();
      }
    };
  }
}

export class ProcessedArgs {
  tag: RevisionTag;
  named: EvaluatedNamedArgs;
  positional: EvaluatedPositionalArgs;
  positionalParamNames: Array<string>;

  constructor(args: EvaluatedArgs, positionalParamsDefinition: string[]) {
    this.tag = args.tag;
    this.named = args.named;
    this.positional = args.positional;
    this.positionalParamNames = positionalParamsDefinition;
  }

  value() {
    let { named, positional, positionalParamNames } = this;

    let merged = Object.assign({}, named.value());

    if (positionalParamNames && positionalParamNames.length) {
      for (let i = 0; i < positionalParamNames.length; i++) {
        let name = positionalParamNames[i];
        let reference = positional.at(i);

        merged[name] = reference.value();
      }
    }

    return {
      attrs: merged,
      props: merged
    };
  }
}

function processArgs(args: EvaluatedArgs, positionalParamsDefinition: string[]) : ProcessedArgs {
  return new ProcessedArgs(args, positionalParamsDefinition);
}

const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();

const BaseEmberishCurlyComponent = EmberishCurlyComponent.extend() as typeof EmberishCurlyComponent;

class EmberishCurlyComponentManager implements ComponentManager<EmberishCurlyComponent> {
  prepareArgs(definition: EmberishCurlyComponentDefinition, args: EvaluatedArgs, dynamicScope: DynamicScope): EvaluatedArgs {
    let dyn = definition.ComponentClass ? definition.ComponentClass['fromDynamicScope'] : null;
    if (dyn) {
      let map = assign({}, args.named.map);
      dyn.forEach(name => map[name] = dynamicScope.get(name));
      args = EvaluatedArgs.create(args.positional, EvaluatedNamedArgs.create(map), args.blocks);
    }
    return args;
  }

  create(environment: Environment, definition: EmberishCurlyComponentDefinition, args: EvaluatedArgs, dynamicScope: DynamicScope, callerSelf: PathReference<Opaque>): EmberishCurlyComponent {
    let klass = definition.ComponentClass || BaseEmberishCurlyComponent;
    let processedArgs = processArgs(args, klass['positionalParams']);
    let { attrs } = processedArgs.value();
    let self = callerSelf.value();
    let merged = assign({}, attrs, { attrs }, { args: processedArgs }, { targetObject: self });
    let component = klass.create(merged);

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  layoutFor(definition: EmberishCurlyComponentDefinition, component: EmberishCurlyComponent, env: TestEnvironment): CompiledProgram {
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

  didCreateElement(component: EmberishCurlyComponent, element: Element, operations: ElementOperations) {
    component.element = element;

    let bindings = component.attributeBindings;
    let rootRef = new UpdatableReference(component);

    if (bindings) {
      for (let i=0; i<bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.addDynamicAttribute(element, attribute, reference, false);
      }
    }
  }

  didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds) {
    component.bounds = bounds;
  }

  didCreate(component: EmberishCurlyComponent) {
    component.didInsertElement();
    component.didRender();
  }

  getTag(component: EmberishCurlyComponent) {
    return component.dirtinessTag;
  }

  update(component: EmberishCurlyComponent, args: EvaluatedArgs) {
    let oldAttrs = component.attrs;
    let newAttrs = component.args.value().attrs;
    let merged = assign({}, newAttrs, { attrs: newAttrs });

    component.setProperties(merged);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout() {}

  didUpdate(component: EmberishCurlyComponent) {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishCurlyComponent): Destroyable {
    return {
      destroy () {
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
  private args: EvaluatedArgs;
  public tag = VOLATILE_TAG;

  constructor(helper: UserHelper, args: EvaluatedArgs) {
    this.helper = helper;
    this.args = args;
  }

  value() {
    let { helper, args: { positional, named } } = this;

    return helper(positional.value(), named.value());
  }

  get(prop: string): SimplePathReference<Opaque> {
    return new SimplePathReference(this, prop);
  }
}

class InertModifierManager implements ModifierManager<Opaque> {
  create() {}

  install(modifier: Opaque) {}

  update(modifier: Opaque) {}

  getDestructor(modifier: Opaque): Destroyable {
    return null;
  }
}

export class TestModifier {
  constructor(
    public element: Element,
    public args: EvaluatedArgs,
    public dom: IDOMChanges
  ) {}
}

export class TestModifierManager implements ModifierManager<TestModifier> {
  public installedElements: Element[] = [];
  public updatedElements: Element[] = [];
  public destroyedModifiers: TestModifier[] = [];

  create(element: Element, args: EvaluatedArgs, dynamicScope: DynamicScope, dom: IDOMChanges): TestModifier {
    return new TestModifier(element, args, dom);
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

export class TestEnvironment extends Environment {
  private helpers = dict<GlimmerHelper>();
  private modifiers = dict<ModifierManager<Opaque>>();
  private partials = dict<PartialDefinition<{}>>();
  private components = dict<ComponentDefinition<any>>();
  private uselessAnchor: HTMLAnchorElement;
  public compiledLayouts = dict<CompiledProgram>();

  constructor(options: TestEnvironmentOptions = {
    document: document,
    appendOperations: new DOMTreeConstruction(document)
  }) {
    super({ appendOperations: options.appendOperations, updateOperations: new DOMChanges(options.document as Document) });

    this.uselessAnchor = options.document.createElement('a') as HTMLAnchorElement;
    this.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);
    this.registerHelper("unless", ([cond, yes, no]) => cond ? no : yes);
    this.registerInternalHelper("-get-dynamic-var", getDynamicVar);
    this.registerModifier("action", new InertModifierManager());

    this.registerInternalHelper("component", (vm, args, symbolTable) => {
      return new DynamicComponentReference(args.positional.at(0), vm.env, symbolTable);
    });

    this.registerInternalHelper("hash", (vm, args) => args.named);
  }

  protocolForURL(url: string): string {
    this.uselessAnchor.href = url;
    return this.uselessAnchor.protocol;
  }

  registerHelper(name: string, helper: UserHelper) {
    this.helpers[name] = (vm: VM, args: EvaluatedArgs) => new HelperReference(helper, args);
  }

  registerInternalHelper(name: string, helper: GlimmerHelper) {
    this.helpers[name] = helper;
  }

  registerModifier(name: string, modifier: ModifierManager<Opaque>) {
    this.modifiers[name] = modifier;
  }

  registerPartial(name: string, source: string) {
    this.partials[name] = new PartialDefinition(name, rawCompile(source, { env: this }));
  }

  registerComponent(name: string, definition: ComponentDefinition<any>) {
    this.components[name] = definition;
    return definition;
  }

  registerBasicComponent<T extends BasicComponent>(name: string, Component: BasicComponentFactory, layout: string): ComponentDefinition<BasicComponentDefinition> {
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

  macros(): { blocks: BlockMacros, inlines: InlineMacros } {
    let macros = super.macros();
    populateBlocks(macros.blocks, macros.inlines);
    return macros;
  }

  hasHelper(helperName: string[]) {
    return helperName.length === 1 && (<string>helperName[0] in this.helpers);
  }

  lookupHelper(helperParts: string[]) {
    let helperName = helperParts[0];

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);

    return helper;
  }

  hasPartial(partialName: string) {
    return partialName in this.partials;
  }

  lookupPartial(partialName: string) {
    let partial = this.partials[partialName];

    return partial;
  }

  hasComponentDefinition(name: string[]): boolean {
    return !!this.components[name[0]];
  }

  getComponentDefinition(name: string[], blockMeta?: TemplateMeta): ComponentDefinition<any> {
    return this.components[name[0]];
  }

  hasModifier(modifierName: string[]): boolean {
    return modifierName.length === 1 && (<string>modifierName[0] in this.modifiers);
  }

  lookupModifier(modifierName: string[]): ModifierManager<Opaque> {
    let [name] = modifierName;

    let modifier = this.modifiers[name];

    if(!modifier) throw new Error(`Modifier for ${modifierName.join('.')} not found.`);
    return modifier;
  }

  compile(template: string): Template<undefined> {
    return rawCompile<undefined>(template, { env: this });
  }

  compileLayout(template: string): Layout {
    return rawCompileLayout(template, { env: this });
  }

  iterableFor(ref: Reference<Opaque>, args: EvaluatedArgs): OpaqueIterable {
    let keyPath = args.named.get("key").value() as FIXME<any, "User value to lookup key">;
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
        keyFor = (item: Opaque) => item[keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
}

export class TestDynamicScope implements DynamicScope {
  private bucket;

  constructor(bucket=null) {
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

class DynamicComponentReference implements PathReference<ComponentDefinition<Opaque>> {
  public tag: RevisionTag;

  constructor(private nameRef: PathReference<Opaque>, private env: Environment, private symbolTable: SymbolTable) {
    this.tag = nameRef.tag;
  }

  value(): ComponentDefinition<Opaque> {
    let { env, nameRef } = this;

    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      return env.getComponentDefinition([nameOrDef], this.symbolTable);
    } else if (isComponentDefinition(nameOrDef)) {
      return nameOrDef;
    }

    return null;
  }

  get() {
    return null;
  }
}

function dynamicComponentFor(vm: VM, symbolTable: SymbolTable) {
  let args = vm.getArgs();
  let nameRef = args.positional.at(0);
  let env = vm.env;
  return new DynamicComponentReference(nameRef, env, symbolTable);
};

export interface BasicComponentFactory {
  new(attrs: Dict<any>): BasicComponent;
}

export abstract class GenericComponentDefinition<T> extends ComponentDefinition<T> {
  public layoutString : string;

  constructor(name: string, manager: ComponentManager<T>, ComponentClass: any, layout: string) {
    super(name, manager, ComponentClass);
    this.layoutString = layout;
  }
}

export class BasicComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public ComponentClass: BasicComponentFactory;
}

class StaticTaglessComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public ComponentClass: BasicComponentFactory;
}

export interface EmberishCurlyComponentFactory {
  positionalParams?: string[];
  create(options: { attrs: Attrs, targetObject }): EmberishCurlyComponent;
}

export class EmberishCurlyComponentDefinition extends GenericComponentDefinition<EmberishCurlyComponent> {
  public ComponentClass: EmberishCurlyComponentFactory;
}

export interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

export class EmberishGlimmerComponentDefinition extends GenericComponentDefinition<EmberishGlimmerComponent> {
  public ComponentClass: EmberishGlimmerComponentFactory;
}

abstract class GenericComponentLayoutCompiler implements CompilableLayout {
  constructor(private layoutString: string) {}

  protected compileLayout(env: Environment) {
    return rawCompileLayout(this.layoutString, { env });
  }

  abstract compile(builder: ComponentLayoutBuilder);
}

class BasicComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  compile(builder: ComponentLayoutBuilder) {
    builder.fromLayout(this.compileLayout(builder.env));
  }
}

class StaticTaglessComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  compile(builder: ComponentLayoutBuilder) {
    builder.wrapLayout(this.compileLayout(builder.env));
  }
}

function EmberTagName(vm: VM): PathReference<string> {
  let self = vm.getSelf().value();
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
    builder.tag.dynamic(EmberTagName);
    builder.attrs.static('class', 'ember-view');
    builder.attrs.dynamic('id', EmberID);
  }
}

class EmberishGlimmerComponentLayoutCompiler extends GenericComponentLayoutCompiler {
  compile(builder: ComponentLayoutBuilder) {
    builder.fromLayout(this.compileLayout(builder.env));
    builder.attrs.static('class', 'ember-view');
    builder.attrs.dynamic('id', EmberID);
  }
}

export function inspectHooks<T extends Component>(ComponentClass: GlimmerObjectFactory<T>): GlimmerObjectFactory<T> {
  return ComponentClass.extend({
    init() {
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

    didInitAttrs() {
      this._super(...arguments);
      this.hooks['didInitAttrs']++;
    },

    didUpdateAttrs() {
      this._super(...arguments);
      this.hooks['didUpdateAttrs']++;
    },

    didReceiveAttrs() {
      this._super(...arguments);
      this.hooks['didReceiveAttrs']++;
    },

    willInsertElement() {
      this._super(...arguments);
      this.hooks['willInsertElement']++;
    },

    willUpdate() {
      this._super(...arguments);
      this.hooks['willUpdate']++;
    },

    willRender() {
      this._super(...arguments);
      this.hooks['willRender']++;
    },

    didInsertElement() {
      this._super(...arguments);
      this.hooks['didInsertElement']++;
    },

    didUpdate() {
      this._super(...arguments);
      this.hooks['didUpdate']++;
    },

    didRender() {
      this._super(...arguments);
      this.hooks['didRender']++;
    }
  });
}

const { defaultBlock, inverseBlock, params, hash } = BaselineSyntax.NestedBlock;

function populateBlocks(blocks: BlockMacros, inlines: InlineMacros): { blocks: BlockMacros, inlines: InlineMacros } {
  blocks.add('identity', (sexp: NestedBlockSyntax, builder: OpcodeBuilderDSL) => {
    builder.evaluate(sexp[4]);
  });

  blocks.add('render-inverse', (sexp: NestedBlockSyntax, builder: OpcodeBuilderDSL) => {
    builder.evaluate(sexp[5]);
  });

  blocks.add('-with-dynamic-vars', (sexp, builder) => {
    let block = defaultBlock(sexp);
    let args = compileArgs(params(sexp), hash(sexp), builder);

    builder.unit(b => {
      b.putArgs(args);
      b.pushDynamicScope();
      b.bindDynamicScope(args.named.keys as string[]);
      b.evaluate(unwrap(block));
      b.popDynamicScope();
    });
  });

  blocks.add('-in-element', (sexp, builder) => {
    let block = defaultBlock(sexp);
    let args = compileArgs(params(sexp), hash(sexp), builder);

    builder.putArgs(args);
    builder.test('simple');

    builder.labelled(null, b => {
      b.jumpUnless('END');
      b.pushRemoteElement();
      b.evaluate(unwrap(block));
      b.popRemoteElement();
    });
  });

  blocks.add('component', (sexp, builder) => {
    let [, path, params, hash, _default, inverse] = sexp;
    let definitionArgs: BaselineSyntax.Args = [params.slice(0, 1), null, null, null];
    let args: BaselineSyntax.Args = [params.slice(1), hash, _default, inverse];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
    return true;
  });

  blocks.addMissing((sexp, builder) => {
    let [, path, params, hash, _default, inverse] = sexp;
    let table = builder.symbolTable;

    let definition = builder.env.getComponentDefinition(path, builder.symbolTable);

    if (definition) {
      builder.component.static(definition, [params, hash, _default, inverse], table);
      return true;
    }

    return false;
  });

  inlines.add('component', (path, params, hash, builder) => {
    let definitionArgs: BaselineSyntax.Args = [params.slice(0, 1), null, null, null];
    let args: BaselineSyntax.Args = [params.slice(1), hash, null, null];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
    return true;
  });

  inlines.addMissing((path, params, hash, builder) => {
    let table = builder.symbolTable;

    let definition = builder.env.getComponentDefinition(path, builder.symbolTable);

    if (definition) {
      builder.component.static(definition, [params, hash, null, null], table);
      return true;
    }

    return false;
  });

  return { blocks, inlines };
}

export function equalsElement(element: Element, tagName: string, attributes: Object, content: string) {
  QUnit.push(element.tagName === tagName.toUpperCase(), element.tagName.toLowerCase(), tagName, `expect tagName to be ${tagName}`);

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equalsAttr(expected);
    expectedAttrs[prop] = matcher;

    QUnit.push(
      expectedAttrs[prop].match(element.getAttribute(prop)),
      matcher.fail(element.getAttribute(prop)),
      matcher.fail(element.getAttribute(prop)),
      `Expected element's ${prop} attribute ${matcher.expected()}`
    );
  }

  let actualAttributes = {};
  for (let i = 0, l = element.attributes.length; i < l; i++) {
    actualAttributes[element.attributes[i].name] = element.attributes[i].value;
  }

  if (!(element instanceof HTMLElement)) {
    QUnit.push(element instanceof HTMLElement, null, null, "Element must be an HTML Element, not an SVG Element");
  } else {
    QUnit.push(
      element.attributes.length === expectedCount,
      element.attributes.length, expectedCount,
      `Expected ${expectedCount} attributes; got ${element.outerHTML}`
    );

    if (content !== null) {
      QUnit.push(element.innerHTML === content, element.innerHTML, content, `The element had '${content}' as its content`);
    }
  }
}

interface Matcher {
  "3d4ef194-13be-4ccf-8dc7-862eea02c93e": boolean;
  match(actual): boolean;
  fail(actual): string;
  expected(): string;
}

export const MATCHER = "3d4ef194-13be-4ccf-8dc7-862eea02c93e";

export function equalsAttr(expected) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function equals(expected) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual) {
      return `${actual} did not equal ${expected}`;
    }
  };
}

export function regex(r) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(v) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual) {
      return `${actual} did not match ${r}`;
    }
  };
}

export function classes(expected: string) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual) {
      return actual && (expected.split(' ').sort().join(' ') === actual.split(' ').sort().join(' '));
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual) {
      return `'${actual}'' did not match '${expected}'`;
    }
  };
}
