import { EvaluationStack } from './stack';
import { dict, EMPTY_ARRAY } from '@glimmer/util';
import {
  Dict,
  Option,
  BlockSymbolTable,
  VMArguments,
  CapturedArguments,
  PositionalArguments,
  CapturedPositionalArguments,
  NamedArguments,
  CapturedNamedArguments,
  JitOrAotBlock,
  BlockValue,
  ScopeBlock,
  CapturedBlockArguments,
  Scope,
  BlockArguments,
} from '@glimmer/interfaces';
import {
  Reference,
  UNDEFINED_REFERENCE,
  valueForRef,
  createDebugAliasRef,
} from '@glimmer/reference';
import { Tag, CONSTANT_TAG } from '@glimmer/validator';
import { CheckBlockSymbolTable, check, CheckHandle, CheckOption, CheckOr } from '@glimmer/debug';
import { CheckReference, CheckCompilableBlock, CheckScope } from '../compiled/opcodes/-debug-strip';
import { REGISTERS } from '../symbols';
import { $sp } from '@glimmer/vm';
import { DEBUG } from '@glimmer/env';

/*
  The calling convention is:

  * 0-N block arguments at the bottom
  * 0-N positional arguments next (left-to-right)
  * 0-N named arguments next
*/

export class VMArgumentsImpl implements VMArguments {
  private stack: Option<EvaluationStack> = null;
  public positional = new PositionalArgumentsImpl();
  public named = new NamedArgumentsImpl();
  public blocks = new BlockArgumentsImpl();

  empty(stack: EvaluationStack): this {
    let base = stack[REGISTERS][$sp] + 1;

    this.named.empty(stack, base);
    this.positional.empty(stack, base);
    this.blocks.empty(stack, base);

    return this;
  }

  setup(
    stack: EvaluationStack,
    names: string[],
    blockNames: string[],
    positionalCount: number,
    atNames: boolean
  ) {
    this.stack = stack;

    /*
           | ... | blocks      | positional  | named |
           | ... | b0    b1    | p0 p1 p2 p3 | n0 n1 |
     index | ... | 4/5/6 7/8/9 | 10 11 12 13 | 14 15 |
                   ^             ^             ^  ^
                 bbase         pbase       nbase  sp
    */

    let named = this.named;
    let namedCount = names.length;
    let namedBase = stack[REGISTERS][$sp] - namedCount + 1;

    named.setup(stack, namedBase, namedCount, names, atNames);

    let positional = this.positional;
    let positionalBase = namedBase - positionalCount;

    positional.setup(stack, positionalBase, positionalCount);

    let blocks = this.blocks;
    let blocksCount = blockNames.length;
    let blocksBase = positionalBase - blocksCount * 3;

    blocks.setup(stack, blocksBase, blocksCount, blockNames);
  }

  get base(): number {
    return this.blocks.base;
  }

  get length(): number {
    return this.positional.length + this.named.length + this.blocks.length * 3;
  }

  at(pos: number): Reference {
    return this.positional.at(pos);
  }

  realloc(offset: number) {
    let { stack } = this;
    if (offset > 0 && stack !== null) {
      let { positional, named } = this;
      let newBase = positional.base + offset;
      let length = positional.length + named.length;

      for (let i = length - 1; i >= 0; i--) {
        stack.copy(i + positional.base, i + newBase);
      }

      positional.base += offset;
      named.base += offset;
      stack[REGISTERS][$sp] += offset;
    }
  }

  capture(): CapturedArguments {
    let positional = this.positional.length === 0 ? EMPTY_POSITIONAL : this.positional.capture();
    let named = this.named.length === 0 ? EMPTY_NAMED : this.named.capture();

    return { named, positional } as CapturedArguments;
  }

  clear(): void {
    let { stack, length } = this;
    if (length > 0 && stack !== null) stack.pop(length);
  }
}

export class PositionalArgumentsImpl implements PositionalArguments {
  public base = 0;
  public length = 0;

  private stack: EvaluationStack = null as any;

  private _references: Option<Reference<unknown>[]> = null;

  empty(stack: EvaluationStack, base: number) {
    this.stack = stack;
    this.base = base;
    this.length = 0;

    this._references = EMPTY_ARRAY;
  }

