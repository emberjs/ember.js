import * as AST from './ast';

export { AST };

export interface ParseOptions {
  srcName?: string;
  ignoreStandalone?: boolean;
}

export function parse(input: string, options?: ParseOptions): AST.Program;
export function parseWithoutProcessing(input: string, options?: ParseOptions): AST.Program;
