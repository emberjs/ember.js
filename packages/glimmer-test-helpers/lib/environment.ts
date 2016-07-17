import {
  // VM
  VM,
  DynamicScope,

  // Compiler
  Compilable,
  CompileInto,
  CompiledBlock,
  StatementCompilationBuffer,
  OpcodeBuilder,
  SymbolLookup,
  compileLayout,

  // Environment
  ParsedStatement,
  Environment,
  Helper as GlimmerHelper,
  ModifierManager,
  DOMHelper,
  IDOMHelper,

  // Opcodes
  EvaluateOpcode,
  PutArgsOpcode,
  PushDynamicScopeOpcode,
  PopDynamicScopeOpcode,
  BindDynamicScopeOpcode,

  // Partials
  PartialDefinition,

  // Components
  Component,
  ComponentManager,
  ComponentDefinition,
  ComponentLayoutBuilder,
  DynamicComponentOptions,
  StaticComponentOptions,

  // Values
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs,

  // Syntax Classes
  StatementSyntax,

  // Concrete Syntax
  Layout,
  Templates,
  ArgsSyntax,

  // References
  ValueReference,
  ConditionalReference,

  // Misc
  ElementOperations,
  FunctionExpression
} from "glimmer-runtime";

import {
  compileRealSpec,
  compile as rawCompile,
  compileLayout as rawCompileLayout
} from "./helpers";

