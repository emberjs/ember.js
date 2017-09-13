import { EvaluationStack } from './append';
import { dict, EMPTY_ARRAY } from '@glimmer/util';
import { combineTagged } from '@glimmer/reference';
import { Dict, Opaque, Option, unsafe, SymbolTable, BlockSymbolTable, VMHandle } from '@glimmer/interfaces';
import { Tag, VersionedPathReference, CONSTANT_TAG } from '@glimmer/reference';
import { PrimitiveReference, UNDEFINED_REFERENCE } from '../references';
import { ScopeBlock, Scope } from '../environment';
import { CheckBlockSymbolTable, check, CheckHandle, CheckOption, CheckOr } from '@glimmer/debug';
import { CheckPathReference, CheckCompilableBlock, CheckScope } from '../compiled/opcodes/-debug-strip';

/*
  The calling convention is:

  * 0-N block arguments at the bottom
  * 0-N positional arguments next (left-to-right)
  * 0-N named arguments next
*/

export interface IArguments {
  tag: Tag;
  length: number;
  positional: IPositionalArguments;
  named: INamedArguments;

  at<T extends VersionedPathReference<Opaque>>(pos: number): T;
  capture(): ICapturedArguments;
}

export interface ICapturedArguments {
  tag: Tag;
  length: number;
  positional: ICapturedPositionalArguments;
  named: ICapturedNamedArguments;
}

export interface IPositionalArguments {
  tag: Tag;
  length: number;
  at<T extends VersionedPathReference<Opaque>>(position: number): T;
  capture(): ICapturedPositionalArguments;
}

export interface ICapturedPositionalArguments extends VersionedPathReference<Opaque[]> {
  tag: Tag;
  length: number;
  references: VersionedPathReference<Opaque>[];
  at<T extends VersionedPathReference<Opaque>>(position: number): T;
  value(): Opaque[];
}

export interface INamedArguments {
  tag: Tag;
  names: string[];
  length: number;
  has(name: string): boolean;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  capture(): ICapturedNamedArguments;
}

export interface IBlockArguments {
  names: string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Option<ScopeBlock>;
  capture(): ICapturedBlockArguments;
}

export interface ICapturedBlockArguments {
  names: string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Option<ScopeBlock>;
}

export interface ICapturedNamedArguments extends VersionedPathReference<Dict<Opaque>> {
  tag: Tag;
  map: Dict<VersionedPathReference<Opaque>>;
  names: string[];
  length: number;
  references: VersionedPathReference<Opaque>[];
  has(name: string): boolean;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  value(): Dict<Opaque>;
}

export class Arguments implements IArguments {
  private stack: EvaluationStack = null as any;
  public positional = new PositionalArguments();
  public named = new NamedArguments();
  public blocks = new BlockArguments();

  setup(stack: EvaluationStack, names: string[], blockNames: string[], positionalCount: number, synthetic: boolean) {
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
    let namedBase  = stack.sp - namedCount + 1;

    named.setup(stack, namedBase, namedCount, names, synthetic);

    let positional = this.positional;
    let positionalBase = namedBase - positionalCount;

    positional.setup(stack, positionalBase, positionalCount);

    let blocks = this.blocks;
    let blocksCount = blockNames.length;
    let blocksBase = positionalBase - (blocksCount * 3);

    blocks.setup(stack, blocksBase, blocksCount, blockNames);
  }

  get tag(): Tag {
    return combineTagged([this.positional, this.named]);
  }

  get base(): number {
    return this.blocks.base;
  }

  get length(): number {
    return this.positional.length + this.named.length + (this.blocks.length * 3);
  }

  at<T extends VersionedPathReference<Opaque>>(pos: number): T {
    return this.positional.at<T>(pos);
  }

  realloc(offset: number) {
    if (offset > 0) {
      let { positional, named, stack } = this;
      let newBase = positional.base + offset;
      let length = positional.length + named.length;

      for(let i=length-1; i>=0; i--) {
        stack.set(stack.get(i, positional.base), i, newBase);
      }

      positional.base += offset;
      named.base += offset;
      stack.sp += offset;
    }
  }

