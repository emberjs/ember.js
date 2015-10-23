import {
  ATTRIBUTE_SYNTAX,
  Environment,
  DOMHelper,
  StatementSyntax,
  ParamsAndHash,
  ElementStack,
  Morph,
  ContentMorph,
  TemplateMorph,
  MorphList,
  MorphListOptions,
  Template,
  Templates,
  Inline,
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
  ElementSyntax,
  ValueSyntax,
  BlockSyntax,
  OpenElement,
  ComponentSyntax,
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  AppendingComponent,
  ComponentHooks,
  Component,
  TemplateEvaluation,
  Scope,
  Block,
  NullHandler,
  builders,
  hashToAttrList,
  isWhitespace
} from "htmlbars-runtime";
import { compile as rawCompile } from "htmlbars-compiler";
import { LITERAL, Dict, InternedString, dict, assign } from 'htmlbars-util';

import { Meta, ConstReference, ChainableReference, setProperty as set } from "htmlbars-reference";

export function compile(template: string) {
  return rawCompile(template, { disableComponentGeneration: true });
}

export class TestEnvironment extends Environment {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, definition: ComponentDefinition) {
    this.components[name] = definition;
  }

  registerCurlyComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = new CurlyComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerEmberishComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = new CurlyEmberishComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerGlimmerComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = new GlimmerComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerEmberishGlimmerComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = new GlimmerEmberishComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    let type = statement.type;
    let block = type === 'block' ? <BlockSyntax>statement : null;
    let inline = type === 'inline' ? <Inline>statement : null;
    let unknown = type === 'unknown' ? <Unknown>statement : null;

    let hash: Hash, args: ParamsAndHash, path: InternedString[];

    if (block || inline) {
      args = (block || inline).args;
      hash = args.hash;
    } else if (unknown) {
      args = ParamsAndHash.empty();
      hash = Hash.empty();
    }

    let key: string, isSimple: boolean;

    if (block || inline) {
      isSimple = (<BlockSyntax | Inline>statement).path.length === 1;
      path = (<BlockSyntax | Inline>statement).path;
      key = path[0];
    } else if (unknown) {
      isSimple = unknown.ref.path().length === 1;
      path = unknown.ref.path();
      key = path[0];
    }

    if (block && isSimple && key === 'each') {
      return new EachSyntax({ args: block.args, templates: block.templates });
    }

    if (isSimple) {
      let definition = this.components[key];

      if (definition) {
        let templates = block && block.templates;
        return (new CurlyComponent({ path, hash, templates }).withArgs(args);
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope: Scope, helperParts: string[]) {
    let helperName = helperParts[0];

    if (helperName === 'hasBlock') return new ConstReference(hasBlock(scope));
    if (helperName === 'hasBlockParams') return new ConstReference(hasBlockParams(scope));

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);
    return new ConstReference(this.helpers[helperName]);
  }

  getComponentDefinition(scope, name: string[], syntax: ComponentSyntax): ComponentDefinition {
    return this.components[name[0]];
  }
}

function hasBlock(scope: Scope) {
  return function([name]: [InternedString]) {
    return !!scope.getBlock(name || LITERAL('default'));
  }
}