import {
  FIXME,
  Destroyable,
  Opaque,
  Dict,
  InternedString,
  assign,
  dict
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
  BlockMeta
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
  private ref: Reference<Opaque>;
  private keyFor: KeyFor<Opaque>;

  constructor(ref: Reference<Opaque>, keyFor: KeyFor<Opaque>) {
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
type AttrsDiff = { oldAttrs: Attrs, newAttrs: Attrs };

export class BasicComponent {
  public attrs: Attrs;
  public element: Element;

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
  create(definition: BasicComponentDefinition, args: EvaluatedArgs): BasicComponent {
    let klass = definition.ComponentClass || BasicComponent;
    return new klass(args.named.value());
  }

  layoutFor(definition: BasicComponentDefinition, component: BasicComponent, env: Environment): CompiledBlock {
    return compileLayout(new BasicComponentLayoutCompiler(definition.layoutString), env);
  }

  getSelf(component: BasicComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: BasicComponent, element: Element) {
    component.element = element;
  }

  didCreate() {}

  getTag() {
    return null;
  }

  update(component: BasicComponent, attrs: EvaluatedArgs) {
    component.attrs = attrs.named.value();
  }

  didUpdate() {}

  getDestructor() {
    return null;
  }
}

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();

class StaticTaglessComponentManager extends BasicComponentManager {
  layoutFor(definition: StaticTaglessComponentDefinition, component: BasicComponent, env: Environment): CompiledBlock {
    return compileLayout(new StaticTaglessComponentLayoutCompiler(definition.layoutString), env);
  }
}

const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

const BaseEmberishGlimmerComponent = EmberishGlimmerComponent.extend() as typeof EmberishGlimmerComponent;

class EmberishGlimmerComponentManager implements ComponentManager<EmberishGlimmerComponent> {
  create(definition: EmberishGlimmerComponentDefinition, args: EvaluatedArgs, dynamicScope, hasDefaultBlock: boolean): EmberishGlimmerComponent {
    let klass = definition.ComponentClass || BaseEmberishGlimmerComponent;
    let attrs = args.named.value();
    let component = klass.create({ attrs });

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  layoutFor(definition: EmberishGlimmerComponentDefinition, component: EmberishGlimmerComponent, env: Environment): CompiledBlock {
    return compileLayout(new EmberishGlimmerComponentLayoutCompiler(definition.layoutString), env);
  }

  getSelf(component: EmberishGlimmerComponent): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: EmberishGlimmerComponent, element: Element) {
    component.element = element;
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

  didUpdate(component: EmberishGlimmerComponent) {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishGlimmerComponent): Destroyable {
    return component;
  }
}

class ProcessedArgs {
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

    let result = named.value();

    if (positionalParamNames && positionalParamNames.length) {
      for (let i = 0; i < positionalParamNames.length; i++) {
        let name = positionalParamNames[i];
        let reference = positional.at(i);

        result[name] = reference.value();
      }
    }

    return {
      attrs: result,
      props: result
    };
  }
}

function processArgs(args: EvaluatedArgs, positionalParamsDefinition: string[]) : ProcessedArgs {
  return new ProcessedArgs(args, positionalParamsDefinition);
}

const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();

const BaseEmberishCurlyComponent = EmberishCurlyComponent.extend() as typeof EmberishCurlyComponent;

class EmberishCurlyComponentManager implements ComponentManager<EmberishCurlyComponent> {
  create(definition: EmberishCurlyComponentDefinition, args: EvaluatedArgs): EmberishCurlyComponent {
    let klass = definition.ComponentClass || BaseEmberishCurlyComponent;
    let processedArgs = processArgs(args, klass['positionalParams']);
    let { attrs } = processedArgs.value();
    let merged = assign({}, attrs, { attrs }, { args: processedArgs });
    let component = klass.create(merged);

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  layoutFor(definition: EmberishCurlyComponentDefinition, component: EmberishCurlyComponent, env: Environment): CompiledBlock {
    let layoutString = definition.layoutString;

    if (!layoutString && layoutString !== '') {
      layoutString = component['layout'];
    }

    return compileLayout(new EmberishCurlyComponentLayoutCompiler(layoutString), env);
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
        let attribute = bindings[i] as InternedString;
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.addAttribute(attribute, reference, false);
      }
    }
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

  didUpdate(component: EmberishCurlyComponent) {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: EmberishCurlyComponent): Destroyable {
    return component;
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
  private property: InternedString;
  public tag = VOLATILE_TAG;

  constructor(parent: Reference<T>, property: InternedString) {
    this.parent = parent;
    this.property = property;
  }

  value(): T {
    return this.parent.value()[<string>this.property];
  }

  get(prop: InternedString): PathReference<Opaque> {
    return new SimplePathReference(this, prop);
  }
}

type UserHelper = (args: any[], named: Dict<any>) => any;

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

  get(prop: InternedString): SimplePathReference<Opaque> {
    return new SimplePathReference(this, prop);
  }
}

class InertModifierManager implements ModifierManager<Opaque> {
  install(element: Element, args: EvaluatedArgs, dom: IDOMHelper): Opaque {
    return;
  }

  update(modifier: Opaque, element: Element, args: EvaluatedArgs, dom: IDOMHelper) {
    return;
  }

  getDestructor(modifier: Opaque): Destroyable {
    return null;
  }
}

interface TestModifier {
  element: Element;
  args: EvaluatedArgs;
  dom: IDOMHelper;
  destructor: Destroyable;
}

export class TestModifierManager implements ModifierManager<TestModifier> {
  public installedElements: Element[];
  public updatedElements: Element[];
  public destroyedModifiers: TestModifier[];

  constructor() {
    this.installedElements = [];
    this.updatedElements = [];
    this.destroyedModifiers = [];
  }

  install(element: Element, args: EvaluatedArgs, dom: IDOMHelper): TestModifier {
    let manager = this;
    this.installedElements.push(element);

    let param = args.positional.at(0).value();
    dom.setAttribute(element, 'data-modifier', `installed - ${param}`);

    let modifier: TestModifier;

    modifier = {
      element,
      args,
      dom,
      destructor: {
        destroy() {
          manager.destroyedModifiers.push(modifier);
          dom.removeAttribute(element, 'data-modifier');
        }
      }
    };

    return modifier;
  }

  update(modifier: TestModifier, element: Element, args: EvaluatedArgs, dom: IDOMHelper) {
    this.updatedElements.push(modifier.element);

    let param = args.positional.at(0).value();
    dom.setAttribute(element, 'data-modifier', `updated - ${param}`);

    return;
  }

  getDestructor(modifier: TestModifier): Destroyable {
    return modifier.destructor;
  }
}

export class TestEnvironment extends Environment {
  private helpers = dict<GlimmerHelper>();
  private modifiers = dict<ModifierManager<Opaque>>();
  private partials = dict<PartialDefinition>();
  private components = dict<ComponentDefinition<any>>();

  constructor(dom?: IDOMHelper) {
    super(dom || new DOMHelper(document));

    this.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);
    this.registerHelper("unless", ([cond, yes, no]) => cond ? no : yes);
    this.registerModifier("action", new InertModifierManager());
  }

  registerHelper(name: string, helper: UserHelper) {
    this.helpers[name] = (args: EvaluatedArgs) => new HelperReference(helper, args);
  }

  registerInternalHelper(name: string, helper: GlimmerHelper) {
    this.helpers[name] = helper;
  }

  registerModifier(name: string, modifier: ModifierManager<Opaque>) {
    this.modifiers[name] = modifier;
  }

  registerPartial(name: string, source: string) {
    this.partials[name] = new PartialDefinition(name, compileRealSpec(source, { env: this }));
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
      return new ValueReference(emberToBool(reference.value()));
    }

    return new EmberishConditionalReference(reference);
  }

  refineStatement(statement: ParsedStatement, parentMeta: BlockMeta): StatementSyntax {
    let {
      isSimple,
      isBlock,
      isInline,
      key,
      args,
      path,
      templates
    } = statement;

    if (isSimple && isBlock) {
      switch (key) {
        case 'identity':
          return new IdentitySyntax({ args, templates });
        case 'render-inverse':
          return new RenderInverseIdentitySyntax({ args, templates });
        case 'with-keywords':
          return new WithKeywordsSyntax({ args, templates });
      }
    }

    if (isSimple && (isInline || isBlock)) {
      if (key === 'component') {
        return new DynamicComponentSyntax({ args, templates });
      }

      let component = this.getComponentDefinition(path);

      if (component) {
        return new CurlyComponentSyntax({ args, definition: component, templates });
      }
    }

    return super.refineStatement(statement, parentMeta);
  }

  hasHelper(helperName: InternedString[]) {
    return helperName.length === 1 && (<string>helperName[0] in this.helpers);
  }

  lookupHelper(helperParts: string[]) {
    let helperName = helperParts[0];

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);

    return helper;
  }

  hasPartial(partialName: InternedString[]) {
    return partialName.length === 1 && (<string>partialName[0] in this.partials);
  }

  lookupPartial(partialParts: string[]) {
    let partialName = partialParts[0];

    let partial = this.partials[partialName];

    if (!partial) throw new Error(`partial for ${partialParts.join('.')} not found.`);

    return partial;
  }

  hasComponentDefinition(name: InternedString[]): boolean {
    return !!this.components[<string>name[0]];
  }

  getComponentDefinition(name: InternedString[]): ComponentDefinition<any> {
    return this.components[<string>name[0]];
  }

  hasModifier(modifierName: InternedString[]): boolean {
    return modifierName.length === 1 && (<string>modifierName[0] in this.modifiers);
  }

  lookupModifier(modifierName: InternedString[]): ModifierManager<Opaque> {
    let [name] = modifierName;

    let modifier = this.modifiers[name];

    if(!modifier) throw new Error(`Modifier for ${modifierName.join('.')} not found.`);
    return modifier;
  }

  compile(template: string) {
    return rawCompile(template, { env: this });
  }

  compileLayout(template: string) {
    return rawCompileLayout(template, { env: this });
  }

  hasKeyword(name: string): boolean {
    return name === 'view';
  }

  iterableFor(ref: Reference<Opaque>, args: EvaluatedArgs): OpaqueIterable {
    let keyPath = args.named.get("key" as InternedString).value();
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
        keyFor = (item: Opaque) => item[<string>keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
}

export class TestDynamicScope implements DynamicScope {
  view: PathReference<Opaque>;

  constructor(view: PathReference<Opaque>) {
    this.view = view;
  }

  set(assignment: Dict<PathReference<Opaque>>) {
    assign(this, assignment);
  }

  child(): TestDynamicScope {
    return new TestDynamicScope(this.view);
  }
}

class CurlyComponentSyntax extends StatementSyntax implements StaticComponentOptions {
  public definition: ComponentDefinition<any>;
  public args: ArgsSyntax;
  public shadow: InternedString[] = null;
  public templates: Templates;

  constructor({ args, definition, templates }: { args: ArgsSyntax, definition: ComponentDefinition<any>, templates: Templates }) {
    super();
    this.args = args;
    this.definition = definition;
    this.templates = templates || Templates.empty();
  }

  compile(b: OpcodeBuilder & SymbolLookup, env: Environment) {
    b.component.static(this);
  }
}

class DynamicComponentReference implements PathReference<ComponentDefinition<Opaque>> {
  private nameRef: PathReference<Opaque>;
  private env: Environment;
  public tag: RevisionTag;

  constructor({ nameRef, env, args }: { nameRef: PathReference<Opaque>, env: Environment, args: EvaluatedArgs }) {
    this.nameRef = nameRef;
    this.env = env;
    this.tag = args.tag;
  }

  value(): ComponentDefinition<Opaque> {
    let { env, nameRef } = this;

    let name = nameRef.value();

    if (typeof name === 'string') {
      return env.getComponentDefinition([name as FIXME<'user str InternedString'> as InternedString]);
    } else {
      return null;
    }
  }

  get() {
    return null;
  }
}

function dynamicComponentFor(vm: VM) {
  let args = vm.getArgs();
  let nameRef = args.positional.at(0);
  let env = vm.env;
  return new DynamicComponentReference({ nameRef, env, args });
};

class DynamicComponentSyntax extends StatementSyntax implements DynamicComponentOptions {
  public definitionArgs: ArgsSyntax;
  public definition: FunctionExpression<ComponentDefinition<Opaque>>;
  public args: ArgsSyntax;
  public shadow: InternedString[] = null;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0,1));
    this.definition = dynamicComponentFor;
    this.args = ArgsSyntax.build(args.positional.slice(1), args.named);
    this.templates = templates || Templates.empty();
  }

  compile(b: OpcodeBuilder & SymbolLookup, env: Environment) {
    b.component.dynamic(this);
  }
}

