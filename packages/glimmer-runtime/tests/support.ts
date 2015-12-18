import {
  // Compiler
  Compiler,
  RawTemplate,

  // Environment
  Environment,
  DOMHelper,

  // Opcodes
  NoopOpcode,
  EnterOpcode,
  EnterListOpcode,
  EnterWithKeyOpcode,
  ExitOpcode,
  ExitListOpcode,
  EvaluateOpcode,
  PushChildScopeOpcode,
  PopScopeOpcode,
  PutArgsOpcode,
  TestOpcode,
  JumpOpcode,
  JumpUnlessOpcode,
  NextIterOpcode,
  OpenComponentOpcode,
  CloseComponentOpcode,

  // Components
  ComponentClass,
  ComponentDefinition,
  ComponentInvocation,
  ComponentHooks,
  CompileComponentOptions,
  Component,

  // Syntax Classes
  StatementSyntax,
  ExpressionSyntax,
  AttributeSyntax,

  // Concrete Syntax
  Templates,
  Append,
  Unknown,
  ArgsSyntax,
  NamedArgsSyntax,
  HelperSyntax,
  BlockSyntax,
  OpenPrimitiveElementSyntax,
  CloseElementSyntax,
  StaticAttr,
  DynamicAttr,
  ValueSyntax,
  AddClass
} from "glimmer-runtime";

import { compile as rawCompile } from "glimmer-compiler";
import { LinkedList, Slice, ListSlice, Dict, InternedString, dict } from 'glimmer-util';

import { Meta } from "glimmer-reference";

export function compile(template: string) {
  return rawCompile(template, { disableComponentGeneration: true });
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
    return definition;
  }

  registerGlimmerComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    let testHooks = new HookIntrospection(hooks);
    let definition = new GlimmerComponentDefinition(testHooks, Component, compile(layout).raw, GlimmerComponentInvocation);
    return this.registerComponent(name, definition);
  }

  registerEmberishComponent(name: string, Component: ComponentClass, layout: string): ComponentDefinition {
    let testHooks = new HookIntrospection(hooks);
    let definition = new EmberishComponentDefinition(testHooks, Component, compile(layout).raw, GlimmerComponentInvocation);
    return this.registerComponent(name, definition);
  }

  registerEmberishGlimmerComponent(name: string, Component: ComponentClass, layout: string): any {
    let testHooks = new HookIntrospection(hooks);
    let definition = new EmberishGlimmerComponentDefinition(testHooks, Component, compile(layout).raw, GlimmerComponentInvocation);
    return this.registerComponent(name, definition);
  }

  registerCurlyComponent(...args: any[]): any {
    throw new Error("Curly components not yet implemented");
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    let type = statement.type;
    let block = type === 'block' ? <BlockSyntax>statement : null;
    let append = type === 'append' ? <Append>statement : null;

    let named: NamedArgsSyntax;
    let args: ArgsSyntax;
    let path: InternedString[];
    let unknown: Unknown;
    let helper: HelperSyntax;

    if (block) {
      args = block.args;
      named = args.named;
      path = block.path;
    } else if (append && append.value.type === 'unknown') {
      unknown = <Unknown>append.value;
      args = ArgsSyntax.empty();
      named = NamedArgsSyntax.empty();
      path = unknown.ref.path();
    } else if (append && append.value.type === 'helper') {
      helper = <HelperSyntax>append.value;
      args = helper.args;
      named = args.named;
      path = helper.ref.path();
    }

    let key: InternedString, isSimple: boolean;

    if (path) {
      isSimple = path.length === 1;
      key = path[0];
    }

    if (isSimple && block) {
      switch (key) {
        case 'identity':
          return new IdentitySyntax({ args: block.args, templates: block.templates });
        case 'render-inverse':
          return new RenderInverseIdentitySyntax({ args: block.args, templates: block.templates });
        case 'each':
          return new EachSyntax({ args: block.args, templates: block.templates });
        case 'if':
          return new IfSyntax({ args: block.args, templates: block.templates });
        case 'with':
          return new WithSyntax({ args: block.args, templates: block.templates });
      }
    }

    if (isSimple && (append || block)) {
      let component = this.getComponentDefinition(path, statement);

      if (component) {
        return new CurlyComponent({ args, component, templates: block && block.templates });
      }
    }

    return super.statement(statement);
  }

  hasHelper(helperName: InternedString[]) {
    return helperName.length === 1 && (<string>helperName[0] in this.helpers);
  }

  lookupHelper(helperParts: string[]) {
    let helperName = helperParts[0];

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);
    return this.helpers[helperName];
  }

  getComponentDefinition(name: InternedString[], syntax: StatementSyntax): ComponentDefinition {
    return this.components[<string>name[0]];
  }
}

