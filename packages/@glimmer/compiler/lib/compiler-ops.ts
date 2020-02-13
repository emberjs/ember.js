import { AST } from '@glimmer/syntax';
import { Option, WireFormat, ExpressionContext } from '@glimmer/interfaces';

/**
  - 0 - represents `this`
  - string - represents any other path
 */
export type PathHead = string | 0;

export interface SourceLocation {
  source: string | null;
  start: number;
  end: number;
}

export interface InputOps {
  startProgram: [AST.Template];
  endProgram: [AST.Template];
  startBlock: [AST.Block];
  endBlock: [AST.Block];
  block: [AST.BlockStatement];
  mustache: [AST.MustacheStatement];
  openElement: [AST.ElementNode];
  closeElement: [AST.ElementNode];
  text: [AST.TextNode];
  comment: [AST.CommentStatement];
}

// type Location = ['loc', [null, [number, number], [number, number]]];

export interface AllocateSymbolsOps {
  startProgram: AST.Template;
  endProgram: void;
  startBlock: AST.Block;
  endBlock: void;
  append: boolean;
  text: string;
  comment: string;
  block: [number, Option<number>];
  yield: string;
  debugger: null;
  hasBlock: string;
  hasBlockParams: string;
  partial: void;

  openElement: [AST.ElementNode, boolean];
  closeElement: AST.ElementNode;
  openComponent: AST.ElementNode;
  closeComponent: AST.ElementNode;
  openNamedBlock: AST.ElementNode;
  closeNamedBlock: AST.ElementNode;
  closeDynamicComponent: AST.ElementNode;
  flushElement: AST.ElementNode;

  staticArg: string;
  dynamicArg: string;
  staticAttr: [string, Option<string>];
  staticComponentAttr: [string, Option<string>];
  componentAttr: [string, Option<string>];
  dynamicAttr: [string, Option<string>];
  trustingComponentAttr: [string, Option<string>];
  trustingAttr: [string, Option<string>];
  attrSplat: void;

  getVar: [string, ExpressionContext];
  getArg: string;
  getFree: string;
  getThis: void;

  getPath: string[];

  modifier: void;
  helper: void;

  literal: string | boolean | number | null | undefined;
  concat: void;

  prepareArray: number;
  prepareObject: number;
}

export interface JavaScriptCompilerOps {
  text: string;
  comment: string;

  openElement: [AST.ElementNode, boolean];
  closeElement: AST.ElementNode;
  openComponent: AST.ElementNode;
  closeComponent: AST.ElementNode;
  openNamedBlock: AST.ElementNode;
  closeNamedBlock: AST.ElementNode;
  closeDynamicComponent: AST.ElementNode;
  flushElement: AST.ElementNode;

  staticAttr: [string, Option<string>];
  staticComponentAttr: [string, Option<string>];
  componentAttr: [string, Option<string>];
  dynamicAttr: [string, Option<string>];
  trustingComponentAttr: [string, Option<string>];
  trustingAttr: [string, Option<string>];

  helper: void;
  modifier: void;
  block: [number, Option<number>];
  attrSplat: Option<number>;
  getPath: string[];
  getSymbol: number;
  getFree: number;
  getFreeWithContext: [number, ExpressionContext];
  yield: number;

  hasBlock: number;
  hasBlockParams: number;

  debugger: WireFormat.Core.EvalInfo;
  partial: WireFormat.Core.EvalInfo;
}

export type Processor<InOps extends PipelineOps> = {
  [P in keyof InOps]: InOps[P] extends void ? () => void : (op: InOps[P]) => void;
};

export type PipelineOps = InputOps | AllocateSymbolsOps | JavaScriptCompilerOps;

export type OpsDict<O extends PipelineOps> = {
  [K in keyof O]: O[K] extends void ? [K] : [K, O[K]];
};
export type Ops<O extends PipelineOps> = OpsDict<O>[keyof O];
export type Op<O extends PipelineOps, K extends keyof O> = OpsDict<O>[K];
