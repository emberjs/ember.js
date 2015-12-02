import {
  ATTRIBUTE_SYNTAX,
  Compiler,
  RenderResult,
  Environment,
  DOMHelper,
  StatementSyntax,
  ExpressionSyntax,
  Params,
  Evaluate,
  EvaluatedParams,
  EvaluatedParamsAndHash,
  ParamsAndHash,
  ElementStack,
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
  GetSyntax,
  ValueSyntax,
  BlockSyntax,
  OpenElement,
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  ComponentInvocation,
  ComponentHooks,
  Component,
  OpenBlock,
  CloseBlock,
  NoopSyntax,
  Scope,
  Block,
  VM,
  OpSeq,
  OpSeqBuilder,
  NoopOpcode,
  EnterOpcode,
  EnterListOpcode,
  EnterWithKeyOpcode,
  ExitOpcode,
  ExitListOpcode,
  EvaluateOpcode,
  PushChildScopeOpcode,
  PopScopeOpcode,
  ArgsOpcode,
  TestOpcode,
  JumpOpcode,
  JumpIfOpcode,
  JumpUnlessOpcode,
  NextIterOpcode,
  builders,
  isWhitespace,
  appendComponent
} from "glimmer-runtime";
import { compile as rawCompile } from "glimmer-compiler";
import { LITERAL, Slice, LinkedList, Dict, InternedString, dict, assign, intern, symbol } from 'glimmer-util';

import { Meta, ConstReference, ChainableReference, setProperty as set } from "glimmer-reference";

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

  registerComponent(name: string, definition: ComponentDefinition) {
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
    let testHooks = new HookIntrospection(hooks);
    let definition = new GlimmerComponentDefinition(testHooks, Component, compile(layout), GlimmerComponentInvocation);
    return this.registerComponent(name, definition);
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
      if (block && key === 'identity') {
        return new IdentitySyntax({ args: block.args, templates: block.templates })
      }

      if (block && key === 'render-inverse') {
        return new RenderInverseIdentitySyntax({ args: block.args, templates: block.templates })
      }

      if (block && key === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
      }

      if (block && key === 'if') {
        return new IfSyntax({ args: block.args, templates: block.templates });
      }

      if (block && key === 'with') {
        return new WithSyntax({ args: block.args, templates: block.templates });
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
    return this.helpers[helperName];
  }

  getComponentDefinition(name: InternedString[], syntax: StatementSyntax): ComponentDefinition {
    return this.components[<string>name[0]];
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

class GlimmerComponentDefinition extends ComponentDefinition {
  compile(attributes: Slice<AttributeSyntax>, templates: Templates): GlimmerComponentInvocation {
    return new GlimmerComponentInvocation(templates, this.layout);
  }
}

class GlimmerComponentInvocation implements ComponentInvocation {
  public templates: Templates;
  public layout: Template;

  constructor(templates: Templates, layout: Template) {
    this.templates = templates;
    this.layout = layout;
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

  compile(compiler: Compiler) {
    //        Args
    //        EnterList(BEGIN, END)
    // ITER:  Noop
    //        NextIter(BREAK)
    //        EnterWithKey(BEGIN, END)
    // BEGIN: Noop
    //        PushChildScope(default.localNames)
    //        Evaluate(default)
    //        PopScope
    // END:   Noop
    //        Exit
    //        Jump(ITER)
    // BREAK: Noop
    //        ExitList

    let { templates } = this;

    let BEGIN = new NoopOpcode("BEGIN");
    let ITER = new NoopOpcode("ITER");
    let BREAK = new NoopOpcode("BREAK");
    let END = new NoopOpcode("END");

    compiler.append(new ArgsOpcode(this.args));
    compiler.append(new EnterListOpcode(BEGIN, END));
    compiler.append(ITER);
    compiler.append(new NextIterOpcode(BREAK));
    compiler.append(new EnterWithKeyOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new PushChildScopeOpcode(this.templates.default.raw.locals));
    compiler.append(new EvaluateOpcode(this.templates.default.raw));
    compiler.append(new PopScopeOpcode());
    compiler.append(END);
    compiler.append(new ExitOpcode());
    compiler.append(new JumpOpcode(ITER));
    compiler.append(BREAK);
    compiler.append(new ExitListOpcode());
  }
}

class IdentitySyntax extends StatementSyntax {
  type = "identity";

  public args: ParamsAndHash;
  public templates: Templates;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(compiler: Compiler) {
    compiler.append(new EvaluateOpcode(this.templates.default.raw));
  }
}

class RenderInverseIdentitySyntax extends StatementSyntax {
  type = "render-inverse-identity";

  public args: ParamsAndHash;
  public templates: Templates;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  compile(compiler: Compiler) {
    compiler.append(new EvaluateOpcode(this.templates.inverse.raw));
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

  prettyPrint() {
    return `#if ${this.args.prettyPrint()}`;
  }

  compile(compiler: Compiler) {
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        Args
    //        Test
    //        JumpUnless(ELSE)
    //        Evalulate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let { templates } = this;

    let BEGIN = new NoopOpcode("BEGIN");
    let ELSE = new NoopOpcode("ELSE");
    let END = new NoopOpcode("END");

    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new ArgsOpcode(this.args));
    compiler.append(new TestOpcode());

    if (this.templates.inverse) {
      compiler.append(new JumpUnlessOpcode(ELSE));
      compiler.append(new EvaluateOpcode(this.templates.default.raw));
      compiler.append(new JumpOpcode(END));
      compiler.append(ELSE);
      compiler.append(new EvaluateOpcode(this.templates.inverse.raw));
    } else {
      compiler.append(new JumpUnlessOpcode(END));
      compiler.append(new EvaluateOpcode(this.templates.default.raw));
    }

    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}

class WithSyntax extends StatementSyntax {
  type = "with-statement";

  public args: ParamsAndHash;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  clone(): WithSyntax {
    return new WithSyntax(this);
  }

  prettyPrint() {
    return `#with ${this.args.prettyPrint()}`;
  }

  compile(compiler: Compiler) {
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        Args
    //        Test
    //        JumpUnless(ELSE)
    //        PushChildScope(default.localNames)
    //        Evalulate(default)
    //        PopScope
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let { templates } = this;

    let BEGIN = new NoopOpcode("BEGIN");
    let ELSE = new NoopOpcode("ELSE");
    let END = new NoopOpcode("END");

    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new ArgsOpcode(this.args));
    compiler.append(new TestOpcode());

    if (this.templates.inverse) {
      compiler.append(new JumpUnlessOpcode(ELSE));
    } else {
      compiler.append(new JumpUnlessOpcode(END));
    }

    compiler.append(new PushChildScopeOpcode(this.templates.default.raw.locals));
    compiler.append(new EvaluateOpcode(this.templates.default.raw));
    compiler.append(new PopScopeOpcode());
    compiler.append(new JumpOpcode(END));

    if (this.templates.inverse) {
      compiler.append(ELSE);
      compiler.append(new EvaluateOpcode(this.templates.inverse.raw));
    }

    compiler.append(END);
    compiler.append(new ExitOpcode());
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
