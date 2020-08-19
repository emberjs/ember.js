import {
  DynamicScope,
  Dict,
  PartialScope,
  JitOrAotBlock,
  ScopeSlot,
  ScopeBlock,
  Option,
  Scope,
} from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { PathReference } from '@glimmer/reference';
import { UNDEFINED_REFERENCE } from './references';

export class DynamicScopeImpl implements DynamicScope {
  private bucket: Dict<PathReference>;

  constructor(bucket?: Dict<PathReference>) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): PathReference {
    return this.bucket[key];
  }

  set(key: string, reference: PathReference): PathReference {
    return (this.bucket[key] = reference);
  }

  child(): DynamicScopeImpl {
    return new DynamicScopeImpl(this.bucket);
  }
}

export function isScopeReference(s: ScopeSlot): s is PathReference {
  if (s === null || Array.isArray(s)) return false;
  return true;
}

export class PartialScopeImpl<C extends JitOrAotBlock> implements PartialScope<C> {
  static root<C extends JitOrAotBlock>(self: PathReference<unknown>, size = 0): PartialScope<C> {
    let refs: PathReference<unknown>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new PartialScopeImpl<C>(refs, null, null, null).init({ self });
  }

  static sized<C extends JitOrAotBlock>(size = 0): Scope<C> {
    let refs: PathReference<unknown>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new PartialScopeImpl(refs, null, null, null);
  }

  constructor(
    // the 0th slot is `self`
    readonly slots: Array<ScopeSlot<C>>,
    private callerScope: Option<Scope<C>>,
    // named arguments and blocks passed to a layout that uses eval
    private evalScope: Option<Dict<ScopeSlot<C>>>,
    // locals in scope when the partial was invoked
    private partialMap: Option<Dict<PathReference<unknown>>>
  ) {}

  init({ self }: { self: PathReference<unknown> }): this {
    this.slots[0] = self;
    return this;
  }

  getSelf(): PathReference<unknown> {
    return this.get<PathReference<unknown>>(0);
  }

  getSymbol(symbol: number): PathReference<unknown> {
    return this.get<PathReference<unknown>>(symbol);
  }

  getBlock(symbol: number): Option<ScopeBlock<C>> {
    let block = this.get(symbol);
    return block === UNDEFINED_REFERENCE ? null : (block as ScopeBlock<C>);
  }

  getEvalScope(): Option<Dict<ScopeSlot<C>>> {
    return this.evalScope;
  }

  getPartialMap(): Option<Dict<PathReference<unknown>>> {
    return this.partialMap;
  }

  bind(symbol: number, value: ScopeSlot<C>) {
    this.set(symbol, value);
  }

  bindSelf(self: PathReference<unknown>) {
    this.set<PathReference<unknown>>(0, self);
  }

  bindSymbol(symbol: number, value: PathReference<unknown>) {
    this.set(symbol, value);
  }

  bindBlock(symbol: number, value: Option<ScopeBlock<C>>) {
    this.set<Option<ScopeBlock<C>>>(symbol, value);
  }

  bindEvalScope(map: Option<Dict<ScopeSlot<C>>>) {
    this.evalScope = map;
  }

  bindPartialMap(map: Dict<PathReference<unknown>>) {
    this.partialMap = map;
  }

  bindCallerScope(scope: Option<Scope<C>>): void {
    this.callerScope = scope;
  }

  getCallerScope(): Option<Scope<C>> {
    return this.callerScope;
  }

  child(): Scope<C> {
    return new PartialScopeImpl(
      this.slots.slice(),
      this.callerScope,
      this.evalScope,
      this.partialMap
    );
  }

  private get<T extends ScopeSlot<C>>(index: number): T {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    return this.slots[index] as T;
  }

  private set<T extends ScopeSlot<C>>(index: number, value: T): void {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }

    this.slots[index] = value;
  }
}
