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

export interface ScopeOptions {
  /** @default {UNDEFINED_REFERENCE} */
  self: Reference;
  /** @default {0} */
  size?: number | undefined;
}

export class ScopeImpl implements Scope {
  static root(owner: Owner, { self, size = 0 }: ScopeOptions): Scope {
    let refs = new Array<Reference>(size + 1).fill(UNDEFINED_REFERENCE);

    return new ScopeImpl(owner, refs, null).init({ self });
  }

  static sized(owner: Owner, size = 0): Scope {
    let refs = new Array<Reference>(size + 1).fill(UNDEFINED_REFERENCE);

    return new ScopeImpl(owner, refs, null);
  }

  readonly owner: Owner;

  private slots: ScopeSlot[];
  private callerScope: Nullable<Scope>;

  constructor(
    owner: Owner,
    // the 0th slot is `self`
    slots: Array<ScopeSlot>,
    // a single program can mix owners via curried components, and the state lives on root scopes
    callerScope: Nullable<Scope>
  ) {
    this.owner = owner;
    this.slots = slots;
    this.callerScope = callerScope;
  }

  init({ self }: { self: Reference }): this {
    this.slots[0] = self;
    return this;
  }

  /**
   * @debug
   */
  snapshot(): ScopeSlot[] {
    return this.slots.slice();
  }

  getSelf(): Reference {
    return this.get<Reference>(0);
  }

  getSymbol(symbol: number): Reference {
    return this.get<Reference>(symbol);
  }

  getBlock(symbol: number): Nullable<ScopeBlock> {
    let block = this.get(symbol);
    return block === UNDEFINED_REFERENCE ? null : (block as ScopeBlock);
  }

  bind(symbol: number, value: ScopeSlot) {
    this.set(symbol, value);
  }

  bindSelf(self: Reference) {
    this.set<Reference>(0, self);
  }

  bindSymbol(symbol: number, value: Reference) {
    this.set(symbol, value);
  }

  bindBlock(symbol: number, value: Nullable<ScopeBlock>) {
    this.set<Nullable<ScopeBlock>>(symbol, value);
  }

  bindCallerScope(scope: Nullable<Scope>): void {
    this.callerScope = scope;
  }

  getCallerScope(): Nullable<Scope> {
    return this.callerScope;
  }

  child(): Scope {
    return new ScopeImpl(this.owner, this.slots.slice(), this.callerScope);
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
