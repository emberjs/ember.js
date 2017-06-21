import { CompilationMeta } from '@glimmer/interfaces';
import { EMPTY_ARRAY, assert, unreachable } from '@glimmer/util';
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
import { TemplateMeta } from "@glimmer/wire-format";

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
    let { symbols, hasEval } = block;

    let scanner = new LayoutScanner(block, this.env, meta, attrs, componentName);

    return new CompilableTemplate(scanner.scan(), { meta, hasEval, symbols });
  }
}

const enum LayoutState {
  BeforeTopLevel,
  InTopLevel,
  AfterFlush
}

class LayoutScanner {
  private state = LayoutState.BeforeTopLevel;
  private symbols: string[];
  private statements: WireFormat.Statement[];
  private meta: TemplateMeta;

  constructor(block: WireFormat.SerializedTemplateBlock, private env: Environment, meta: CompilationMeta, private attrs: WireFormat.Statements.Attribute[], private componentName?: string) {
    let { statements, symbols } = block;
    this.statements = statements;
    this.symbols = symbols;
    this.meta = meta.templateMeta;
  }

  scan(): WireFormat.Statement[] {
    let { statements } = this;
    this.state = LayoutState.BeforeTopLevel;

    let buffer: WireFormat.Statement[] = [];

    for (let i=0; i<statements.length; i++) {
      this.processStatement(this.statements[i], buffer);
    }

    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.DidRenderLayout]);

    return buffer;
  }

  private processStatement(statement: WireFormat.Statement, buffer: WireFormat.Statement[]) {
    switch (this.state) {
      case LayoutState.BeforeTopLevel:
        this.processBeforeTopLevel(statement, buffer);
        break;

      case LayoutState.InTopLevel:
        this.processInTopLevel(statement, buffer);
        break;

      case LayoutState.AfterFlush:
        buffer.push(statement);
        break;

      default:
        throw unreachable();
    }
  }

  private processBeforeTopLevel(statement: WireFormat.Statement, buffer: WireFormat.Statement[]) {
    if (WireFormat.Statements.isComponent(statement)) {
      this.processTopLevelComponent(statement, buffer);
    } else if (WireFormat.Statements.isOpenElement(statement)) {
      this.processIsOpenElement(statement, buffer);
    } else {
      // Should be whitespace
      buffer.push(statement);
    }
  }

  private processTopLevelComponent(statement: WireFormat.Statements.Component, buffer: WireFormat.Statement[]) {
    let [, tagName, attrs, , block] = statement;

    if (this.env.hasComponentDefinition(tagName, this.meta) && tagName !== this.componentName) {
      buffer.push(statement);
      this.state = LayoutState.AfterFlush;
      return;
    }

    assert(!this.env.hasComponentDefinition(tagName, this.meta) || tagName === this.componentName, `Cannot use a component (<${tagName}>) as the top-level element in the layout of <${this.componentName}>`);

    this.state = LayoutState.InTopLevel;

    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.SetComponentAttrs, true]);
    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tagName]);
    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.DidCreateElement]);

    for (let i=0; i<attrs.length; i++) {
      this.processStatement(attrs[i], buffer);
    }

    this.processStatement([ Ops.FlushElement ], buffer);

    if (block) {
      let { statements } = block;

      for (let i=0; i<statements.length; i++) {
        this.processStatement(statements[i], buffer);
      }
    }

    this.processStatement([ Ops.CloseElement ], buffer);
  }

  private processIsOpenElement(statement: WireFormat.Statements.OpenElement, buffer: WireFormat.Statement[]) {
    let [, tagName] = statement;

    this.state = LayoutState.InTopLevel;

    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.SetComponentAttrs, true]);
    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tagName]);
    buffer.push([Ops.ClientSideStatement, ClientSide.Ops.DidCreateElement]);
  }

  private processInTopLevel(statement: WireFormat.Statement, buffer: WireFormat.Statement[]) {
    assert(!WireFormat.Statements.isModifier(statement), `Cannot use element modifiers ({{${statement[1]} ...}}) in the top-level element in the layout of <${this.componentName}>`);

    if (WireFormat.Statements.isFlushElement(statement)) {
      let { symbols, attrs } = this;
      this.state = LayoutState.AfterFlush;

      let attrsSymbol = symbols.push(ATTRS_BLOCK);
      buffer.push(...attrs);
      buffer.push([Ops.Yield, attrsSymbol, EMPTY_ARRAY]);
      buffer.push([Ops.ClientSideStatement, ClientSide.Ops.SetComponentAttrs, false]);
    }

    buffer.push(statement);
  }
}
