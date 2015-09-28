import {
  Environment,
  DOMHelper,
  StatementSyntax,
  ParamsAndHash,
  ElementStack,
  Morph,
  ContentMorph,
  ContentMorphSpecializer,
  ContentMorphConstructor,
  MorphList,
  MorphListOptions,
  Templates,
  Block,
  Frame
} from "htmlbars-runtime";

import { LITERAL } from 'htmlbars-util';

import { Meta, ConstReference } from "htmlbars-reference";

export class TestEnvironment extends Environment {
  private helpers={};

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    if (statement.type === 'block') {
      let block = <Block>statement;
      if (block.path.length === 1 && block.path[0] === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
      }
    }

    return statement;
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope, helperName) {
    return new ConstReference(this.helpers[helperName[0]]);
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
    return stack.createContentMorph(MorphList, { key, reference: list, templates: this.templates })
  }
}