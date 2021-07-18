import { DEBUG } from '@glimmer/env';
import { assert, deprecate } from '@ember/debug';
import { isElementDescriptor, setClassicDecorator } from '@ember/-internals/metal';
import { onComputedDotAccess } from '@ember/-internals/overrides';

export { Object as default } from '@ember/-internals/runtime';

export {
  notifyPropertyChange,
  defineProperty,
  get,
  set,
  getProperties,
  setProperties,
  getWithDefault,
  observer,
  computed,
  trySet,
  aliasMethod,
} from '@ember/-internals/metal';

import { computed } from '@ember/-internals/metal';

import {
  alias,
  and,
  bool,
  collect,
  deprecatingAlias,
  empty,
  equal,
  filterBy,
  filter,
  gte,
  gt,
  intersect,
  lte,
  lt,
  mapBy,
  map,
  match,
  max,
  min,
  none,
  notEmpty,
  not,
  oneWay,
  or,
  readOnly,
  setDiff,
  sort,
  sum,
  union,
  uniqBy,
  uniq,
} from '@ember/object/computed';

// eslint-disable-next-line no-undef
if (DEBUG) {
  let defaultHandler = (dotKey, importKey, module) => {
    return `Using \`${dotKey}\` has been deprecated. Instead, import the value directly from ${module}:\n\n  import { ${importKey} } from '${module}';`;
  };

  let handler = onComputedDotAccess || defaultHandler;

  let defineDeprecatedComputedFunc = (key, func) => {
    Object.defineProperty(computed, key, {
      get() {
        let message = handler(`computed.${key}`, key, '@ember/object/computed');

        deprecate(message, message === null, {
          id: 'deprecated-run-loop-and-computed-dot-access',
          until: '4.0.0',
          for: 'ember-source',
          since: {
            enabled: '3.27.0',
          },
        });

        return func;
      },
    });
  };

  defineDeprecatedComputedFunc('alias', alias);
  defineDeprecatedComputedFunc('and', and);
  defineDeprecatedComputedFunc('bool', bool);
  defineDeprecatedComputedFunc('collect', collect);
  defineDeprecatedComputedFunc('deprecatingAlias', deprecatingAlias);
  defineDeprecatedComputedFunc('empty', empty);
  defineDeprecatedComputedFunc('equal', equal);
  defineDeprecatedComputedFunc('filterBy', filterBy);
  defineDeprecatedComputedFunc('filter', filter);
  defineDeprecatedComputedFunc('gte', gte);
  defineDeprecatedComputedFunc('gt', gt);
  defineDeprecatedComputedFunc('intersect', intersect);
  defineDeprecatedComputedFunc('lte', lte);
  defineDeprecatedComputedFunc('lt', lt);
  defineDeprecatedComputedFunc('mapBy', mapBy);
  defineDeprecatedComputedFunc('map', map);
  defineDeprecatedComputedFunc('match', match);
  defineDeprecatedComputedFunc('max', max);
  defineDeprecatedComputedFunc('min', min);
  defineDeprecatedComputedFunc('none', none);
  defineDeprecatedComputedFunc('notEmpty', notEmpty);
  defineDeprecatedComputedFunc('not', not);
  defineDeprecatedComputedFunc('oneWay', oneWay);
  defineDeprecatedComputedFunc('reads', oneWay);
  defineDeprecatedComputedFunc('or', or);
  defineDeprecatedComputedFunc('readOnly', readOnly);
  defineDeprecatedComputedFunc('setDiff', setDiff);
  defineDeprecatedComputedFunc('sort', sort);
  defineDeprecatedComputedFunc('sum', sum);
  defineDeprecatedComputedFunc('union', union);
  defineDeprecatedComputedFunc('uniqBy', uniqBy);
  defineDeprecatedComputedFunc('uniq', uniq);
} else {
  computed.alias = alias;
  computed.and = and;
  computed.bool = bool;
  computed.collect = collect;
  computed.deprecatingAlias = deprecatingAlias;
  computed.empty = empty;
  computed.equal = equal;
  computed.filterBy = filterBy;
  computed.filter = filter;
  computed.gte = gte;
  computed.gt = gt;
  computed.intersect = intersect;
  computed.lte = lte;
  computed.lt = lt;
  computed.mapBy = mapBy;
  computed.map = map;
  computed.match = match;
  computed.max = max;
  computed.min = min;
  computed.none = none;
  computed.notEmpty = notEmpty;
  computed.not = not;
  computed.oneWay = oneWay;
  computed.reads = oneWay;
  computed.or = or;
  computed.readOnly = readOnly;
  computed.setDiff = setDiff;
  computed.sort = sort;
  computed.sum = sum;
  computed.union = union;
  computed.uniqBy = uniqBy;
  computed.uniq = uniq;
}

/**
  Decorator that turns the target function into an Action which can be accessed
  directly by reference.

  ```js
  import Component from '@ember/component';
  import { action, set } from '@ember/object';

  export default class Tooltip extends Component {
    @action
    toggleShowing() {
      set(this, 'isShowing', !this.isShowing);
    }
  }
  ```
  ```hbs
  <!-- template.hbs -->
  <button {{action this.toggleShowing}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  Decorated actions also interop with the string style template actions:

  ```hbs
  <!-- template.hbs -->
  <button {{action "toggleShowing"}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  It also binds the function directly to the instance, so it can be used in any
  context and will correctly refer to the class it came from:

  ```hbs
  <!-- template.hbs -->
  <button
    {{did-insert this.toggleShowing}}
    {{on "click" this.toggleShowing}}
  >
    Show tooltip
  </button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  This can also be used in JavaScript code directly:

  ```js
  import Component from '@ember/component';
  import { action, set } from '@ember/object';

  export default class Tooltip extends Component {
    constructor() {
      super(...arguments);

      // this.toggleShowing is still bound correctly when added to
      // the event listener
      document.addEventListener('click', this.toggleShowing);
    }

    @action
    toggleShowing() {
      set(this, 'isShowing', !this.isShowing);
    }
  }
  ```

  This is considered best practice, since it means that methods will be bound
  correctly no matter where they are used. By contrast, the `{{action}}` helper
  and modifier can also be used to bind context, but it will be required for
  every usage of the method:

  ```hbs
  <!-- template.hbs -->
  <button
    {{did-insert (action this.toggleShowing)}}
    {{on "click" (action this.toggleShowing)}}
  >
    Show tooltip
  </button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  They also do not have equivalents in JavaScript directly, so they cannot be
  used for other situations where binding would be useful.

  @public
  @method action
  @for @ember/object
  @static
  @param {Function|undefined} callback The function to turn into an action,
                                       when used in classic classes
  @return {PropertyDecorator} property decorator instance
*/

const BINDINGS_MAP = new WeakMap();

function setupAction(target, key, actionFn) {
  if (target.constructor !== undefined && typeof target.constructor.proto === 'function') {
    target.constructor.proto();
  }

  if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
    let parentActions = target.actions;
    // we need to assign because of the way mixins copy actions down when inheriting
    target.actions = parentActions ? Object.assign({}, parentActions) : {};
  }

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

export function action(target, key, desc) {
  let actionFn;

  if (!isElementDescriptor([target, key, desc])) {
    actionFn = target;

    let decorator = function (target, key, desc, meta, isClassicDecorator) {
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

  actionFn = desc.value;

  assert(
    'The @action decorator must be applied to methods when used in native classes',
    typeof actionFn === 'function'
  );

  return setupAction(target, key, actionFn);
}

setClassicDecorator(action);
