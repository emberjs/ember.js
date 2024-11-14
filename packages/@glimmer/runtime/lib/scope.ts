import type {
  Dict,
  DynamicScope,
  Nullable,
  Owner,
  Scope,
  ScopeBlock,
  ScopeSlot,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { unwrap } from '@glimmer/debug-util';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { assign } from '@glimmer/util';

export class DynamicScopeImpl implements DynamicScope {
  private bucket: Dict<Reference>;

  constructor(bucket?: Dict<Reference>) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): Reference {
    return unwrap(this.bucket[key]);
  }

  set(key: string, reference: Reference): Reference {
    return (this.bucket[key] = reference);
  }

  child(): DynamicScopeImpl {
    return new DynamicScopeImpl(this.bucket);
  }
}

export function isScopeReference(s: ScopeSlot): s is Reference {
  if (s === null || Array.isArray(s)) return false;
  return true;
}

export class ScopeImpl implements Scope {
  static root(self: Reference<unknown>, size = 0, owner: Owner): Scope {
    let refs: Reference<unknown>[] = new Array(size + 1).fill(UNDEFINED_REFERENCE);

    return new ScopeImpl(refs, owner, null, null).init({ self });
  }

  static sized(size = 0, owner: Owner): Scope {
    let refs: Reference<unknown>[] = new Array(size + 1).fill(UNDEFINED_REFERENCE);

    return new ScopeImpl(refs, owner, null, null);
  }

  constructor(
    // the 0th slot is `self`
    readonly slots: Array<ScopeSlot>,
    readonly owner: Owner,
    private callerScope: Scope | null,
    // named arguments and blocks passed to a layout that uses debugger
    private debuggerScope: Dict<ScopeSlot> | null
  ) {}

  init({ self }: { self: Reference<unknown> }): this {
    this.slots[0] = self;
    return this;
  }

  getSelf(): Reference<unknown> {
    return this.get<Reference<unknown>>(0);
  }

  getSymbol(symbol: number): Reference<unknown> {
    return this.get<Reference<unknown>>(symbol);
  }

  getBlock(symbol: number): Nullable<ScopeBlock> {
    let block = this.get(symbol);
    return block === UNDEFINED_REFERENCE ? null : (block as ScopeBlock);
  }

  getDebuggerScope(): Nullable<Dict<ScopeSlot>> {
    return this.debuggerScope;
  }

  bind(symbol: number, value: ScopeSlot) {
    this.set(symbol, value);
  }

  bindSelf(self: Reference<unknown>) {
    this.set<Reference<unknown>>(0, self);
  }

  bindSymbol(symbol: number, value: Reference<unknown>) {
    this.set(symbol, value);
  }

  bindBlock(symbol: number, value: Nullable<ScopeBlock>) {
    this.set<Nullable<ScopeBlock>>(symbol, value);
  }

  bindDebuggerScope(map: Nullable<Dict<ScopeSlot>>) {
    this.debuggerScope = map;
  }

  bindCallerScope(scope: Nullable<Scope>): void {
    this.callerScope = scope;
  }

  getCallerScope(): Nullable<Scope> {
    return this.callerScope;
  }

  child(): Scope {
    return new ScopeImpl(this.slots.slice(), this.owner, this.callerScope, this.debuggerScope);
  }

  private get<T extends ScopeSlot>(index: number): T {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    return this.slots[index] as T;
  }

  private set<T extends ScopeSlot>(index: number, value: T): void {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    this.slots[index] = value;
  }
}