interface BasicComponentFactory {
  new(attrs: Dict<any>): BasicComponent;
}

abstract class GenericComponentDefinition<T> extends ComponentDefinition<T> {
  public layoutString : string;

  constructor(name: string, manager: ComponentManager<T>, ComponentClass: any, layout: string) {
    super(name, manager, ComponentClass);
    this.layoutString = layout;
  }
}

class BasicComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public ComponentClass: BasicComponentFactory;
}

class StaticTaglessComponentDefinition extends GenericComponentDefinition<BasicComponent> {
  public ComponentClass: BasicComponentFactory;
}

interface EmberishCurlyComponentFactory {
  positionalParams?: string[];
  create(options: { attrs: Attrs }): EmberishCurlyComponent;
}

class EmberishCurlyComponentDefinition extends GenericComponentDefinition<EmberishCurlyComponent> {
  public ComponentClass: EmberishCurlyComponentFactory;
}

interface EmberishGlimmerComponentFactory {
  create(options: { attrs: Attrs }): EmberishGlimmerComponent;
}

class EmberishGlimmerComponentDefinition extends GenericComponentDefinition<EmberishGlimmerComponent> {
  public ComponentClass: EmberishGlimmerComponentFactory;
}

abstract class GenericComponentLayoutCompiler implements Compilable {
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
  let tagName = self['tagName'];
  tagName = tagName === '' ? null : self['tagName'] || 'div';
  return new ValueReference(tagName);
}

