import { CompilerOps, Processor, Op, OpName, TemplateCompilerOps } from "./compiler-ops";
import { AST } from "@glimmer/syntax";
import { Option, Opaque } from "@glimmer/interfaces";
import { Stack, expect } from "@glimmer/util";
import { SymbolTable } from "./template-visitor";

export type InVariable = 0 | string;
export type OutVariable = number;

export type OutOp<K extends keyof CompilerOps<OutVariable> = OpName> = Op<OutVariable, CompilerOps<OutVariable>, K>;
export type InOp<K extends keyof TemplateCompilerOps = keyof TemplateCompilerOps> = Op<0 | string, TemplateCompilerOps, K>;

export class SymbolAllocator implements Processor<CompilerOps<InVariable>, OutVariable, CompilerOps<OutVariable>> {
  private symbolStack = new Stack<SymbolTable>();

  constructor(private ops: Array<InOp>) {}

  process(): OutOp[] {
    let out: OutOp[] = [];

    for (let op of this.ops) {
      let result = this.dispatch(op);

      if (result === undefined) {
        out.push(op as any);
      } else {
        out.push(result as any);
      }
    }

    return out;
  }

  dispatch<O extends InOp>(op: O): Opaque {
    let name = op[0];
    let operand = op[1];

    return (this[name] as any)(operand);
  }

  get symbols(): SymbolTable {
    return expect(this.symbolStack.current, 'Expected a symbol table on the stack');
  }

  startProgram(op: AST.Program) {
    this.symbolStack.push(op['symbols']);
  }

  endProgram(_op: null) {
    this.symbolStack.pop();
  }

  startBlock(op: AST.Program) {
    this.symbolStack.push(op['symbols']);
  }

  endBlock(_op: null) {
    this.symbolStack.pop();
  }

  flushElement(op: AST.ElementNode) {
    this.symbolStack.push(op['symbols']);
  }

  closeElement(_op: AST.ElementNode) {
    this.symbolStack.pop();
  }

  attrSplat(_op: null): OutOp<'attrSplat'> {
    return ['attrSplat', this.symbols.allocateBlock('attrs')];
  }

  get(op: [InVariable, string[]]): OutOp<'get' | 'maybeLocal'> {
    let [name, rest] = op;

    if (name === 0) {
      return ['get', [0, rest]];
    }

    if (isLocal(name, this.symbols)) {
      let head = this.symbols.get(name);
      return ['get', [head, rest]];
    } else if (name[0] === '@') {
      let head = this.symbols.allocateNamed(name);
      return ['get', [head, rest]];
    } else {
      return ['maybeLocal', [name, ...rest]];
    }
  }

  maybeGet(op: [InVariable, string[]]): OutOp<'get' | 'unknown' | 'maybeLocal'> {
    let [name, rest] = op;

    if (name === 0) {
      return ['get', [0, rest]];
    }

    if (isLocal(name, this.symbols)) {
      let head = this.symbols.get(name);
      return ['get', [head, rest]];
    } else if (name[0] === '@') {
      let head = this.symbols.allocateNamed(name);
      return ['get', [head, rest]];
    } else if (rest.length === 0) {
      return ['unknown', name];
    } else {
      return ['maybeLocal', [name, ...rest]];
    }
  }

  yield(op: InVariable): OutOp<'yield'> {
    if (op === 0) {
      throw new Error('Cannot yield to this');
    }

    return ['yield', this.symbols.allocateBlock(op)];
  }

  debugger(_op: null): OutOp<'debugger'> {
    return ['debugger', this.symbols.getEvalInfo()];
  }

  hasBlock(op: InVariable): OutOp<'hasBlock'> {
    if (op === 0) {
      throw new Error('Cannot hasBlock this');
    }

    return ['hasBlock', this.symbols.allocateBlock(op)];
  }

  hasBlockParams(op: InVariable): OutOp<'hasBlockParams'> {
    if (op === 0) {
      throw new Error('Cannot hasBlockParams this');
    }

    return ['hasBlockParams', this.symbols.allocateBlock(op)];
  }

  partial(_op: null): OutOp<'partial'> {
    return ['partial', this.symbols.getEvalInfo()];
  }

  text(_op: string) {}
  comment(_op: string) {}
  openElement(_op: AST.ElementNode) {}
  openSplattedElement(_op: AST.ElementNode) {}
  staticArg(_op: string) {}
  dynamicArg(_op: string) {}
  staticAttr(_op: [string, Option<string>]) {}
  trustingAttr(_op: [string, Option<string>]) {}
  dynamicAttr(_op: [string, Option<string>]) {}
  modifier(_op: string) {}
  append(_op: boolean) {}
  block(_op: [string, number, Option<number>]) {}
  literal(_op: string | boolean | number | null | undefined) {}
  helper(_op: string) {}
  unknown(_op: string) {}
  maybeLocal(_op: string[]) {}
  prepareArray(_op: number) {}
  prepareObject(_op: number) {}
  concat(_op: null) {}
}

function isLocal(name: string, symbols: SymbolTable): boolean {
  return symbols && symbols.has(name);
}