  setup(stack: EvaluationStack, base: number, length: number) {
    this.stack = stack;
    this.base = base;
    this.length = length;

    if (length === 0) {
      this._references = EMPTY_ARRAY;
    } else {
      this._references = null;
    }
  }

  at(position: number): Reference {
    let { base, length, stack } = this;

    if (position < 0 || position >= length) {
      return UNDEFINED_REFERENCE;
    }

    return check(stack.get(position, base), CheckReference);
  }

  capture(): CapturedPositionalArguments {
    return this.references as CapturedPositionalArguments;
  }

  prepend(other: CapturedPositionalArguments) {
    let additions = other.length;

    if (additions > 0) {
      let { base, length, stack } = this;

      this.base = base = base - additions;
      this.length = length + additions;

      for (let i = 0; i < additions; i++) {
        stack.set(other[i], i, base);
      }

      this._references = null;
    }
  }

  private get references(): Reference<unknown>[] {
    let references = this._references;

    if (!references) {
      let { stack, base, length } = this;
      references = this._references = stack.slice<Reference<unknown>>(base, base + length);
    }

    return references;
  }
}

export class NamedArgumentsImpl implements NamedArguments {
  public base = 0;
  public length = 0;

  private stack!: EvaluationStack;

  private _references: Option<Reference<unknown>[]> = null;

  private _names: Option<string[]> = EMPTY_ARRAY;
  private _atNames: Option<string[]> = EMPTY_ARRAY;

  empty(stack: EvaluationStack, base: number) {
    this.stack = stack;
    this.base = base;
    this.length = 0;

    this._references = EMPTY_ARRAY;
    this._names = EMPTY_ARRAY;
    this._atNames = EMPTY_ARRAY;
  }

  setup(stack: EvaluationStack, base: number, length: number, names: string[], atNames: boolean) {
    this.stack = stack;
    this.base = base;
    this.length = length;

    if (length === 0) {
      this._references = EMPTY_ARRAY;
      this._names = EMPTY_ARRAY;
      this._atNames = EMPTY_ARRAY;
    } else {
      this._references = null;

      if (atNames) {
        this._names = null;
        this._atNames = names;
      } else {
        this._names = names;
        this._atNames = null;
      }
    }
  }

  get names(): string[] {
    let names = this._names;

    if (!names) {
      names = this._names = this._atNames!.map(this.toSyntheticName);
    }

    return names!;
  }

  get atNames(): string[] {
    let atNames = this._atNames;

    if (!atNames) {
      atNames = this._atNames = this._names!.map(this.toAtName);
    }

    return atNames!;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get(name: string, atNames = false): Reference {
    let { base, stack } = this;

    let names = atNames ? this.atNames : this.names;

    let idx = names.indexOf(name);

    if (idx === -1) {
      return UNDEFINED_REFERENCE;
    }

    let ref = stack.get<Reference>(idx, base);

    if (DEBUG) {
      return createDebugAliasRef!(atNames ? name : `@${name}`, ref);
    } else {
      return ref;
    }
  }

  capture(): CapturedNamedArguments {
    let { names, references } = this;
    let map = dict<Reference<unknown>>();

    for (let i = 0; i < names.length; i++) {
      let name = names[i];

      if (DEBUG) {
        map[name] = createDebugAliasRef!(`@${name}`, references[i]);
      } else {
        map[name] = references[i];
      }
    }

    return map as CapturedNamedArguments;
  }

  merge(other: CapturedNamedArguments) {
    let keys = Object.keys(other);

    if (keys.length > 0) {
      let { names, length, stack } = this;
      let newNames = names.slice();

      for (let i = 0; i < keys.length; i++) {
        let name = keys[i];
        let idx = newNames.indexOf(name);

        if (idx === -1) {
          length = newNames.push(name);
          stack.pushJs(other[name]);
        }
      }

      this.length = length;
      this._references = null;
      this._names = newNames;
      this._atNames = null;
    }
  }

  private get references(): Reference<unknown>[] {
    let references = this._references;

    if (!references) {
      let { base, length, stack } = this;
      references = this._references = stack.slice<Reference<unknown>>(base, base + length);
    }

    return references;
  }

  private toSyntheticName(this: void, name: string): string {
    return name.slice(1);
  }

  private toAtName(this: void, name: string): string {
    return `@${name}`;
  }
}

function toSymbolName(name: string): string {
  return `&${name}`;
}

export class BlockArgumentsImpl<C extends JitOrAotBlock> implements BlockArguments<C> {
  private stack!: EvaluationStack;
  private internalValues: Option<number[]> = null;
  private _symbolNames: Option<string[]> = null;

