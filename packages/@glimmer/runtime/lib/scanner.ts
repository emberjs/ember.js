import { CompilationMeta } from '@glimmer/interfaces';
import { EMPTY_ARRAY } from '@glimmer/util';
import * as WireFormat from '@glimmer/wire-format';
import Environment from './environment';
import * as ClientSide from './syntax/client-side';
import CompilableTemplate from './syntax/compilable-template';
import { ATTRS_BLOCK } from './syntax/functions';
import {
  Block,
  Program,
} from './syntax/interfaces';
import Ops = WireFormat.Ops;

export type DeserializedStatement = WireFormat.Statement | WireFormat.Statements.Attribute | WireFormat.Statements.Argument;

export default class Scanner {
  constructor(private block: WireFormat.SerializedTemplateBlock, private env: Environment) {
  }

  scanEntryPoint(meta: CompilationMeta): Program {
    let { block } = this;
    let { statements, symbols, hasEval } = block;
    return new CompilableTemplate(statements, { meta, symbols, hasEval });
  }

  scanBlock(meta: CompilationMeta): Block {
    let { block } = this;
    let { statements } = block;
    return new CompilableTemplate(statements, { meta, parameters: EMPTY_ARRAY });
  }

  scanLayout(meta: CompilationMeta, attrs: WireFormat.Statements.Attribute[], componentName?: string): Program {
    let { block } = this;
    let { statements, symbols, hasEval } = block;

    let symbolTable = { meta, hasEval, symbols };

    let newStatements: WireFormat.Statement[] = [];

    let toplevel: string | undefined;
    let inTopLevel = false;

    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i];
      if (WireFormat.Statements.isComponent(statement)) {
        let tagName = statement[1];
        if (!this.env.hasComponentDefinition(tagName, meta.templateMeta)) {
          if (toplevel !== undefined) {
            newStatements.push([Ops.OpenElement, tagName]);
          } else {
            toplevel = tagName;
            decorateTopLevelElement(tagName, symbols, attrs, newStatements);
          }
          addFallback(statement, newStatements);
        } else {
          if (toplevel === undefined && tagName === componentName) {
            toplevel = tagName;
            decorateTopLevelElement(tagName, symbols, attrs, newStatements);
            addFallback(statement, newStatements);
          }
        }
      } else {
        if (toplevel === undefined && WireFormat.Statements.isOpenElement(statement)) {
          toplevel = statement[1];
          inTopLevel = true;
          decorateTopLevelElement(toplevel, symbols, attrs, newStatements);
        } else {
          if (inTopLevel) {
            if (WireFormat.Statements.isFlushElement(statement)) {
              inTopLevel = false;
            } else if (WireFormat.Statements.isModifier(statement)) {
              throw Error(`Found modifier "${statement[1]}" on the top-level element of "${componentName}"\. Modifiers cannot be on the top-level element`);
            }
          }
          newStatements.push(statement);
        }
      }
    }
    newStatements.push([Ops.ClientSideStatement, ClientSide.Ops.DidRenderLayout]);
    return new CompilableTemplate(newStatements, symbolTable);
  }
}

function addFallback(statement: WireFormat.Statements.Component, buffer: WireFormat.Statement[]) {
  let [, , attrs, , block] = statement;
  for (let i = 0; i < attrs.length; i++) {
    buffer.push(attrs[i]);
  }
  buffer.push([ Ops.FlushElement ]);
  if (block) {
    let { statements } = block;
    for (let i = 0; i < statements.length; i++) {
      buffer.push(statements[i]);
    }
  }
  buffer.push([ Ops.CloseElement ]);
}

function decorateTopLevelElement(
  tagName: string,
  symbols: string[],
  attrs: WireFormat.Statements.Attribute[],
  buffer: WireFormat.Statement[]) {
  let attrsSymbol = symbols.push(ATTRS_BLOCK);
  buffer.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tagName]);
  buffer.push([Ops.ClientSideStatement, ClientSide.Ops.DidCreateElement]);
  buffer.push([Ops.Yield, attrsSymbol, EMPTY_ARRAY]);
  buffer.push(...attrs);
}
