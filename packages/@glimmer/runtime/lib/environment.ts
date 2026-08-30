import { DEBUG } from '@glimmer/env';
import type {
  ClassicResolver,
  CommitHook,
  ComponentInstanceWithCreate,
  DebugRenderTree,
  Environment,
  EnvironmentOptions,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Nullable,
  RuntimeArtifacts,
  RuntimeOptions,
  Transaction,
  TransactionSymbol,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';
import { ProgramImpl } from '@glimmer/program/lib/program';

import { DOMChangesImpl, DOMTreeConstruction } from './dom/helper';
import { isArgumentError } from './vm/arguments';

export const TRANSACTION: TransactionSymbol = Symbol('TRANSACTION') as TransactionSymbol;

class TransactionImpl implements Transaction {
  public createdComponents: ComponentInstanceWithCreate[] = [];
  public updatedComponents: ComponentInstanceWithCreate[] = [];
  private hooks: CommitHook<unknown>[] = [];
  private items = new Map<CommitHook<unknown>, unknown[]>();

  didCreate(component: ComponentInstanceWithCreate) {
    this.createdComponents.push(component);
  }

  didUpdate(component: ComponentInstanceWithCreate) {
    this.updatedComponents.push(component);
  }

  schedule<T>(hook: CommitHook<T>, item: T): void {
    let items = this.items.get(hook as CommitHook<unknown>);

    if (items === undefined) {
      items = [];
      this.items.set(hook as CommitHook<unknown>, items);
      this.hooks.push(hook as CommitHook<unknown>);
    }

    items.push(item);
  }

  commit() {
    let { createdComponents, updatedComponents } = this;

    for (const { manager, state } of createdComponents) {
      manager.didCreate(state);
    }

    for (const { manager, state } of updatedComponents) {
      manager.didUpdate(state);
    }

    for (const hook of this.hooks) {
      hook(this.items.get(hook) as unknown[]);
    }
  }
}

export class EnvironmentImpl implements Environment {
  [TRANSACTION]: Nullable<TransactionImpl> = null;

  declare protected appendOperations: GlimmerTreeConstruction;
  protected updateOperations?: GlimmerTreeChanges | undefined;

  // Delegate methods and values
  public isInteractive: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isArgumentCaptureError: ((error: any) => boolean) | undefined;
  debugRenderTree: DebugRenderTree | undefined;

  constructor(
    options: EnvironmentOptions,
    private delegate: EnvironmentDelegate
  ) {
    this.isInteractive = delegate.isInteractive;
    this.debugRenderTree = delegate.debugRenderTree;
    this.isArgumentCaptureError = this.delegate.enableDebugTooling ? isArgumentError : undefined;
    if (options.appendOperations) {
      this.appendOperations = options.appendOperations;
      this.updateOperations = options.updateOperations;
    } else if (options.document) {
      this.appendOperations = new DOMTreeConstruction(options.document);
      this.updateOperations = new DOMChangesImpl(options.document);
    } else if (DEBUG) {
      throw new Error('you must pass document or appendOperations to a new runtime');
    }
  }

  getAppendOperations(): GlimmerTreeConstruction {
    return this.appendOperations;
  }

  getDOM(): GlimmerTreeChanges {
    return expect(
      this.updateOperations,
      'Attempted to get DOM updateOperations, but they were not provided by the environment. You may be attempting to rerender in an environment which does not support rerendering, such as SSR.'
    );
  }

  begin() {
    assert(
      !this[TRANSACTION],
      'A glimmer transaction was begun, but one already exists. You may have a nested transaction, possibly caused by an earlier runtime exception while rendering. Please check your console for the stack trace of any prior exceptions.'
    );

    this.debugRenderTree?.begin();

    this[TRANSACTION] = new TransactionImpl();
  }

  private get transaction(): TransactionImpl {
    return expect(this[TRANSACTION], 'must be in a transaction');
  }

  didCreate(component: ComponentInstanceWithCreate) {
    this.transaction.didCreate(component);
  }

  didUpdate(component: ComponentInstanceWithCreate) {
    this.transaction.didUpdate(component);
  }

  /**
   * Queues work for the end of the current transaction. The hook runs once
   * per transaction with everything queued under it, so the code behind a
   * kind of work (modifier installs, for example) lives with the opcode
   * that queues it instead of here.
   */
  schedule<T>(hook: CommitHook<T>, item: T): void {
    this.transaction.schedule(hook, item);
  }

  commit() {
    let transaction = this.transaction;
    this[TRANSACTION] = null;
    transaction.commit();

    this.debugRenderTree?.commit();

    this.delegate.onTransactionCommit();
  }
}

export interface EnvironmentDelegate {
  /**
   * Used to determine the the environment is interactive (e.g. SSR is not
   * interactive). Interactive environments schedule modifiers, among other things.
   */
  isInteractive: boolean;

  /**
   * Used to enable debug tooling
   */
  enableDebugTooling: boolean;

  /**
   * The render tree for debug tooling, if the host wants one. The host
   * constructs it, so a build that never wants one does not carry the
   * implementation.
   */
  debugRenderTree?: DebugRenderTree | undefined;

  /**
   * Callback to be called when an environment transaction commits
   */
  onTransactionCommit: () => void;
}

export function runtimeOptions(
  options: EnvironmentOptions,
  delegate: EnvironmentDelegate,
  artifacts: RuntimeArtifacts,
  resolver: Nullable<ClassicResolver>
): RuntimeOptions {
  return {
    env: new EnvironmentImpl(options, delegate),
    program: new ProgramImpl(artifacts.constants, artifacts.heap),
    resolver,
  };
}

export function inTransaction(env: Environment, block: () => void): void {
  if (!env[TRANSACTION]) {
    env.begin();
    try {
      block();
    } finally {
      env.commit();
    }
  } else {
    block();
  }
}

export default EnvironmentImpl;