  public internalTag: Option<Tag> = null;
  public names: string[] = EMPTY_ARRAY;

  public length = 0;
  public base = 0;

  empty(stack: EvaluationStack, base: number) {
    this.stack = stack;
    this.names = EMPTY_ARRAY;
    this.base = base;
    this.length = 0;
    this._symbolNames = null;

    this.internalTag = CONSTANT_TAG;
    this.internalValues = EMPTY_ARRAY;
  }

  setup(stack: EvaluationStack, base: number, length: number, names: string[]) {
    this.stack = stack;
    this.names = names;
    this.base = base;
    this.length = length;
    this._symbolNames = null;

    if (length === 0) {
      this.internalTag = CONSTANT_TAG;
      this.internalValues = EMPTY_ARRAY;
    } else {
      this.internalTag = null;
      this.internalValues = null;
    }
  }

  get values(): BlockValue[] {
    let values = this.internalValues;

    if (!values) {
      let { base, length, stack } = this;
      values = this.internalValues = stack.slice<number>(base, base + length * 3);
    }

    return values;
  }

  has(name: string): boolean {
    return this.names!.indexOf(name) !== -1;
  }

  get(name: string): Option<ScopeBlock<C>> {
    let idx = this.names!.indexOf(name);

    if (idx === -1) {
      return null;
    }

    let { base, stack } = this;

    let table = check(stack.get(idx * 3, base), CheckOption(CheckBlockSymbolTable));
    let scope = check(stack.get(idx * 3 + 1, base), CheckOption(CheckScope));
    let handle = check(
      stack.get(idx * 3 + 2, base),
      CheckOption(CheckOr(CheckHandle, CheckCompilableBlock))
    );

    return handle === null ? null : ([handle, scope!, table!] as ScopeBlock<C>);
  }

  capture(): CapturedBlockArguments {
    return new CapturedBlockArgumentsImpl(this.names, this.values);
  }

  get symbolNames(): string[] {
    let symbolNames = this._symbolNames;

    if (symbolNames === null) {
      symbolNames = this._symbolNames = this.names.map(toSymbolName);
    }

    return symbolNames;
  }
}

class CapturedBlockArgumentsImpl implements CapturedBlockArguments {
  public length: number;

  constructor(public names: string[], public values: Option<BlockValue>[]) {
    this.length = names.length;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get(name: string): Option<ScopeBlock> {
    let idx = this.names.indexOf(name);

    if (idx === -1) return null;

    return [
      this.values[idx * 3 + 2] as number,
      this.values[idx * 3 + 1] as Scope<JitOrAotBlock>,
      this.values[idx * 3] as BlockSymbolTable,
    ];
  }
}

export function createCapturedArgs(named: Dict<Reference>, positional: Reference[]) {
  return {
    named,
    positional,
  } as CapturedArguments;
}

export function reifyNamed(named: CapturedNamedArguments) {
  let reified = dict();

  for (let key in named) {
    reified[key] = valueForRef(named[key]);
  }

  return reified;
}

export function reifyPositional(positional: CapturedPositionalArguments) {
  return positional.map(valueForRef);
}

export function reifyArgs(args: CapturedArguments) {
  return {
    named: reifyNamed(args.named),
    positional: reifyPositional(args.positional),
  };
}

export const EMPTY_NAMED = Object.freeze(Object.create(null)) as CapturedNamedArguments;
export const EMPTY_POSITIONAL = EMPTY_ARRAY as CapturedPositionalArguments;
export const EMPTY_ARGS = createCapturedArgs(EMPTY_NAMED, EMPTY_POSITIONAL);
