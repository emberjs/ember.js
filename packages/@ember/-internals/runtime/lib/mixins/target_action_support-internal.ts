/**
@module ember
*/

import { context } from '@ember/-internals/environment/lib/context';
import { get } from '@ember/-internals/metal/lib/property_get';
import computed from '@ember/-internals/metal/lib/computed';
import { InternalMixin } from '@ember/object/mixin-internal';
import { assert } from '@ember/debug';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import { DEBUG } from '@glimmer/env';

/**
  The internal counterpart to the public `TargetActionSupport` mixin. Ember's
  own internals apply this so that they do not trigger the deprecation that
  the public mixin emits. The public API documentation lives on the public
  copy.

  @internal
*/
const InternalTargetActionSupport = InternalMixin.create({
  target: null,
  action: null,
  actionContext: null,

  actionContextObject: computed('actionContext', function () {
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
  }),

  triggerAction(opts: { action?: string; target?: unknown; actionContext?: unknown } = {}) {
    deprecateUntil(
      `Calling \`triggerAction\` on ${this} is deprecated. Invoke the target method directly.`,
      DEPRECATIONS.DEPRECATE_TARGET_ACTION_SUPPORT
    );

    let { action, target, actionContext } = opts;
    action = action || get(this, 'action');
    target = target || getTarget(this);

    if (actionContext === undefined) {
      actionContext = get(this, 'actionContextObject') || this;
    }

    let context = Array.isArray(actionContext) ? actionContext : [actionContext];

    if (target && action) {
      let ret;

      if (isSendable(target)) {
        ret = target.send(action, ...context);
      } else {
        assert(
          `The action '${action}' did not exist on ${target}`,
          typeof (target as any)[action] === 'function'
        );
        ret = (target as any)[action](...context);
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

function getTarget(instance: { _target?: unknown }) {
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
  Object.seal(InternalTargetActionSupport);
}

export default InternalTargetActionSupport;
