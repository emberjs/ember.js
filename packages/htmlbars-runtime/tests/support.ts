import {
  ATTRIBUTE_SYNTAX,
  Environment,
  DOMHelper,
  StatementSyntax,
  Params,
  EvaluatedParamsAndHash,
  ParamsAndHash,
  ElementStack,
  Morph,
  ContentMorph,
  EmptyableMorph,
  TemplateMorph,
  MorphList,
  MorphListOptions,
  Template,
  Templates,
  Append,
  Unknown,
  Hash,
  EvaluatedHash,
  Frame,
  HelperSyntax,
  AttributeSyntax,
  DynamicAttr,
  StaticAttr,
  AddClass,
  EvaluatedRef,
  GetSyntax,
  ValueSyntax,
  BlockSyntax,
  OpenElement,
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  AppendingComponent,
  AppendingComponentOptions,
  AppendingComponentClass,
  ComponentHooks,
  Component,
  Scope,
  Block,
  NullHandler,
  builders,
  isWhitespace,
  createMorph,
  appendComponent
} from "htmlbars-runtime";
import { compile as rawCompile } from "htmlbars-compiler";
import { LITERAL, LinkedList, Dict, InternedString, dict, assign, intern } from 'htmlbars-util';

import { Meta, ConstReference, ChainableReference, setProperty as set } from "htmlbars-reference";

export function compile(template: string) {
  return rawCompile(template, { disableComponentGeneration: true });
}

interface TestScopeOptions {
  component: Component;
}

class TestScope extends Scope<TestScopeOptions> {
  private hostOptions: TestScopeOptions = null;

  child(localNames: InternedString[]): TestScope {
    return new TestScope(this, this.meta, localNames);
  }

  bindHostOptions(options: TestScopeOptions) {
    this.hostOptions = options;
  }

  getHostOptions(): TestScopeOptions {
    return this.hostOptions || (this.parent && this.parent.getHostOptions());
  }
}

const hooks: ComponentHooks = {
  begin() {},
  commit() {},

  didReceiveAttrs(component) {
    if (typeof component.didReceiveAttrs === 'function') component.didReceiveAttrs();
  },

  didInsertElement(component) {
    if (typeof component.didInsertElement === 'function') component.didInsertElement();
  },

  didRender(component) {
    if (typeof component.didRender === 'function') component.didRender();
  },

  willRender(component) {
    if (typeof component.willRender === 'function') component.willRender();
  },

  willUpdate(component) {
    if (typeof component.willUpdate === 'function') component.willUpdate();
  },

  didUpdate(component) {
    if (typeof component.didUpdate === 'function') component.didUpdate();
  },

  didUpdateAttrs(component) {
    if (typeof component.didUpdateAttrs === 'function') component.didUpdateAttrs();
  }
};

export class TestEnvironment extends Environment<TestScopeOptions> {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  createRootScope(): TestScope {
    return new TestScope(null, this.meta, []);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, ComponentClass: ComponentClass, layout: string, AppendingComponent: AppendingComponentClass) {
    let testHooks = new HookIntrospection(hooks);
    let definition = new ComponentDefinition(testHooks, ComponentClass, compile(layout), AppendingComponent);
    this.components[name] = definition;
    return definition;
  }

  registerCurlyComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    return this.registerComponent(name, Component, layout, CurlyAppendingComponent)
  }

  registerEmberishComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    return this.registerComponent(name, Component, layout, CurlyEmberishAppendingComponent);
  }

  registerGlimmerComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    return this.registerComponent(name, Component, layout, GlimmerAppendingComponent);
  }

  registerEmberishGlimmerComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    return this.registerComponent(name, Component, layout, GlimmerEmberishAppendingComponent);
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    let type = statement.type;
    let block = type === 'block' ? <BlockSyntax>statement : null;
    let append = type === 'append' ? <Append>statement : null;


    let hash: Hash;
    let args: ParamsAndHash;
    let path: InternedString[];
    let unknown: Unknown;
    let helper: HelperSyntax;

    if (block) {
      args = block.args;
      hash = args.hash;
      path = block.path;
    } else if (append && append.value.type === 'unknown') {
      unknown = <Unknown>append.value;
      args = ParamsAndHash.empty();
      hash = Hash.empty();
      path = unknown.ref.path();
    } else if (append && append.value.type === 'helper') {
      helper = <HelperSyntax>append.value;
      args = helper.args;
      hash = args.hash;
      path = helper.ref.path();
    }

    let key: InternedString, isSimple: boolean;

    if (path) {
      isSimple = path.length === 1;
      key = path[0];
    }

    if (isSimple) {
      if (block && key === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
      }

      if (block && key === 'if') {
        return new IfSyntax({ args: block.args, templates: block.templates });
      }

      if (key === 'component') {
        return new DynamicComponentSyntax({ key, args, templates: block && block.templates });
      }

      let definition = this.components[<string>key];

      if (definition) {
        let templates = block && block.templates;
        return (new CurlyComponent({ path, templates }).withArgs(args));
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope: TestScope, helperParts: string[]) {
    let helperName = helperParts[0];

    if (helperName === 'hasBlock') return new ConstReference(hasBlock(scope));
    if (helperName === 'hasBlockParams') return new ConstReference(hasBlockParams(scope));

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);
    return new ConstReference(this.helpers[helperName]);
  }

  getComponentDefinition(scope, name: string[], syntax: StatementSyntax): ComponentDefinition {
    return this.components[name[0]];
  }
}

function hasBlock(scope: TestScope) {
  return function([name]: [InternedString]) {
    return !!scope.getBlock(name || LITERAL('default'));
  }
}

function hasBlockParams(scope: TestScope) {
  return function([name]: [InternedString]) {
    let block = scope.getBlock(name || LITERAL('default'));
    if (!block) return false;
    return !!block.template.arity;
  }
}

export class HookIntrospection implements ComponentHooks {
  private inner: ComponentHooks;
  public hooks: { [index: string]: Component[] } = {};

  constructor(hooks: ComponentHooks) {
    this.inner = hooks;
  }

  begin(component: Component) {
    this.hooks = {};
    this.inner.begin(component)
  }

  commit(component: Component) {
    this.inner.commit(component);
  }

  didReceiveAttrs(component: Component) {
    this.initialize('didReceiveAttrs').push(component);
    this.inner.didReceiveAttrs(component);
  }

  didUpdateAttrs(component: Component) {
    this.initialize('didUpdateAttrs').push(component);
    this.inner.didUpdateAttrs(component);
  }

  didInsertElement(component: Component) {
    this.initialize('didInsertElement').push(component);
    this.inner.didInsertElement(component);
  }

  willRender(component: Component) {
    this.initialize('willRender').push(component);
    this.inner.willRender(component);
  }

  willUpdate(component: Component) {
    this.initialize('willUpdate').push(component);
    this.inner.willUpdate(component);
  }

  didRender(component: Component) {
    this.initialize('didRender').push(component);
    this.inner.didRender(component);
  }

  didUpdate(component: Component) {
    this.initialize('didUpdate').push(component);
    this.inner.didUpdate(component);
  }

  private initialize(name: string) {
    return (this.hooks[name] = this.hooks[name] || []);
  }
}

abstract class TestAppendingComponent extends AppendingComponent {
  protected setupLayoutScope(scope: Scope<TestScopeOptions>, component: Component) {
    super.setupLayoutScope(scope, component);
    scope.bindHostOptions({ component });

    let template = this.templates && this.templates.default;

    if (this.templateIsPresent(template)) {
      scope.bindLocal(LITERAL('hasBlock'), true);

      if (template.arity > 0) scope.bindLocal(LITERAL('hasBlockParams'), true);
    }
  }

  protected augmentBlockScope(blockScope: Scope<TestScopeOptions>, parentScope: Scope<TestScopeOptions>, component: Component) {
    blockScope.bindHostOptions({ component });
  }

  abstract update(component: Component, hash: EvaluatedHash);
  protected abstract createComponent(attrs: Dict<any>, parentScope: Scope<any>): Component;
  protected abstract templateIsPresent(template: Template): boolean;
}

interface TemplateWithAttrsOptions {
  defaults?: AttributeSyntax[];
  outers?: AttributeSyntax[];
  identity?: InternedString;
}

