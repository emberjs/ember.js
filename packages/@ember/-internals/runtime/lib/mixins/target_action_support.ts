/**
@module ember
*/

import { context } from '@ember/-internals/environment';
import { get } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

/**
`Ember.TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the Handlebars
`{{action}}` helper.
*/
interface TargetActionSupport {
  target: unknown;
  action: string | null;
  actionContext: unknown;
  actionContextObject: unknown;
  triggerAction(opts?: object): unknown;

  /** @internal */
  _target?: unknown;
}

const TargetActionSupport = Mixin.create({
  target: null,
  action: null,
  actionContext: null,

  // ✅ MIGRATED: replaced computed('actionContext', fn)
  actionContextObject() {
    let actionContext = get(this, 'actionContext');

    if (typeof actionContext === 'string') {
      let value = get(this, actionContext);
      if (value === undefined) {
        value = get(context.lookup, actionContext);
      }
      return value;
    } else {
      return actionContext;
    }
  },

  /**
    Send an `action` with an `actionContext` to a `target`.
  */
  triggerAction(opts: { action?: string; target?: unknown; actionContext?: unknown } = {}) {
    let { action, target, actionContext } = opts;
    action = action || get(this, 'action');
    target = target || getTarget(this);

    if (actionContext === undefined) {
      actionContext = this.actionContextObject() || this;
    }

    let contextArr = Array.isArray(actionContext) ? actionContext : [actionContext];

    if (target && action) {
      let ret;

      if (isSendable(target)) {
        ret = target.send(action, ...contextArr);
      } else {
        assert(
          `The action '${action}' did not exist on ${target}`,
          typeof (target as any)[action] === 'function'
        );
        ret = (target as any)[action](...contextArr);
      }

      if (ret !== false) {
        return true;
      }
    }

    return false;
  },
});

interface Sendable {
  send(action: string, ...context: unknown[]): unknown;
}

function isSendable(obj: unknown): obj is Sendable {
  return obj != null && typeof obj === 'object' && typeof (obj as Sendable).send === 'function';
}

function getTarget(instance: TargetActionSupport) {
  let target = get(instance, 'target');
  if (target) {
    if (typeof target === 'string') {
      let value = get(instance, target);
      if (value === undefined) {
        value = get(context.lookup, target);
      }

      return value;
    } else {
      return target;
    }
  }

  if (instance._target) {
    return instance._target;
  }

  return null;
}

if (DEBUG) {
  Object.seal(TargetActionSupport);
}

export default TargetActionSupport;