function EmberID(vm: VM): PathReference<string> {
  let self = vm.getSelf().value() as { _guid: string };
  return new ValueReference(`ember${self._guid}`);
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

class IdentitySyntax extends StatementSyntax {
  type = "identity";

  public args: ArgsSyntax;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(compiler: CompileInto) {
    compiler.append(new EvaluateOpcode({ debug: "default", block: this.templates.default }));
  }
}

class RenderInverseIdentitySyntax extends StatementSyntax {
  type = "render-inverse-identity";

  public args: ArgsSyntax;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(compiler: CompileInto) {
    compiler.append(new EvaluateOpcode({ debug: "inverse", block: this.templates.inverse }));
  }
}

class WithKeywordsSyntax extends StatementSyntax {
  type = "with-keywords";

  public args: ArgsSyntax;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(compiler: StatementCompilationBuffer, env: Environment) {
    let args = this.args.compile(compiler, env);

    let callback = (_vm: VM, _scope: DynamicScope) => {
      let vm = _vm as any;
      let scope = _scope as any as TestDynamicScope;

      let args: EvaluatedArgs = vm.frame.getArgs();

      scope.set(args.named.map);
    };

    compiler.append(new PutArgsOpcode({ args }));
    compiler.append(new PushDynamicScopeOpcode());
    compiler.append(new BindDynamicScopeOpcode(callback));
    compiler.append(new EvaluateOpcode({ debug: "default", block: this.templates.default }));
    compiler.append(new PopDynamicScopeOpcode());
  }
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
