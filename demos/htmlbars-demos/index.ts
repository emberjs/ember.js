import {
  Block,
  Scope,
  Helper,
  Template,
  DOMHelper,
  Environment,
  Component,
  ComponentClass,
  ComponentDefinition,
  StatementSyntax,
  ParamsAndHash,
  ElementStack,
  Frame,
  ContentMorph,
  Templates,
  MorphList
} from 'htmlbars-runtime';

import {
  compileSpec
} from 'htmlbars-compiler';

import {
  Meta,
  ConstReference
} from 'htmlbars-reference';

import {
  dict,
  LITERAL
} from 'htmlbars-util';

export function compile(template: string, options: Object) {
  let spec = compileSpec(template, options);
  return Template.fromSpec(JSON.parse(spec));
}

export class DemoEnvironment extends Environment {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, klass: ComponentClass, layout: Template) {
    this.components[name] = { class: klass, layout };
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    if (statement.type === 'block') {
      let block = <Block>statement;
      if (block.path.length === 1 && block.path[0] === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
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

export class MyComponent implements Component {
  public attrs: Object;

  constructor(attrs: Object) {
    this.attrs = attrs;
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