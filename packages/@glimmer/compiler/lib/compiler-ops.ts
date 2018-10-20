import { AST } from '@glimmer/syntax';
import { Option, Opaque } from '@glimmer/interfaces';

/**
  - 0 - represents `this`
  - string - represents any other path
 */
export type PathHead = string | 0;
export interface CompilerOps<Variable> {
  startProgram: AST.Program;
  endProgram: null;
  startBlock: AST.Program;
  endBlock: null;
  text: string;
  comment: string;
  openElement: AST.ElementNode;
  openComponent: AST.ElementNode;
  openNamedBlock: AST.ElementNode;
  openSplattedElement: AST.ElementNode;
  flushElement: AST.ElementNode;
  closeElement: AST.ElementNode;
  closeComponent: AST.ElementNode;
  closeNamedBlock: AST.ElementNode;
  closeDynamicComponent: AST.ElementNode;
  staticArg: string;
  dynamicArg: string;
  attrSplat: Option<Variable>;
  staticAttr: [string, Option<string>];
  trustingAttr: [string, Option<string>];
  dynamicAttr: [string, Option<string>];
  modifier: string;
  append: boolean;
  block: [string, number, Option<number>];
  get: [Variable, string[]]; // path
  literal: string | boolean | number | null | undefined;
  helper: string;
  unknown: string;
  maybeLocal: string[];
  yield: Variable;
  debugger: Option<Variable[]>;
  partial: Option<Variable[]>;
  hasBlock: Variable;
  hasBlockParams: Variable;

  prepareArray: number;
  prepareObject: number;
  concat: null;
}

export interface TemplateCompilerOps extends CompilerOps<PathHead> {
  maybeGet: [PathHead, string[]]; // {{path}}, might be helper
}

export type OpName = keyof CompilerOps<Opaque>;

export type Processor<
  InOps extends CompilerOps<Opaque>,
  OutVariable,
  OutOps extends CompilerOps<OutVariable>
> = {
  [P in keyof InOps & keyof OutOps]: (operand: InOps[P]) => void | Op<OutVariable, OutOps, OpName>
};

export type Op<V, O extends CompilerOps<V>, K extends keyof O = keyof O> = {
  0: K;
  1: O[K];
};
