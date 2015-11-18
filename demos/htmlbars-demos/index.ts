import {
  ATTRIBUTE_SYNTAX,
  RenderResult,
  Block,
  Scope,
  Helper,
  Template,
  TemplateMorph,
  DOMHelper,
  Environment,
  Component,
  AppendingComponent,
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  StatementSyntax,
  AttributeSyntax,
  Jump,
  JumpIf,
  OpenElement,
  BlockSyntax,
  ParamsAndHash,
  EvaluatedHash,
  ElementStack,
  Frame,
  ContentMorph,
  Templates,
  MorphList,
  OpSeq,
  NoopOpcode,
  EnterOpcode,
  ArgsOpcode,
  TestOpcode,
  JumpUnlessOpcode,
  EvaluateOpcode,
  JumpOpcode,
  ExitOpcode
} from 'htmlbars-runtime';

import {
  compileSpec
} from 'htmlbars-compiler';

import {
  Meta,
  ConstReference,
  ChainableReference,
  setProperty as set
} from 'htmlbars-reference';

import {
  LITERAL,
  LinkedList,
  InternedString,
  Dict,
  dict
} from 'htmlbars-util';

import EmberObject from 'htmlbars-object';

export function compile(template: string) {
  let spec = compileSpec(template, { disableComponentGeneration: true });
  return Template.fromSpec(JSON.parse(spec));
}

abstract class DemoAppendingComponent extends AppendingComponent {
  protected setupLayoutScope(scope: Scope<DemoScopeOptions>, component: Component) {
    super.setupLayoutScope(scope, component);
    scope.bindHostOptions({ component });

    let template = this.templates && this.templates.default;

    if (this.templateIsPresent(template)) {
      scope.bindLocal(LITERAL('hasBlock'), true);

      if (template.arity > 0) scope.bindLocal(LITERAL('hasBlockParams'), true);
    }
  }

  protected augmentBlockScope(blockScope: Scope<DemoScopeOptions>, parentScope: Scope<DemoScopeOptions>, component: Component) {
    blockScope.bindHostOptions({ component });
  }

  abstract update(component: Component, hash: EvaluatedHash);
  protected abstract createComponent(attrs: Dict<any>, parentScope: Scope<any>): Component;
  protected abstract templateIsPresent(template: Template): boolean;
}

class GlimmerAppendingComponent extends DemoAppendingComponent {
  protected attributes: Template = null;

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.attributes = templates && templates.attributes;
    super.begin(stack, { frame, templates, hash, tag });
  }

  protected createComponent(attrs: Dict<any>, parentScope: Scope<DemoScopeOptions>): Component {
    let parentOptions = parentScope.getHostOptions();
    let parentComponent = parentOptions && parentOptions.component;
    return new this.ComponentClass({ attrs, parentView: parentComponent });
  }

  protected layoutWithAttrs(invokeFrame: Frame) {
    let attrSyntax = this.attributes && <AttributeSyntax[]>this.attributes.statements.toArray();
    let outers = attrSyntax && attrSyntax.map(s => s.asEvaluated(invokeFrame));
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

interface DemoScopeOptions {
  component: Component;
}

class DemoScope extends Scope<DemoScopeOptions> {
  private hostOptions: DemoScopeOptions = null;

  child(localNames: InternedString[]): DemoScope {
    return new DemoScope(this, this.meta, localNames);
  }

  bindHostOptions(options: DemoScopeOptions) {
    this.hostOptions = options;
  }

  getHostOptions(): DemoScopeOptions {
    return this.hostOptions || (this.parent && this.parent.getHostOptions());
  }
}

export class DemoEnvironment extends Environment<DemoScopeOptions> {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, Component: ComponentClass, layout: Template) {
    this.components[name] = new ComponentDefinition(null, Component, layout, GlimmerAppendingComponent);
  }

  createRootScope(): DemoScope {
    return new DemoScope(null, this.meta, []);
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    if (statement.type === 'block') {
      let block = <BlockSyntax>statement;
      if (block.path.length === 1 && block.path[0] === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
      }

      if (block.path.length === 1 && block.path[0] === 'if') {
        return new IfSyntax({ args: block.args, templates: block.templates });
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope, helperName) {
    return new ConstReference(this.helpers[helperName[0]]);
  }

  getComponentDefinition(scope, name: string[]): ComponentDefinition {
    return this.components[name[0]];
  }
}

export let EmberComponent = EmberObject.extend();

export class MyComponent implements Component {
  public attrs: Object;

  constructor(attrs: Object) {
    this.attrs = attrs;
  }
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

  prettyPrint() {
    return `#if ${this.args.prettyPrint()}`;
  }

  compile(ops: OpSeq) {
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

    ops.append(new EnterOpcode(BEGIN, END));
    ops.append(BEGIN);
    ops.append(new ArgsOpcode(this.args));
    ops.append(new TestOpcode());

    if (this.templates.inverse) {
      ops.append(new JumpUnlessOpcode(ELSE));
      ops.append(new EvaluateOpcode(this.templates.default.raw));
      ops.append(new JumpOpcode(END));
      ops.append(ELSE);
      ops.append(new EvaluateOpcode(this.templates.inverse.raw));
    } else {
      ops.append(new JumpUnlessOpcode(END));
      ops.append(new EvaluateOpcode(this.templates.default.raw));
    }

    ops.append(END);
    ops.append(new ExitOpcode());
  }
}


class NoopSyntax extends StatementSyntax {
  clone(): NoopSyntax {
    return new NoopSyntax();
  }

  evaluate() {}
}

class OpenBlock extends StatementSyntax {
  clone(): OpenBlock {
    return new OpenBlock();
  }

  evaluate(stack: ElementStack) {
    stack.openBlock();
  }
}

interface CloseBlockOptions {
  syntax: StatementSyntax;
  template: Template;
}

class CloseBlock extends StatementSyntax {
  public syntax: StatementSyntax;
  public template: Template;

  constructor({ syntax, template }: CloseBlockOptions) {
    super();
    this.syntax = syntax;
    this.template = template;
  }

  clone(): CloseBlock {
    return new CloseBlock(this);
  }

  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation) {
    let result: RenderResult = stack.closeBlock(this.template);
    let morph: TemplateMorph = this.syntax.evaluate(stack, frame, evaluation);
    morph.willAppend(stack);

    if (this.template) {
      morph.setRenderResult(result);
    } else {
      morph.didBecomeEmpty();
    }
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