  capture(): ICapturedArguments {
    let positional = this.positional.length === 0 ? EMPTY_POSITIONAL : this.positional.capture();
    let named = this.named.length === 0 ? EMPTY_NAMED : this.named.capture();
    return {
      tag: this.tag,
      length: this.length,
      positional,
      named
    };
  }

  clear(): void {
    let { stack, length } = this;
    stack.pop(length);
  }
}

export class PositionalArguments implements IPositionalArguments {
  public base = 0;
  public length = 0;

  private stack: EvaluationStack = null as any;

  private _tag: Option<Tag> = null;
  private _references: Option<VersionedPathReference<Opaque>[]> = null;

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

  at<T extends VersionedPathReference<Opaque>>(position: number): T {
    let { base, length, stack } = this;

    if (position < 0 || position >= length) {
      return UNDEFINED_REFERENCE as unsafe as T;
    }

    return check(stack.get(position, base), CheckPathReference) as T;
  }

  capture(): ICapturedPositionalArguments {
    return new CapturedPositionalArguments(this.tag, this.references);
  }

  prepend(other: ICapturedPositionalArguments) {
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

  private get references(): VersionedPathReference<Opaque>[] {
    let references = this._references;

    if (!references) {
      let { stack, base, length } = this;
      references = this._references = stack.slice<VersionedPathReference<Opaque>>(base, base + length);
    }

    return references;
  }
}

class CapturedPositionalArguments implements ICapturedPositionalArguments {
  static empty(): CapturedPositionalArguments {
    return new CapturedPositionalArguments(CONSTANT_TAG, EMPTY_ARRAY, 0);
  }

  constructor(
    public tag: Tag,
    public references: VersionedPathReference<Opaque>[],
    public length = references.length
  ) {}

  at<T extends VersionedPathReference<Opaque>>(position: number): T {
    return this.references[position] as T;
  }

  value(): Opaque[] {
    return this.references.map(this.valueOf);
  }

  get(name: string): VersionedPathReference<Opaque> {
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

  private valueOf(this: void, reference: VersionedPathReference<Opaque>): Opaque {
    return reference.value();
  }
}

export class NamedArguments implements INamedArguments {
  public base = 0;
  public length = 0;

  private stack: EvaluationStack;

  private _tag: Option<Tag> = null;
  private _references: Option<VersionedPathReference<Opaque>[]> = null;

  private _names: Option<string[]> = EMPTY_ARRAY;
  private _atNames: Option<string[]> = EMPTY_ARRAY;