function templateWithAttrs(template: Template, { defaults, outers, identity }: TemplateWithAttrsOptions): Template {
  let out = new LinkedList<StatementSyntax>();

  let statements = template.statements;
  let current = statements.head();
  let next;

  while (current) {
    next = statements.nextNode(current);

    if (current.type === 'open-element') {
      let tag = <OpenElement>current;
      if (tag.tag === identity) out.append(tag.toIdentity());
      else out.append(tag.clone());
      break;
    } else if (current.type === 'open-primitive-element') {
      out.append(current.clone());
      break;
    }

    out.append(current.clone());
    current = next;
  }

  current = next;

  let seen = dict<boolean>();
  let attrs = [];

  if (outers) {
    outers.forEach(attr => {
      seen[attr.name] = true;
      out.append(attr);
    });
  }


  while (current) {
    next = statements.nextNode(current);

    if (current.type === 'add-class') {
      out.append(current.clone());
      current = next;
    } else if (current[ATTRIBUTE_SYNTAX]) {
      if (!seen[(<AttributeSyntax>current).name]) {
        out.append(current.clone());
        seen[(<AttributeSyntax>current).name] = true;
      }

      current = next;
    } else {
      break;
    }
  }

  if (defaults) {
    defaults.forEach(item => {
      if (item.type !== 'add-class' && seen[item.name]) return;
      out.append(item);
    });
  }

  while (current) {
    next = statements.nextNode(current);
    out.append(current.clone());
    current = next;
  }

  return Template.fromList(out);
}

class CurlyAppendingComponent extends TestAppendingComponent {
  protected templates: Templates;
  protected hash: EvaluatedHash;

  constructor({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions) {
    let b = builders;

    super({ hooks, ComponentClass, layout, stack });

    let statements = this.layout.statements;
    statements.prepend(b.openPrimitiveElement('div'));
    statements.append(b.closeElement());
  }

  protected createComponent(attrs: Dict<any>, parentScope: Scope<TestScopeOptions>) {
    let parentComponent = parentScope.getHostOptions().component;
    let options = assign({ parentView: parentComponent, attrs }, attrs);
    return new this.ComponentClass(options);
  }

  protected layoutWithAttrs() {
    return this.layout;
  }

  protected templateIsPresent(template: Template): boolean {
    return !!template;
  }

  update(component: Component, hash: EvaluatedHash) {
    let attrs = hash.value();

    for (let prop in attrs) {
      set(component, prop, attrs[prop]);
    }

    set(component, 'attrs', attrs);
  }
}

let uuid = 1;

class CurlyEmberishAppendingComponent extends CurlyAppendingComponent {
  begin(stack: ElementStack, options: ComponentDefinitionOptions) {
    super.begin(stack, options);

    let b = builders;

    let hashRole = this.hash.at(LITERAL('ariaRole'));
    let hashId = this.hash.at(LITERAL('id'));
    let hashClass = this.hash.at(LITERAL('class'));

    let defaults: AttributeSyntax[] = [ b.addClass(b.value('ember-view')) ];

    if (hashId) {
      defaults.push(b.dynamicAttr('id', new EvaluatedRef({ ref: hashId })));
    } else {
      defaults.push(b.staticAttr('id', `ember${uuid++}`));
    }

    if (hashClass) {
      defaults.push(b.addClass(new EvaluatedRef({ ref: hashClass })));
    }

    if (hashRole) {
      defaults.push(b.dynamicAttr('role', new EvaluatedRef({ ref: hashRole })));
    }

    this.layout = templateWithAttrs(this.layout, { defaults });
  }
}

class GlimmerAppendingComponent extends TestAppendingComponent {
  protected attributes: Template = null;

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.attributes = templates && templates.attributes;
    super.begin(stack, { frame, templates, hash, tag });
  }

  protected createComponent(attrs: Dict<any>, parentScope: Scope<TestScopeOptions>): Component {
    let parentComponent = parentScope.getHostOptions().component;
    return new this.ComponentClass({ attrs, parentView: parentComponent });
  }

