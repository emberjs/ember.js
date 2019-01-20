import {
  Dict,
  Drop,
  Environment,
  EnvironmentOptions,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  JitOrAotBlock,
  PartialScope,
  Scope,
  ScopeBlock,
  ScopeSlot,
  Transaction,
  TransactionSymbol,
  CompilerArtifacts,
  TemplateMeta,
  WithCreateInstance,
  ResolvedValue,
  RuntimeResolverOptions,
  RuntimeProgram,
  ModifierManager,
  Template,
  RuntimeResolver,
  Invocation,
  JitRuntimeContext,
  AotRuntimeContext,
} from '@glimmer/interfaces';
import {
  IterableImpl,
  IterableKeyDefinitions,
  OpaqueIterable,
  PathReference,
  Reference,
  VersionedPathReference,
  VersionedReference,
} from '@glimmer/reference';
import { assert, DROP, expect, Option } from '@glimmer/util';
import { AttrNamespace, SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { DOMChangesImpl, DOMTreeConstruction } from './dom/helper';
import { ConditionalReference, UNDEFINED_REFERENCE } from './references';
import { DynamicAttribute, dynamicAttribute } from './vm/attributes/dynamic';
import { RuntimeProgramImpl } from '@glimmer/program';

export function isScopeReference(s: ScopeSlot): s is VersionedPathReference {
  if (s === null || Array.isArray(s)) return false;
  return true;
}

export class ScopeImpl<C extends JitOrAotBlock> implements PartialScope<C> {
  static root<C extends JitOrAotBlock>(self: PathReference<unknown>, size = 0): PartialScope<C> {
    let refs: PathReference<unknown>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new ScopeImpl<C>(refs, null, null, null).init({ self });
  }

  static sized<C extends JitOrAotBlock>(size = 0): Scope<C> {
    let refs: PathReference<unknown>[] = new Array(size + 1);

    for (let i = 0; i <= size; i++) {
      refs[i] = UNDEFINED_REFERENCE;
    }

    return new ScopeImpl(refs, null, null, null);
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
    return new ScopeImpl(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
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

export const TRANSACTION: TransactionSymbol = 'TRANSACTION [c3938885-aba0-422f-b540-3fd3431c78b5]';

class TransactionImpl implements Transaction {
  readonly [TRANSACTION]: Option<TransactionImpl>;

  public scheduledInstallManagers: ModifierManager[] = [];
  public scheduledInstallModifiers: unknown[] = [];
  public scheduledUpdateModifierManagers: ModifierManager[] = [];
  public scheduledUpdateModifiers: unknown[] = [];
  public createdComponents: unknown[] = [];
  public createdManagers: WithCreateInstance<unknown>[] = [];
  public updatedComponents: unknown[] = [];
  public updatedManagers: WithCreateInstance<unknown>[] = [];
  public destructors: Drop[] = [];

  didCreate(component: unknown, manager: WithCreateInstance) {
    this.createdComponents.push(component);
    this.createdManagers.push(manager);
  }

  didUpdate(component: unknown, manager: WithCreateInstance) {
    this.updatedComponents.push(component);
    this.updatedManagers.push(manager);
  }

  scheduleInstallModifier(modifier: unknown, manager: ModifierManager) {
    this.scheduledInstallManagers.push(manager);
    this.scheduledInstallModifiers.push(modifier);
  }

  scheduleUpdateModifier(modifier: unknown, manager: ModifierManager) {
    this.scheduledUpdateModifierManagers.push(manager);
    this.scheduledUpdateModifiers.push(modifier);
  }

  didDestroy(d: Drop) {
    this.destructors.push(d);
  }

  commit() {
    let { createdComponents, createdManagers } = this;

    for (let i = 0; i < createdComponents.length; i++) {
      let component = createdComponents[i];
      let manager = createdManagers[i];
      manager.didCreate(component);
    }

    let { updatedComponents, updatedManagers } = this;

    for (let i = 0; i < updatedComponents.length; i++) {
      let component = updatedComponents[i];
      let manager = updatedManagers[i];
      manager.didUpdate(component);
    }

    let { destructors } = this;

    for (let i = 0; i < destructors.length; i++) {
      destructors[i][DROP]();
    }

    let { scheduledInstallManagers, scheduledInstallModifiers } = this;

    for (let i = 0; i < scheduledInstallManagers.length; i++) {
      let manager = scheduledInstallManagers[i];
      let modifier = scheduledInstallModifiers[i];
      manager.install(modifier);
    }

    let { scheduledUpdateModifierManagers, scheduledUpdateModifiers } = this;

    for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
      let manager = scheduledUpdateModifierManagers[i];
      let modifier = scheduledUpdateModifiers[i];
      manager.update(modifier);
    }
  }
}

export type ToBool = (value: unknown) => boolean;

function toBool(value: unknown): boolean {
  return !!value;
}

export abstract class EnvironmentImpl implements Environment {
  [TRANSACTION]: Option<TransactionImpl> = null;

  protected updateOperations: GlimmerTreeChanges;
  protected appendOperations: GlimmerTreeConstruction;

  constructor({ appendOperations, updateOperations }: EnvironmentOptions) {
    this.appendOperations = appendOperations;
    this.updateOperations = updateOperations;
  }

  toConditionalReference(reference: Reference): Reference<boolean> {
    return new ConditionalReference(reference, toBool);
  }

  abstract iterableFor(reference: Reference, key: unknown): OpaqueIterable;
  abstract protocolForURL(s: string): string;

  getAppendOperations(): GlimmerTreeConstruction {
    return this.appendOperations;
  }
  getDOM(): GlimmerTreeChanges {
    return this.updateOperations;
  }

  begin() {
    assert(
      !this[TRANSACTION],
      'A glimmer transaction was begun, but one already exists. You may have a nested transaction, possibly caused by an earlier runtime exception while rendering. Please check your console for the stack trace of any prior exceptions.'
    );

    this[TRANSACTION] = new TransactionImpl();
  }

  private get transaction(): TransactionImpl {
    return expect(this[TRANSACTION]!, 'must be in a transaction');
  }

  didCreate(component: unknown, manager: WithCreateInstance) {
    this.transaction.didCreate(component, manager);
  }

  didUpdate(component: unknown, manager: WithCreateInstance) {
    this.transaction.didUpdate(component, manager);
  }

  scheduleInstallModifier(modifier: unknown, manager: ModifierManager) {
    this.transaction.scheduleInstallModifier(modifier, manager);
  }

  scheduleUpdateModifier(modifier: unknown, manager: ModifierManager) {
    this.transaction.scheduleUpdateModifier(modifier, manager);
  }

  didDestroy(d: Drop) {
    this.transaction.didDestroy(d);
  }

  commit() {
    let transaction = this.transaction;
    this[TRANSACTION] = null;
    transaction.commit();
  }

  attributeFor(
    element: SimpleElement,
    attr: string,
    _isTrusting: boolean,
    namespace: Option<AttrNamespace> = null
  ): DynamicAttribute {
    return dynamicAttribute(element, attr, namespace);
  }
}

export interface RuntimeEnvironmentDelegate {
  protocolForURL?(url: string): string;
  iterable?: IterableKeyDefinitions;
  toBool?(value: unknown): boolean;
  attributeFor?(
    element: SimpleElement,
    attr: string,
    isTrusting: boolean,
    namespace: Option<AttrNamespace>
  ): DynamicAttribute;
}

export class RuntimeEnvironmentDelegateImpl implements RuntimeEnvironmentDelegate {
  readonly toBool: (value: unknown) => boolean;

  constructor(private inner: RuntimeEnvironmentDelegate = {}) {
    if (inner.toBool) {
      this.toBool = inner.toBool;
    } else {
      this.toBool = value => !!value;
    }
  }

  protocolForURL(url: string): string {
    if (this.inner.protocolForURL) {
      return this.inner.protocolForURL(url);
    } else if (typeof URL === 'object' || typeof URL === 'undefined') {
      return legacyProtocolForURL(url);
    } else if (typeof document !== 'undefined') {
      return new URL(url, document.baseURI).protocol;
    } else {
      return new URL(url, 'https://www.example.com').protocol;
    }
  }

  attributeFor(
    element: SimpleElement,
    attr: string,
    isTrusting: boolean,
    namespace: Option<AttrNamespace>
  ): DynamicAttribute {
    if (this.inner.attributeFor) {
      return this.inner.attributeFor(element, attr, isTrusting, namespace);
    } else {
      return dynamicAttribute(element, attr, namespace);
    }
  }

  readonly iterable: IterableKeyDefinitions = {
    named: {
      '@index': (_, index) => String(index),
      '@primitive': item => String(item),
      '@identity': item => item,
    },
    default: key => item => item[key],
  };
}

function legacyProtocolForURL(url: string): string {
  if (typeof window === 'undefined') {
    let match = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i.exec(url);
    return match && match[1] ? match[1].toLowerCase() : '';
  }

  let anchor = window.document.createElement('a');
  anchor.href = url;
  return anchor.protocol;
}

export class DefaultRuntimeResolver<R extends TemplateMeta<{ module: string }>>
  implements RuntimeResolver<R> {
  constructor(private inner: RuntimeResolverOptions) {}

  lookupComponent(name: string, referrer?: Option<TemplateMeta>): Option<any> {
    if (this.inner.lookupComponent) {
      let component = this.inner.lookupComponent(name, referrer);

      if (component === undefined) {
        throw new Error(
          `Unexpected component ${name} (from ${referrer}) (lookupComponent returned undefined)`
        );
      }

      return component;
    } else {
      throw new Error('lookupComponent not implemented on RuntimeResolver.');
    }
  }

  lookupPartial(name: string, referrer?: Option<TemplateMeta>): Option<number> {
    if (this.inner.lookupPartial) {
      let partial = this.inner.lookupPartial(name, referrer);

      if (partial === undefined) {
        throw new Error(
          `Unexpected partial ${name} (from ${referrer}) (lookupPartial returned undefined)`
        );
      }

      return partial;
    } else {
      throw new Error('lookupPartial not implemented on RuntimeResolver.');
    }
  }

  resolve<U extends ResolvedValue>(handle: number): U {
    if (this.inner.resolve) {
      let resolved = this.inner.resolve(handle);

      if (resolved === undefined) {
        throw new Error(`Unexpected handle ${handle} (resolve returned undefined)`);
      }

      return resolved as U;
    } else {
      throw new Error('resolve not implemented on RuntimeResolver.');
    }
  }

  compilable(locator: TemplateMeta<{ module: string }>): Template {
    if (this.inner.compilable) {
      let resolved = this.inner.compilable(locator);

      if (resolved === undefined) {
        throw new Error(`Unable to compile ${name} (compilable returned undefined)`);
      }

      return resolved;
    } else {
      throw new Error('compilable not implemented on RuntimeResolver.');
    }
  }

  getInvocation(locator: TemplateMeta<R>): Invocation {
    if (this.inner.getInvocation) {
      let invocation = this.inner.getInvocation(locator);

      if (invocation === undefined) {
        throw new Error(
          `Unable to get invocation for ${JSON.stringify(
            locator
          )} (getInvocation returned undefined)`
        );
      }

      return invocation;
    } else {
      throw new Error('getInvocation not implemented on RuntimeResolver.');
    }
  }
}

export function AotRuntime(
  document: SimpleDocument,
  program: CompilerArtifacts,
  resolver: RuntimeResolverOptions = {},
  delegate: RuntimeEnvironmentDelegate = {}
): AotRuntimeContext {
  let env = new RuntimeEnvironment(document, new RuntimeEnvironmentDelegateImpl(delegate));

  return {
    env,
    resolver: new DefaultRuntimeResolver(resolver),
    program: RuntimeProgramImpl.hydrate(program),
  };
}

export function JitRuntime(
  document: SimpleDocument,
  program: RuntimeProgram,
  resolver: RuntimeResolverOptions = {},
  delegate: RuntimeEnvironmentDelegate = {}
): JitRuntimeContext {
  let env = new RuntimeEnvironment(document, new RuntimeEnvironmentDelegateImpl(delegate));

  return {
    env,
    resolver: new DefaultRuntimeResolver(resolver),
    program,
  };
}

export class RuntimeEnvironment extends EnvironmentImpl {
  private delegate: RuntimeEnvironmentDelegateImpl;

  constructor(document: SimpleDocument, delegate: RuntimeEnvironmentDelegateImpl) {
    super({
      appendOperations: new DOMTreeConstruction(document),
      updateOperations: new DOMChangesImpl(document),
    });

    this.delegate = new RuntimeEnvironmentDelegateImpl(delegate);
  }

  protocolForURL(url: string): string {
    return this.delegate.protocolForURL(url);
  }

  iterableFor(ref: Reference, inputKey: unknown): OpaqueIterable {
    let key = String(inputKey);
    let def = this.delegate.iterable;

    let keyFor = key in def.named ? def.named[key] : def.default(key);

    return new IterableImpl(ref, keyFor);
  }

  toConditionalReference(input: VersionedPathReference): VersionedReference<boolean> {
    return new ConditionalReference(input, this.delegate.toBool);
  }

  attributeFor(
    element: SimpleElement,
    attr: string,
    isTrusting: boolean,
    namespace: Option<AttrNamespace>
  ): DynamicAttribute {
    return this.delegate.attributeFor(element, attr, isTrusting, namespace);
  }
}

export function inTransaction(env: Environment, cb: () => void): void {
  if (!env[TRANSACTION]) {
    env.begin();
    try {
      cb();
    } finally {
      env.commit();
    }
  } else {
    cb();
  }
}

export abstract class DefaultEnvironment extends EnvironmentImpl {
  constructor(options?: EnvironmentOptions) {
    if (!options) {
      let document = window.document as SimpleDocument;
      let appendOperations = new DOMTreeConstruction(document);
      let updateOperations = new DOMChangesImpl(document);
      options = { appendOperations, updateOperations };
    }

    super(options);
  }
}

export default EnvironmentImpl;