  setup(stack: EvaluationStack, base: number, length: number, names: string[], synthetic: boolean) {
    this.stack = stack;
    this.base = base;
    this.length = length;

    if (length === 0) {
      this._tag = CONSTANT_TAG;
      this._references = EMPTY_ARRAY;
      this._names = EMPTY_ARRAY;
      this._atNames = EMPTY_ARRAY;
    } else {
      this._tag = null;
      this._references = null;

      if (synthetic) {
        this._names = names;
        this._atNames = null;
      } else {
        this._names = null;
        this._atNames = names;
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

  get<T extends VersionedPathReference<Opaque>>(name: string, synthetic = true): T {
    let { base, stack } = this;

    let names = synthetic ? this.names : this.atNames;

    let idx = names.indexOf(name);

    if (idx === -1) {
      return UNDEFINED_REFERENCE as unsafe as T;
    }

    return stack.get<T>(idx, base);
  }

  capture(): ICapturedNamedArguments {
    return new CapturedNamedArguments(this.tag, this.names, this.references);
  }

  merge(other: ICapturedNamedArguments) {
    let { length: extras } = other;

    if (extras > 0) {
      let { names, length, stack } = this;
      let { names: extraNames } = other;

      for (let i = 0; i < extras; i++) {
        let name = extraNames[i];
        let idx = names.indexOf(name);

        if (idx === -1) {
          length = names.push(name);
          stack.push(other.references[i]);
        }
      }

      this.length = length;
      this._tag = null;
      this._references = null;
      this._names = names;
      this._atNames = null;
    }
  }

  private get references(): VersionedPathReference<Opaque>[] {
    let references = this._references;

    if (!references) {
      let { base, length, stack } = this;
      references = this._references = stack.slice<VersionedPathReference<Opaque>>(base, base + length);
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

class CapturedNamedArguments implements ICapturedNamedArguments {
  public length: number;
  private _map: Option<Dict<VersionedPathReference<Opaque>>>;

  constructor(
    public tag: Tag,
    public names: string[],
    public references: VersionedPathReference<Opaque>[]
  ) {
    this.length = names.length;
    this._map = null;
  }

  get map() {
    let map = this._map;

    if (!map) {
      let { names, references } = this;
      map = this._map = dict<VersionedPathReference<Opaque>>();

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

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    let { names, references } = this;
    let idx = names.indexOf(name);

    if (idx === -1) {
      return UNDEFINED_REFERENCE as unsafe as T;
    } else {
      return references[idx] as T;
    }
  }

  value(): Dict<Opaque> {
    let { names, references } = this;
    let out = dict<Opaque>();

    for (let i = 0; i < names.length; i++) {
      let name = names[i];
      out[name] = references[i].value();
    }

    return out;
  }
}

export class BlockArguments implements IBlockArguments {
  private stack: EvaluationStack;
  private internalValues: Option<VMHandle[]> = null;

  public internalTag: Option<Tag> = null;
  public names: string[] = EMPTY_ARRAY;

  public length = 0;
  public base = 0;

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

  get values(): (SymbolTable | VMHandle)[] {
    let values = this.internalValues;

    if (!values) {
      let { base, length, stack } = this;
      values = this.internalValues = stack.slice<VMHandle>(base, base + length * 3);
    }

    return values;
  }

  has(name: string): boolean {
    return this.names!.indexOf(name) !== -1;
  }

  get(name: string): Option<ScopeBlock> {
    let { base, stack, names } = this;

    let idx = names!.indexOf(name);

    if (names!.indexOf(name) === -1) {
      return null;
    }

    let table = check(stack.get(idx * 3, base), CheckOption(CheckBlockSymbolTable));
    let scope = check(stack.get(idx * 3 + 1, base), CheckOption(CheckScope)) as Option<Scope>; // FIXME(mmun): shouldn't need to cast this
    let handle = check(stack.get(idx * 3 + 2, base), CheckOption(CheckOr(CheckHandle, CheckCompilableBlock)));

    return handle === null ? null : [handle, scope!, table!];
  }

  capture(): ICapturedBlockArguments {
    return new CapturedBlockArguments(this.names, this.values);
  }

}

class CapturedBlockArguments implements ICapturedBlockArguments {
  public length: number;

  constructor(
    public names: string[],
    public values: (SymbolTable | Scope | VMHandle)[]
  ) {
    this.length = names.length;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get(name: string): Option<ScopeBlock> {
    let idx = this.names.indexOf(name);

    if (idx === -1) return null;

    return [
      this.values[idx * 3 + 2] as VMHandle,
      this.values[idx * 3 + 1] as Scope,
      this.values[idx * 3] as BlockSymbolTable
    ];
  }
}

const EMPTY_NAMED = new CapturedNamedArguments(CONSTANT_TAG, EMPTY_ARRAY, EMPTY_ARRAY);
const EMPTY_POSITIONAL = new CapturedPositionalArguments(CONSTANT_TAG, EMPTY_ARRAY);
export const EMPTY_ARGS: ICapturedArguments = { tag: CONSTANT_TAG, length: 0, positional: EMPTY_POSITIONAL, named: EMPTY_NAMED };