class CurlyComponent extends StatementSyntax {
  public args: ArgsSyntax;
  public component: ComponentDefinition;
  public templates: Templates;

  constructor({ args, component, templates }: { args: ArgsSyntax, component: ComponentDefinition, templates: Templates }) {
    super();
    this.args = args;
    this.component = component;
    this.templates = templates;
  }

  compile(compiler: Compiler) {
    let lookup = this.getLookup();

    compiler.append(
      new OpenComponentOpcode(
        this.component.compile(lookup, this.templates),
        this.getArgs().compile(compiler)
      )
    );

    compiler.append(new CloseComponentOpcode());
  }

  private getLookup(): CompileComponentOptions {
    return {
      args: this.args,
      syntax: new LinkedList<AttributeSyntax>(),
      named: this.getNamed(),
      locals: null
    };
  }

  private getArgs(): ArgsSyntax {
    let original = this.args.named.map;
    let map = dict<ExpressionSyntax>();

    Object.keys(original).forEach(a => {
      map[`@${a}`] = original[a];
    });

    return ArgsSyntax.fromHash(NamedArgsSyntax.build(map));
  }

  private getNamed(): InternedString[] {
    return this.args.named.keys;
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
    this.inner.begin(component);
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

class GlimmerComponentDefinition extends ComponentDefinition {
  compile({ syntax, args, named }: CompileComponentOptions, templates: Templates): GlimmerComponentInvocation {
    let layout = this.templateWithAttrs(syntax, args, named);
    return new GlimmerComponentInvocation(templates, layout);
  }

  private templateWithAttrs(attrs: Slice<AttributeSyntax>, args: ArgsSyntax, named: InternedString[]) {
    return this.layout.cloneWith((program, table) => {
      let toSplice = ListSlice.toList(attrs);
      let current = program.head();
      table.putNamed(named);

      while (current) {
        let next = program.nextNode(current);

        if (current.type === 'open-element' || current.type === 'open-primitive-element') {
          program.spliceList(toSplice, program.nextNode(current));
          break;
        }

        current = next;
      }
    });
  }
}

const EMBER_VIEW = new ValueSyntax('ember-view');
let id = 1;

class EmberishComponentDefinition extends ComponentDefinition {
  compile({ args, locals, named }: CompileComponentOptions, templates: Templates): GlimmerComponentInvocation {
    let layout = this.templateWithAttrs(args, named);
    if (locals) throw new Error("Positional arguments not supported");
    return new EmberishComponentInvocation(templates, layout);
  }

  private templateWithAttrs(args: ArgsSyntax, named: InternedString[]) {
    return this.layout.cloneWith((program, table) => {
      let toSplice = new LinkedList<AttributeSyntax>();

      toSplice.append(new AddClass({ value: EMBER_VIEW }));
      toSplice.append(new StaticAttr({ name: 'id', value: `ember${id++}` }));

      let named = args.named.map;
      Object.keys(named).forEach((name: InternedString) => {
        let attr;
        let value = named[<string>name];
        if (name === 'class') {
          attr = new AddClass({ value });
        } else if (name === 'id') {
          attr = new DynamicAttr({ name, value, namespace: null });
        } else if (name === 'ariaRole') {
          attr = new DynamicAttr({ name: <InternedString>'role', value, namespace: null });
        } else {
          return;
        }

        toSplice.append(attr);
      });

      let head = program.head();
      program.insertBefore(new OpenPrimitiveElementSyntax({ tag: <InternedString>'div' }), head);
      program.spliceList(toSplice, program.nextNode(head));
      program.append(new CloseElementSyntax());
    });
  }
}

class EmberishGlimmerComponentDefinition extends ComponentDefinition {
  compile({ syntax, args, named }: CompileComponentOptions, templates: Templates): GlimmerComponentInvocation {
    let layout = this.templateWithAttrs(syntax, args, named);
    return new GlimmerComponentInvocation(templates, layout);
  }

  private templateWithAttrs(attrs: Slice<AttributeSyntax>, args: ArgsSyntax, named: InternedString[]) {
    return this.layout.cloneWith((program, table) => {
      let toSplice = ListSlice.toList(attrs);
      toSplice.append(new AddClass({ value: EMBER_VIEW }));

      if (!args.named.has('@id' as InternedString)) {
        toSplice.append(new StaticAttr({ name: 'id', value: `ember${id++}` }));
      }

      table.putNamed(named);

      let current = program.head();

      while (current) {
        let next = program.nextNode(current);

        if (current.type === 'open-element' || current.type === 'open-primitive-element') {
          program.spliceList(toSplice, program.nextNode(current));
          break;
        }

        current = next;
      }
    });
  }
}

class GlimmerComponentInvocation implements ComponentInvocation {
  public templates: Templates;
  public layout: RawTemplate;

  constructor(templates: Templates, layout: RawTemplate) {
    this.templates = templates;
    this.layout = layout;
  }
}

class EmberishComponentInvocation implements ComponentInvocation {
  public templates: Templates;
  public layout: RawTemplate;

  constructor(templates: Templates, layout: RawTemplate) {
    this.templates = templates;
    this.layout = layout;
  }
}

class EmberishGlimmrComponentInvocation implements ComponentInvocation {
  public templates: Templates;
  public layout: RawTemplate;

  constructor(templates: Templates, layout: RawTemplate) {
    this.templates = templates;
    this.layout = layout;
  }
}

type EachOptions = { args: ArgsSyntax };

class EachSyntax extends StatementSyntax {
  type = "each-statement";

  public args: ArgsSyntax;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#each ${this.args.prettyPrint()}`;
  }

  compile(compiler: Compiler) {
    //        PutArgs
    //        EnterList(BEGIN, END)
    // ITER:  Noop
    //        NextIter(BREAK)
    //        EnterWithKey(BEGIN, END)
    // BEGIN: Noop
    //        PushChildScope
    //        Evaluate(default)
    //        PopScope
    // END:   Noop
    //        Exit
    //        Jump(ITER)
    // BREAK: Noop
    //        ExitList

    let BEGIN = new NoopOpcode("BEGIN");
    let ITER = new NoopOpcode("ITER");
    let BREAK = new NoopOpcode("BREAK");
    let END = new NoopOpcode("END");

    compiler.append(new PutArgsOpcode(this.args.compile(compiler)));
    compiler.append(new EnterListOpcode(BEGIN, END));
    compiler.append(ITER);
    compiler.append(new NextIterOpcode(BREAK));
    compiler.append(new EnterWithKeyOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new PushChildScopeOpcode());
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

  public args: ArgsSyntax;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
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

  public args: ArgsSyntax;
  public templates: Templates;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
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

  public args: ArgsSyntax;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
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
    //        PutArgs
    //        Test
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let BEGIN = new NoopOpcode("BEGIN");
    let ELSE = new NoopOpcode("ELSE");
    let END = new NoopOpcode("END");

    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode(this.args.compile(compiler)));
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

  public args: ArgsSyntax;
  public templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ArgsSyntax, templates: Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#with ${this.args.prettyPrint()}`;
  }

  compile(compiler: Compiler) {
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        PutArgs
    //        Test
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evaluate(inverse)
    // END:   Noop
    //        Exit

    let BEGIN = new NoopOpcode("BEGIN");
    let ELSE = new NoopOpcode("ELSE");
    let END = new NoopOpcode("END");

    compiler.append(new EnterOpcode(BEGIN, END));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode(this.args.compile(compiler)));
    compiler.append(new TestOpcode());

    if (this.templates.inverse) {
      compiler.append(new JumpUnlessOpcode(ELSE));
    } else {
      compiler.append(new JumpUnlessOpcode(END));
    }

    compiler.append(new EvaluateOpcode(this.templates.default.raw));
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
      return expected[0] === '"' && expected.slice(-1) === '"' && expected.slice(1, -1) === actual;
    },

    expected() {
      return `to equal ${expected.slice(1, -1)}`;
    },

    fail(actual) {
      return `${actual} did not equal ${expected.slice(1, -1)}`;
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
