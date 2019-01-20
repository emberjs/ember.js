import { EvaluationStack } from './stack';
import { dict, EMPTY_ARRAY } from '@glimmer/util';
import { combineTagged } from '@glimmer/reference';
import {
  Dict,
  Option,
  unsafe,
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
import { Tag, VersionedPathReference, CONSTANT_TAG } from '@glimmer/reference';
import { PrimitiveReference, UNDEFINED_REFERENCE } from '../references';
import { CheckBlockSymbolTable, check, CheckHandle, CheckOption, CheckOr } from '@glimmer/debug';
import {
  CheckPathReference,
  CheckCompilableBlock,
  CheckScope,
} from '../compiled/opcodes/-debug-strip';
import { REGISTERS } from '../symbols';
import { $sp } from '@glimmer/vm';

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

  get tag(): Tag {
    return combineTagged([this.positional, this.named]);
  }

  get base(): number {
    return this.blocks.base;
  }

  get length(): number {
    return this.positional.length + this.named.length + this.blocks.length * 3;
  }

  at<T extends VersionedPathReference<unknown>>(pos: number): T {
    return this.positional.at<T>(pos);
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

    return new CapturedArgumentsImpl(this.tag, positional, named, this.length);
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

  private _tag: Option<Tag> = null;
  private _references: Option<VersionedPathReference<unknown>[]> = null;

  empty(stack: EvaluationStack, base: number) {
    this.stack = stack;
    this.base = base;
    this.length = 0;

    this._tag = CONSTANT_TAG;
    this._references = EMPTY_ARRAY;
  }

  setup(stack: EvaluationStack, base: number, length: number) {
    this.stack = stack;
    this.base = base;
    this.length = length;

    if (length === 0) {
      this._tag = CONSTANT_TAG;
      this._references = EMPTY_ARRAY;
    } else {
      this._tag = null;
      this._references = null;
    }
  }

  get tag(): Tag {
    let tag = this._tag;

    if (!tag) {
      tag = this._tag = combineTagged(this.references);
    }

    return tag;
  }

  at<T extends VersionedPathReference<unknown>>(position: number): T {
    let { base, length, stack } = this;

    if (position < 0 || position >= length) {
      return (UNDEFINED_REFERENCE as unsafe) as T;
    }

    return check(stack.get(position, base), CheckPathReference) as T;
  }

  capture(): CapturedPositionalArgumentsImpl {
    return new CapturedPositionalArgumentsImpl(this.tag, this.references);
  }

  prepend(other: CapturedPositionalArguments) {
    let additions = other.length;

    if (additions > 0) {
      let { base, length, stack } = this;

      this.base = base = base - additions;
      this.length = length + additions;

      for (let i = 0; i < additions; i++) {
        stack.set(other.at(i), i, base);
      }

      this._tag = null;
      this._references = null;
    }
  }

  private get references(): VersionedPathReference<unknown>[] {
    let references = this._references;

    if (!references) {
      let { stack, base, length } = this;
      references = this._references = stack.sliceArray<VersionedPathReference<unknown>>(
        base,
        base + length
      );
    }

    return references;
  }
}

export class CapturedPositionalArgumentsImpl implements CapturedPositionalArguments {
  static empty(): CapturedPositionalArguments {
    return new CapturedPositionalArgumentsImpl(CONSTANT_TAG, EMPTY_ARRAY, 0);
  }

  constructor(
    public tag: Tag,
    public references: VersionedPathReference<unknown>[],
    public length = references.length
  ) {}

  at<T extends VersionedPathReference<unknown>>(position: number): T {
    return this.references[position] as T;
  }

  value(): unknown[] {
    return this.references.map(this.valueOf);
  }

  get(name: string): VersionedPathReference<unknown> {
    let { references, length } = this;

    if (name === 'length') {
      return PrimitiveReference.create(length);
    } else {
      let idx = parseInt(name, 10);

      if (idx < 0 || idx >= length) {
        return UNDEFINED_REFERENCE;
      } else {
        return references[idx];
      }
    }
  }

  private valueOf(this: void, reference: VersionedPathReference<unknown>): unknown {
    return reference.value();
  }
}

export class NamedArgumentsImpl implements NamedArguments {
  public base = 0;
  public length = 0;

  private stack!: EvaluationStack;

  private _references: Option<VersionedPathReference<unknown>[]> = null;

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

  get tag(): Tag {
    return combineTagged(this.references);
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

  get<T extends VersionedPathReference<unknown>>(name: string, atNames = false): T {
    let { base, stack } = this;

    let names = atNames ? this.atNames : this.names;

    let idx = names.indexOf(name);

    if (idx === -1) {
      return (UNDEFINED_REFERENCE as unsafe) as T;
    }

    return stack.get<T>(idx, base);
  }

  capture(): CapturedNamedArguments {
    return new CapturedNamedArgumentsImpl(this.tag, this.names, this.references);
  }

  merge(other: CapturedNamedArguments) {
    let { length: extras } = other;

    if (extras > 0) {
      let { names, length, stack } = this;
      let { names: extraNames } = other;

      if (Object.isFrozen(names) && names.length === 0) {
        names = [];
      }

      for (let i = 0; i < extras; i++) {
        let name = extraNames[i];
        let idx = names.indexOf(name);

        if (idx === -1) {
          length = names.push(name);
          stack.push(other.references[i]);
        }
      }

      this.length = length;
      this._references = null;
      this._names = names;
      this._atNames = null;
    }
  }

  private get references(): VersionedPathReference<unknown>[] {
    let references = this._references;

    if (!references) {
      let { base, length, stack } = this;
      references = this._references = stack.sliceArray<VersionedPathReference<unknown>>(
        base,
        base + length
      );
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

export class CapturedNamedArgumentsImpl implements CapturedNamedArguments {
  public length: number;
  private _map: Option<Dict<VersionedPathReference<unknown>>>;

  constructor(
    public tag: Tag,
    public names: string[],
    public references: VersionedPathReference<unknown>[]
  ) {
    this.length = names.length;
    this._map = null;
  }

  get map() {
    let map = this._map;

    if (!map) {
      let { names, references } = this;
      map = this._map = dict<VersionedPathReference<unknown>>();

      for (let i = 0; i < names.length; i++) {
        let name = names[i];
        map![name] = references[i];
      }
    }

    return map;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get<T extends VersionedPathReference<unknown>>(name: string): T {
    let { names, references } = this;
    let idx = names.indexOf(name);

    if (idx === -1) {
      return (UNDEFINED_REFERENCE as unsafe) as T;
    } else {
      return references[idx] as T;
    }
  }

  value(): Dict<unknown> {
    let { names, references } = this;
    let out = dict<unknown>();

    for (let i = 0; i < names.length; i++) {
      let name = names[i];
      out[name] = references[i].value();
    }

    return out;
  }
}

export class BlockArgumentsImpl<C extends JitOrAotBlock> implements BlockArguments<C> {
  private stack!: EvaluationStack;
  private internalValues: Option<number[]> = null;

  public internalTag: Option<Tag> = null;
  public names: string[] = EMPTY_ARRAY;

  public length = 0;
  public base = 0;

  empty(stack: EvaluationStack, base: number) {
    this.stack = stack;
    this.names = EMPTY_ARRAY;
    this.base = base;
    this.length = 0;

    this.internalTag = CONSTANT_TAG;
    this.internalValues = EMPTY_ARRAY;
  }

  setup(stack: EvaluationStack, base: number, length: number, names: string[]) {
    this.stack = stack;
    this.names = names;
    this.base = base;
    this.length = length;

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
      values = this.internalValues = stack.sliceArray<number>(base, base + length * 3);
    }

    return values;
  }

  has(name: string): boolean {
    return this.names!.indexOf(name) !== -1;
  }

  get(name: string): Option<ScopeBlock<C>> {
    let { base, stack, names } = this;

    let idx = names!.indexOf(name);

    if (names!.indexOf(name) === -1) {
      return null;
    }

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
}

class CapturedBlockArgumentsImpl implements CapturedBlockArguments {
  public length: number;

  constructor(public names: string[], public values: BlockValue[]) {
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

export class CapturedArgumentsImpl implements CapturedArguments {
  constructor(
    public tag: Tag,
    public positional: CapturedPositionalArguments,
    public named: CapturedNamedArguments,
    public length: number
  ) {}

  value() {
    return {
      named: this.named.value(),
      positional: this.positional.value(),
    };
  }
}

const EMPTY_NAMED = new CapturedNamedArgumentsImpl(CONSTANT_TAG, EMPTY_ARRAY, EMPTY_ARRAY);
const EMPTY_POSITIONAL = new CapturedPositionalArgumentsImpl(CONSTANT_TAG, EMPTY_ARRAY);
export const EMPTY_ARGS = new CapturedArgumentsImpl(CONSTANT_TAG, EMPTY_POSITIONAL, EMPTY_NAMED, 0);