function hasBlockParams(scope: Scope) {
  return function([name]: [InternedString]) {
    let block = scope.getBlock(name || LITERAL('default'));
    if (!block) return false;
    return !!block.template.arity;
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

abstract class TestComponentDefinition implements ComponentDefinition {
  public hooks: HookIntrospection = new HookIntrospection(hooks);
  public ComponentClass: ComponentClass;
  public layout: Template;
  protected AppendingComponent: TestAppendingComponentClass;

  constructor(ComponentClass: ComponentClass, layout: Template) {
    this.ComponentClass = ComponentClass;
    this.layout = layout;
  }

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions): TestAppendingComponent {
    let { hooks, ComponentClass, layout } = this;
    let appending = new this.AppendingComponent({ hooks, ComponentClass, layout, stack });
    appending.begin(stack, { frame, templates, hash, tag });
    return appending;
  }
}

interface TestAppendingComponentClass {
  new({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions): TestAppendingComponent;
}

interface AppendingComponentOptions {
  hooks: HookIntrospection;
  ComponentClass: ComponentClass;
  layout: Template;
  stack: ElementStack;
}

abstract class TestAppendingComponent implements AppendingComponent {
  public hooks: HookIntrospection;
  public ComponentClass: ComponentClass;
  public layout: Template;
  protected stack: ElementStack;
  protected frame: Frame = null;
  protected attrs: ChainableReference = null;
  protected templates: Templates = null;
  protected hash: EvaluatedHash = null;
  protected tag: InternedString = null;

  constructor({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions) {
    this.hooks = hooks;
    this.ComponentClass = ComponentClass;
    this.layout = layout.clone();
    this.stack = stack;
  }

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.frame = frame;
    this.templates = templates;
    this.hash = hash;
    this.tag = tag;
  }

  process() {
    let { stack, frame, templates, hash } = this;

    let layoutFrame = frame.child();
    let layoutScope = layoutFrame.resetScope();

    if (templates && templates.default) {
      let block = new Block(templates.default, frame);
      layoutScope.bindBlock(LITERAL('default'), block);
    }

    if (templates && templates.inverse) {
      let block = new Block(templates.inverse, frame);
      layoutScope.bindBlock(LITERAL('inverse'), block);
    }

    let attrs = hash.value();
    let component = this.createComponent(attrs);
    layoutScope.bindSelf(component);
    this.setupLayoutScope(layoutFrame);

    let layout = this.layoutWithAttrs(frame);

    let morph: ComponentMorph = stack.createContentMorph(ComponentMorph, { attrs: hash, appending: this, layout, component }, layoutFrame);
    morph.append(stack);
  }

  protected layoutWithAttrs(invokeFrame: Frame): Template {
    return this.layout;
  }

  protected setupLayoutScope(layoutFrame: Frame) {
    let scope = layoutFrame.scope();

    let template = this.templates && this.templates.default;

    if (this.templateIsPresent(template)) {
      scope.bindLocal(LITERAL('hasBlock'), true);

      if (template.arity > 0) scope.bindLocal(LITERAL('hasBlockParams'), true);
    }
  }

  abstract commit();
  abstract update(component: Component, hash: EvaluatedHash);
  abstract protected createComponent(attrs: Dict<any>): Component;
  abstract protected templateIsPresent(template: Template): boolean;
}

interface TemplateWithAttrsOptions {
  defaults?: AttributeSyntax[];
  outers?: AttributeSyntax[];
  identity?: InternedString;
}

function templateWithAttrs(template: Template, { defaults, outers, identity }: TemplateWithAttrsOptions): Template {
  let out = [];

  let statements = template.statements;
  let i = 0;
  for (let l=statements.length; i<l; i++) {
    let item = statements[i];

    if (item.type === 'open-element') {
      let tag = <OpenElement>item;
      if (tag.tag === identity) out.push(tag.toIdentity());
      else out.push(tag);
      break;
    }

    out.push(item);
  }

  i++;
  let seen = dict<boolean>();
  let attrs = [];

  if (outers) {
    outers.forEach(attr => {
      if (seen[attr.name]) return;
      seen[attr.name] = true;
      attrs.push(attr);
    });
  }

  out.push(...attrs);

  for (let l=statements.length; i<l; i++) {
    let item = statements[i];
    if (item.type === 'add-class') {
      out.push(item);
    } else if (item[ATTRIBUTE_SYNTAX]) {
      if (!seen[(<AttributeSyntax>item).name]) {
        out.push(item);
        seen[(<AttributeSyntax>item).name] = true;
      }
    } else {
      break;
    }
  }

  if (defaults) {
    defaults.forEach(item => {
      if (item.type !== 'add-class' && seen[item.name]) return;
      out.push(item);
    });
  }

  out.push(...statements.slice(i));

  return Template.fromStatements(out);
}

interface ComponentMorphOptions {
  attrs: EvaluatedHash;
  appending: AppendingComponent;
  layout: Template;
  component: Component;
}

class ComponentMorph extends TemplateMorph {
  private attrs: EvaluatedHash;
  private appending: AppendingComponent;
  private component: Component;

  init({ attrs, appending, layout, component }: ComponentMorphOptions) {
    this.attrs = attrs;
    this.appending = appending;
    this.template = layout;
    this.component = component;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);

    let { frame, component, template, appending: { hooks } } = this;

    frame.scope().bindSelf(component);

    hooks.didReceiveAttrs(component);
    hooks.willRender(component);
    frame.didCreate(component, hooks);

    super.appendTemplate(template, new ComponentHandler());
  }

  update() {
    let { frame, appending, component, attrs } = this;
    let { hooks } = appending;

    appending.update(component, attrs);

    hooks.didReceiveAttrs(component);
    hooks.willUpdate(component);
    hooks.willRender(component);

    super.update();

    frame.didUpdate(component, hooks);
  }
}

export class ComponentHandler extends NullHandler {
  public rootElement: Element = null;

  willOpenElement(tag: string) {
    if (this.rootElement) {
      throw new Error("You cannot create multiple root elements in a component's layout");
    }
  }

  didOpenElement(element: Element) {
    this.rootElement = element;
  }

  willAppendText(text: string) {
    if (isWhitespace(text)) return;
    throw new Error("You cannot have non-whitespace text at the root of a component's layout");
  }

  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
    if (Type.hasStaticElement) return;
    throw new Error("You cannot have curlies (`{{}}`) at the root of a component's layout")
  }
}

