import { EvaluationStack } from './append';
import { dict, EMPTY_ARRAY } from '@glimmer/util';
import { combineTagged } from '@glimmer/reference';
import { Dict, Opaque, Option, unsafe, Recast } from '@glimmer/interfaces';
import { Tag, VersionedPathReference, CONSTANT_TAG } from '@glimmer/reference';
import { PrimitiveReference, UNDEFINED_REFERENCE } from '../references';

/*
  The calling convention is:

  * 0-N positional arguments at the bottom (left-to-right)
  * 0-N named arguments next
*/

export interface IArguments {
  tag: Tag;
  length: number;
  positional: IPositionalArguments;
  named: INamedArguments;

  at<T extends VersionedPathReference<Opaque>>(pos: number): T;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
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

  empty() {
    // because the size is 0, there is definitely no need to look at the
    // evaluation stack.
    this.setup(null as Recast<null, EvaluationStack>, EMPTY_ARRAY, 0, true);
    return this;
  }

  setup(stack: EvaluationStack, names: string[], positionalCount: number, synthetic: boolean) {
    this.stack = stack;

    /*
           | ... | positional  | named |
           | ... | p0 p1 p2 p3 | n0 n1 |
     index | ... | 4  5  6  7  | 8  9  |
                   ^             ^  ^
                 pbase       nbase  sp
    */

    let named = this.named as NamedArguments;
    let namedCount = names.length;
    let namedBase  = stack.sp - namedCount + 1;

    named.setup(stack, namedBase, namedCount, names, synthetic);

    let positional = this.positional as PositionalArguments;
    let positionalBase = namedBase - positionalCount;

    positional.setup(stack, positionalBase, positionalCount);
  }

  get tag(): Tag {
    return combineTagged([this.positional, this.named]);
  }

  get base(): number {
    return this.positional.base;
  }

  get length(): number {
    return this.positional.length + this.named.length;
  }

  at<T extends VersionedPathReference<Opaque>>(pos: number): T {
    return this.positional.at<T>(pos);
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    return this.named.get<T>(name);
  }

  realloc(offset: number) {
    if (offset > 0) {
      let { positional, named, stack, base, length } = this;
      let newBase = base + offset;

      for(let i=length-1; i>=0; i--) {
        stack.set(stack.get(i, base), i, newBase);
      }

      positional.base = newBase;
      named.base += offset;
      stack.sp += offset;
    }
  }

  capture(): ICapturedArguments {
    return {
      tag: this.tag,
      length: this.length,
      positional: this.positional.capture(),
      named: this.named.capture()
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

    return stack.get<T>(position, base);
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
  static empty(): CapturedNamedArguments {
    return new CapturedNamedArguments(CONSTANT_TAG, EMPTY_ARRAY, EMPTY_ARRAY);
  }

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

const EMPTY_NAMED = new CapturedNamedArguments(CONSTANT_TAG, EMPTY_ARRAY, EMPTY_ARRAY);
const EMPTY_POSITIONAL = new CapturedPositionalArguments(CONSTANT_TAG, EMPTY_ARRAY);
export const EMPTY_ARGS: ICapturedArguments = { tag: CONSTANT_TAG, length: 0, positional: EMPTY_POSITIONAL, named: EMPTY_NAMED };