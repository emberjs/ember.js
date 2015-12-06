import {
  Template,

  // Compiler
  Compiler,

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
  BindArgsOpcode,
  TestOpcode,
  JumpOpcode,
  JumpUnlessOpcode,
  NextIterOpcode,

  // Components
  ComponentClass,
  ComponentDefinition,
  ComponentInvocation,
  ComponentHooks,
  Component,

  // Syntax Classes
  StatementSyntax,
  AttributeSyntax,

  // Concrete Syntax
  Templates,
  Append,
  Unknown,
  ArgsSyntax,
  NamedArgsSyntax,
  HelperSyntax,
  BlockSyntax
} from "glimmer-runtime";

import { compile as rawCompile } from "glimmer-compiler";
import { Slice, Dict, InternedString, dict } from 'glimmer-util';

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
    let definition = new GlimmerComponentDefinition(testHooks, Component, compile(layout), GlimmerComponentInvocation);
    return this.registerComponent(name, definition);
  }

  registerEmberishComponent(...args: any[]): any {
    throw new Error("Emberish components not yet implemented");
  }

  registerEmberishGlimmerComponent(...args: any[]): any {
    throw new Error("Emberish Glimmer components not yet implemented");
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

    if (isSimple) {
      if (block && key === 'identity') {
        return new IdentitySyntax({ args: block.args, templates: block.templates });
      }

      if (block && key === 'render-inverse') {
        return new RenderInverseIdentitySyntax({ args: block.args, templates: block.templates });
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
    //        BindArgs(default)
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
    compiler.append(new BindArgsOpcode(this.templates.default.raw));
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
    //        Evalulate(default)
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
    //        BindArgs(default)
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

    compiler.append(new BindArgsOpcode(this.templates.default.raw));
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

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equals(expected);
    expectedAttrs[prop] = expected;

    QUnit.push(
      attributes[prop].match(element.getAttribute(prop)),
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
  };
}
