import { assert } from '@ember/debug';
import type {
  ElementDescriptor,
  ExtendedMethodDecorator,
} from '@ember/-internals/metal/lib/decorator';
import { isElementDescriptor, setClassicDecorator } from '@ember/-internals/metal/lib/decorator';

const BINDINGS_MAP = new WeakMap();

interface HasProto {
  constructor: {
    proto(): void;
  };
}

function hasProto(obj: unknown): obj is HasProto {
  return (
    obj != null &&
    (obj as any).constructor !== undefined &&
    typeof ((obj as any).constructor as any).proto === 'function'
  );
}

interface HasActions {
  actions: Record<string | symbol, unknown>;
}

function setupAction(
  target: Partial<HasActions>,
  key: string | symbol,
  actionFn: Function
): TypedPropertyDescriptor<unknown> {
  if (hasProto(target)) {
    target.constructor.proto();
  }

  if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
    let parentActions = target.actions;
    // we need to assign because of the way mixins copy actions down when inheriting
    target.actions = parentActions ? Object.assign({}, parentActions) : {};
  }

  assert("[BUG] Somehow the target doesn't have actions!", target.actions != null);

  target.actions[key] = actionFn;

  return {
    get() {
      let bindings = BINDINGS_MAP.get(this);

      if (bindings === undefined) {
        bindings = new Map();
        BINDINGS_MAP.set(this, bindings);
      }

      let fn = bindings.get(actionFn);

      if (fn === undefined) {
        fn = actionFn.bind(this);
        bindings.set(actionFn, fn);
      }

      return fn;
    },
  };
}

export function action(
  target: ElementDescriptor[0],
  key: ElementDescriptor[1],
  desc: ElementDescriptor[2]
): PropertyDescriptor;
export function action(desc: PropertyDescriptor): ExtendedMethodDecorator;
export function action(
  ...args: ElementDescriptor | [PropertyDescriptor]
): PropertyDescriptor | ExtendedMethodDecorator {
  let actionFn: object | Function;

  if (!isElementDescriptor(args)) {
    actionFn = args[0];

    let decorator: ExtendedMethodDecorator = function (
      target,
      key,
      _desc,
      _meta,
      isClassicDecorator
    ) {
      assert(
        'The @action decorator may only be passed a method when used in classic classes. You should decorate methods directly in native classes',
        isClassicDecorator
      );

      assert(
        'The action() decorator must be passed a method when used in classic classes',
        typeof actionFn === 'function'
      );

      return setupAction(target, key, actionFn);
    };

    setClassicDecorator(decorator);

    return decorator;
  }

  let [target, key, desc] = args;

  actionFn = desc?.value;

  assert(
    'The @action decorator must be applied to methods when used in native classes',
    typeof actionFn === 'function'
  );

  // SAFETY: TS types are weird with decorators. This should work.
  return setupAction(target, key, actionFn);
}

setClassicDecorator(action as ExtendedMethodDecorator);