// class EmberishComponentDefinition extends CurlyComponentDefinition {
//   mergeAttrs(component: any, layout: Template, outer: AttributeSyntax[], layoutFrame: Frame, contentFrame: Frame) {
//     let rawBindings = component['attributeBindings'];

//     let attrs = rawBindings.map(b => {
//       let [value, key] = b.split(':');
//       return DynamicAttr.build(key || value, new EvaluatedRef(GetSyntax.build(value).evaluate(layoutFrame)));
//     });

//     layout.statements.splice(1, 0, ...attrs);
//   }
// }

class CurlyComponentDefinition extends TestComponentDefinition {
  protected AppendingComponent = CurlyAppendingComponent;
}

class CurlyAppendingComponent extends TestAppendingComponent {
  protected templates: Templates;
  protected hash: EvaluatedHash;

  constructor({ hooks, ComponentClass, layout, stack }: AppendingComponentOptions) {
    let b = builders;

    super({ hooks, ComponentClass, layout, stack });

    this.layout.statements.unshift(b.openElement('div'));
    this.layout.statements.push(b.closeElement());
  }

  protected createComponent(attrs: Dict<any>) {
    return new this.ComponentClass(attrs);
  }

  protected layoutWithAttrs() {
    return this.layout;
  }

  protected templateIsPresent(template: Template): boolean {
    return !!template;
  }

  commit() {
    // this.frame.commit();
  }

  update(component: Component, hash: EvaluatedHash) {
    let attrs = hash.value();

    for (let prop in attrs) {
      set(component, prop, attrs[prop]);
    }
  }
}


class CurlyEmberishComponentDefinition extends TestComponentDefinition {
  protected AppendingComponent = CurlyEmberishAppendingComponent;
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
      defaults.push(b.dynamicAttr('id', new EvaluatedRef(hashId)));
    }

    if (hashClass) {
      defaults.push(b.addClass(new EvaluatedRef(hashClass)));
    }

    if (hashRole) {
      defaults.push(b.dynamicAttr('role', new EvaluatedRef(hashRole)));
    }

    this.layout = templateWithAttrs(this.layout, { defaults });
  }
}

class GlimmerComponentDefinition extends TestComponentDefinition {
  protected AppendingComponent = GlimmerAppendingComponent;
}

class GlimmerAppendingComponent extends TestAppendingComponent {
  protected attributes: Template = null;

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.attributes = templates.attributes;
    super.begin(stack, { frame, templates, hash, tag });
  }

  protected createComponent(attrs: Dict<any>): Component {
    return new this.ComponentClass({ attrs });
  }

  protected layoutWithAttrs(invokeFrame: Frame) {
    let attrSyntax = (<AttributeSyntax[]>this.templates.attributes.statements);
    let outers = attrSyntax.map(s => s.asEvaluated(invokeFrame));
    let identity = this.tag;

    return templateWithAttrs(this.layout, { identity, outers });
  }

  protected templateIsPresent(template: Template): boolean {
    return template && !template.isEmpty;
  }

  commit() {}

  update(component: Component, hash: EvaluatedHash) {
    set(component, 'attrs', hash.value());
  }
}

class GlimmerEmberishComponentDefinition extends GlimmerComponentDefinition {
  protected AppendingComponent = GlimmerEmberishAppendingComponent;
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

class CurlyComponent implements StatementSyntax {
  type = "curly-component";
  isStatic = false;
  path: InternedString[];
  hash: Hash;
  templates: Templates;

  private args: ParamsAndHash;
  private inverse: Template;

  constructor(options: { path: InternedString[], hash: Hash, templates: Templates }) {
    this.path = options.path;
    this.hash = options.hash;
    this.templates = options.templates;
  }

  withArgs(args: ParamsAndHash): CurlyComponent {
    this.args = args;
    return this;
  }

  withInverse(inverse: Template): CurlyComponent {
    this.inverse = inverse;
    return this;
  }

  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation) {
    let { path, hash, templates } = this;
    let definition = frame.getComponentDefinition(path, this);

    stack.openComponent('div', definition, { frame, templates, hash: hash.evaluate(frame) });
    stack.closeElement();
  }
}

type EachOptions = { args: ParamsAndHash };

class EachSyntax implements StatementSyntax {
  type = "each-statement";

  private args: ParamsAndHash;
  private templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    this.args = args;
    this.templates = templates;
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

export function equalsElement(element, tagName, attributes, content) {
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

  QUnit.push(element.attributes.length === expectedCount, element.attributes.length, expectedCount, `Expected ${expectedCount} attributes; got ${element.outerHTML}`);

  QUnit.push(element.innerHTML === content, element.innerHTML, content, `The element had '${content}' as its content`);
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

export function classes(expected) {
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