  protected layoutWithAttrs(invokeFrame: Frame) {
    let attrSyntax = this.attributes && <LinkedList<AttributeSyntax>>this.attributes.statements;
    let outers = attrSyntax && attrSyntax.toArray().map(s => s.asEvaluated(invokeFrame));
    let identity = this.tag;

    return templateWithAttrs(this.layout, { identity, outers });
  }

  protected templateIsPresent(template: Template): boolean {
    return template && !template.isEmpty;
  }

  update(component: Component, hash: EvaluatedHash) {
    set(component, 'attrs', hash.value());
  }
}

class GlimmerEmberishAppendingComponent extends GlimmerAppendingComponent {
  begin(stack: ElementStack, options: ComponentDefinitionOptions) {
    super.begin(stack, options);

    let b = builders;

    let hashClass = this.hash.at(LITERAL('class'));

    let defaults: AttributeSyntax[] = [ b.addClass(b.value('ember-view')) ];

    defaults.push(b.dynamicAttr('id', b.value(`ember${uuid++}`)));

    this.layout = templateWithAttrs(this.layout, { defaults });
  }
}

const DIV = LITERAL('div');

class CurlyComponent extends StatementSyntax {
  type = "curly-component";
  isStatic = false;
  path: InternedString[];
  templates: Templates;

  private args: ParamsAndHash;
  private inverse: Template;

  constructor(options: { path: InternedString[], templates: Templates }) {
    super();
    this.path = options.path;
    this.templates = options.templates;
  }

   clone(): CurlyComponent {
    return new CurlyComponent(this);
  }

  withArgs(args: ParamsAndHash): CurlyComponent {
    this.args = args;
    return this;
  }

  withInverse(inverse: Template): CurlyComponent {
    this.inverse = inverse;
    return this;
  }

  evaluate(stack: ElementStack, frame: Frame) {
    let { path, args, templates } = this;
    let tag = path[0];

    let definition = frame.getComponentDefinition(path, this);
    let hash = processPositionals(definition, args);

    stack.openComponent(definition, { tag: DIV, frame, templates, hash: hash.evaluate(frame) });
    stack.closeElement();
  }
}

function processPositionals(definition: ComponentDefinition, args: ParamsAndHash): Hash {
  let positionals: string[] | string = definition.ComponentClass['positionalParams'];
  let { params, hash } = args;

  if (positionals) {
    hash = hash.clone();
    let params = args.params;

    if (typeof positionals === 'string') {
      let key = intern(positionals);

      if (hash.has(key)) {
        if (params.length === 0) return hash;
        throw new Error(`You cannot specify both positional params and the hash argument \`${key}\`.`);
      }

      hash.add(key, args.params);
    } else {
      positionals.some((p, i) => {
        if (i >= params.length) return true;
        let param = intern(p);
        if (hash.has(param)) {
          throw new Error(`You cannot specify both a positional param (at position ${i}) and the hash argument \`${param}\`.`);
        }
        hash.add(param, params.at(i))
      });
    }
  }

  return hash;
}

type EachOptions = { args: ParamsAndHash };

class EachSyntax extends StatementSyntax {
  type = "each-statement";

  public args: ParamsAndHash;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  clone(): EachSyntax {
    return new EachSyntax(this);
  }

  prettyPrint() {
    return `#each ${this.args.prettyPrint()}`;
  }

  evaluate(stack: ElementStack, frame: Frame): ContentMorph {
    let list = this.args.params.evaluate(frame).nth(0);
    let key = this.args.hash.evaluate(frame).at(LITERAL('key'));
    return stack.createContentMorph(MorphList, { key, reference: list, templates: this.templates }, frame);
  }
}

class IfSyntax extends StatementSyntax {
  type = "if-statement";

  public args: ParamsAndHash;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  clone(): IfSyntax {
    return new IfSyntax(this);
  }

  prettyPrint() {
    return `#if ${this.args.prettyPrint()}`;
  }

  evaluate(stack: ElementStack, frame: Frame): ContentMorph {
    let condition = this.args.params.evaluate(frame).nth(0);
    return stack.createContentMorph(IfMorph, { reference: condition, templates: this.templates }, frame);
  }
}

interface IfOptions {
  reference: ChainableReference;
  templates: Templates;
}

