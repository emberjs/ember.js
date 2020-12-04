import { DEBUG } from '@glimmer/env';
import {
  Environment,
  EnvironmentOptions,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Transaction,
  TransactionSymbol,
  RuntimeContext,
  RuntimeResolver,
  Option,
  RuntimeArtifacts,
  Owner,
  ComponentInstanceWithCreate,
  ModifierInstance,
  InternalModifierManager,
  ModifierInstanceState,
} from '@glimmer/interfaces';
import { assert, expect, symbol } from '@glimmer/util';
import { track, updateTag } from '@glimmer/validator';
import { DOMChangesImpl, DOMTreeConstruction } from './dom/helper';
import { RuntimeProgramImpl } from '@glimmer/program';
import DebugRenderTree from './debug-render-tree';

export const TRANSACTION: TransactionSymbol = symbol('TRANSACTION');

class TransactionImpl implements Transaction {
  public scheduledInstallModifiers: ModifierInstance[] = [];
  public scheduledUpdateModifiers: ModifierInstance[] = [];
  public createdComponents: ComponentInstanceWithCreate[] = [];
  public updatedComponents: ComponentInstanceWithCreate[] = [];

  didCreate(component: ComponentInstanceWithCreate) {
    this.createdComponents.push(component);
  }

  didUpdate(component: ComponentInstanceWithCreate) {
    this.updatedComponents.push(component);
  }

  scheduleInstallModifier(modifier: ModifierInstance) {
    this.scheduledInstallModifiers.push(modifier);
  }

  scheduleUpdateModifier(modifier: ModifierInstance) {
    this.scheduledUpdateModifiers.push(modifier);
  }

  commit() {
    let { createdComponents, updatedComponents } = this;

    for (let i = 0; i < createdComponents.length; i++) {
      let { manager, state } = createdComponents[i];
      manager.didCreate(state);
    }

    for (let i = 0; i < updatedComponents.length; i++) {
      let { manager, state } = updatedComponents[i];
      manager.didUpdate(state);
    }

    let { scheduledInstallModifiers, scheduledUpdateModifiers } = this;

    // Prevent a transpilation issue we guard against in Ember, the
    // throw-if-closure-required issue
    let manager: InternalModifierManager, state: ModifierInstanceState;

    for (let i = 0; i < scheduledInstallModifiers.length; i++) {
      let modifier = scheduledInstallModifiers[i];
      manager = modifier.manager;
      state = modifier.state;

      let modifierTag = manager.getTag(state);

      if (modifierTag !== null) {
        let tag = track(
          // eslint-disable-next-line no-loop-func
          () => manager.install(state),
          DEBUG &&
            `- While rendering:\n  (instance of a \`${
              modifier.definition.resolvedName || manager.getDebugName(modifier.definition.state)
            }\` modifier)`
        );
        updateTag(modifierTag, tag);
      } else {
        manager.install(state);
      }
    }

    for (let i = 0; i < scheduledUpdateModifiers.length; i++) {
      let modifier = scheduledUpdateModifiers[i];
      manager = modifier.manager;
      state = modifier.state;

      let modifierTag = manager.getTag(state);

      if (modifierTag !== null) {
        let tag = track(
          // eslint-disable-next-line no-loop-func
          () => manager.update(state),
          DEBUG &&
            `- While rendering:\n  (instance of a \`${
              modifier.definition.resolvedName || manager.getDebugName(modifier.definition.state)
            }\` modifier)`
        );
        updateTag(modifierTag, tag);
      } else {
        manager.update(state);
      }
    }
  }
}

export class EnvironmentImpl implements Environment {
  [TRANSACTION]: Option<TransactionImpl> = null;

  protected appendOperations!: GlimmerTreeConstruction;
  protected updateOperations?: GlimmerTreeChanges;

  // Delegate methods and values
  public isInteractive = this.delegate.isInteractive;
  public owner = this.delegate.owner;

  debugRenderTree = this.delegate.enableDebugTooling ? new DebugRenderTree() : undefined;

  constructor(options: EnvironmentOptions, private delegate: EnvironmentDelegate) {
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
    return expect(this[TRANSACTION]!, 'must be in a transaction');
  }

  didCreate(component: ComponentInstanceWithCreate) {
    this.transaction.didCreate(component);
  }

  didUpdate(component: ComponentInstanceWithCreate) {
    this.transaction.didUpdate(component);
  }

  scheduleInstallModifier(modifier: ModifierInstance) {
    if (this.isInteractive) {
      this.transaction.scheduleInstallModifier(modifier);
    }
  }

  scheduleUpdateModifier(modifier: ModifierInstance) {
    if (this.isInteractive) {
      this.transaction.scheduleUpdateModifier(modifier);
    }
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
   * Owner passed into the environment
   *
   * TODO: This should likely use the templating system owner instead
   */
  owner: Owner;

  /**
   * Callback to be called when an environment transaction commits
   */
  onTransactionCommit: () => void;
}

export function runtimeContext(
  options: EnvironmentOptions,
  delegate: EnvironmentDelegate,
  artifacts: RuntimeArtifacts,
  resolver: RuntimeResolver
): RuntimeContext {
  return {
    env: new EnvironmentImpl(options, delegate),
    program: new RuntimeProgramImpl(artifacts.constants, artifacts.heap),
    resolver: resolver,
  };
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

export default EnvironmentImpl;