class IfMorph extends TemplateMorph {
  reference: ChainableReference;
  templates: Templates;

  init({ reference, templates }: IfOptions) {
    this.reference = reference;
    this.templates = templates;
  }

  append(stack: ElementStack) {
    let { reference, templates } = this;
    let value = reference.value();
    this.template = value ? templates.default : templates.inverse;
    super.append(stack);
  }

  update() {
    let { reference, templates } = this;
    let value = reference.value();
    this.template = value ? templates.default : templates.inverse;
    super.update();
  }
}

class DynamicComponentSyntax extends StatementSyntax {
  type = "dynamic-component";

  public args: ParamsAndHash;
  public key: InternedString;
  public templates: Templates;
  public isStatic = false;

  constructor({ key, args, templates }: { key: InternedString, args: ParamsAndHash, templates: Templates }) {
    super();
    this.key = key;
    this.args = args;
    this.templates = templates;
  }

  clone(): DynamicComponentSyntax {
    return new DynamicComponentSyntax(this);
  }

  prettyPrint() {

  }

  evaluate(stack: ElementStack, frame: Frame): DynamicComponentMorph {
    let { args: _args, templates } = this;
    let args = _args.evaluate(frame);

    return stack.createContentMorph(DynamicComponentMorph, { args, templates, syntax: this }, frame);
  }
}

class DynamicComponentMorph extends EmptyableMorph {
  private path: ChainableReference;
  private args: EvaluatedParamsAndHash;
  private syntax: DynamicComponentSyntax;
  private templates: Templates;
  private lastTag: InternedString = null;
  private inner: ContentMorph = null;

  firstNode() {
    return this.inner && this.inner.firstNode();
  }

  lastNode() {
    return this.inner && this.inner.lastNode();
  }

  init({ args, syntax, templates }: { path: ChainableReference, args: EvaluatedParamsAndHash, syntax: DynamicComponentSyntax, templates: Templates }) {
    this.path = args.params.nth(0);
    this.args = args;
    this.syntax = syntax;
    this.templates = templates;
  }

  append(stack: ElementStack) {
    let { frame, path, args: { params, hash }, syntax, templates } = this;
    let layout = templates && templates.default;
    let tag = this.lastTag = intern(path.value());

    let definition = this.frame.getComponentDefinition([path.value()], syntax);
    let appending = definition.begin(stack, { frame, templates, hash, tag })
    let inner = this.inner = appending.process();

    this.willAppend(stack);
    inner.append(stack);
    this.didInsertContent(inner);
  }

  update() {
    let tag = this.path.value();

    if (tag === this.lastTag) {
      this.inner.update();
    } else {
      this.lastTag = tag;
      let { frame, args: { hash }, syntax, templates } = this;

      let definition = frame.getComponentDefinition([tag], syntax);
      let stack = this.stackForContent();

      let inner = this.inner = appendComponent(stack, definition, { frame, templates, hash, tag });
      this.didInsertContent(inner);
    }
  }
}

export function equalsElement(element: Element, tagName: string, attributes: Object, content: string) {
  QUnit.push(element.tagName === tagName.toUpperCase(), element.tagName.toLowerCase(), tagName, `expect tagName to be ${tagName}`);

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equals(expected);
    expectedAttrs[prop] = expected;

    QUnit.push(attributes[prop].match(element.getAttribute(prop)), matcher.fail(element.getAttribute(prop)), matcher.fail(element.getAttribute(prop)), `Expected element's ${prop} attribute ${matcher.expected()}`);
  }

  let actualAttributes = {};
  for (let i = 0, l = element.attributes.length; i < l; i++) {
    actualAttributes[element.attributes[i].name] = element.attributes[i].value;
  }

  if (!(element instanceof HTMLElement)) {
    QUnit.push(element instanceof HTMLElement, null, null, "Element must be an HTML Element, not an SVG Element");
  } else {
    QUnit.push(element.attributes.length === expectedCount, element.attributes.length, expectedCount, `Expected ${expectedCount} attributes; got ${element.outerHTML}`);

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
      return expected.split(' ').sort().join(' ') === actual.split(' ').sort().join(' ');
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual) {
      return `'${actual}'' did not match '${expected}'`;
    }
  }
}