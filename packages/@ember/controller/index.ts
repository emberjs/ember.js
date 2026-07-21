import { getOwner } from '@ember/-internals/owner'; // This is imported from -internals to avoid circularity
import computed from '@ember/-internals/metal/lib/computed';
import { get } from '@ember/-internals/metal/lib/property_get';
import Mixin from '@ember/object/mixin';
import ActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler';
import type { ControllerMixin as ControllerMixinInterface } from './-base';
import type Controller from './-base';

export { default, inject, type ControllerQueryParam, type ControllerQueryParamType } from './-base';

/**
  A type registry for Ember `Controller`s. Meant to be declaration-merged so string
  lookups resolve to the correct type.

  Declared here in the `@ember/controller` module itself (not re-exported from
  `-base`) because module augmentation only merges with interfaces declared in
  the augmented module.

  Blueprints should include such a declaration merge for TypeScript:

  ```ts
  import Controller from '@ember/controller';

  export default class ExampleController extends Controller {
  // ...
  }

  declare module '@ember/controller' {
    export interface Registry {
      example: ExampleController;
    }
  }
  ```

  Then `@inject` can check that the service is registered correctly, and APIs
  like `owner.lookup('controller:example')` can return `ExampleController`.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Registry extends Record<string, Controller | undefined> {}

/**
@module @ember/controller
*/

const MIXIN_MODEL = Symbol('MODEL');

/**
  The classic `ControllerMixin`. The `Controller` class itself (see `-base`)
  implements this behavior directly; the mixin remains as public API for
  classic classes that incorporate it via `.extend()`.

  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
  @private
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ControllerMixin<T> extends ControllerMixinInterface<T> {}
const ControllerMixin = Mixin.create(ActionHandler, {
  /* ducktype as a controller */
  isController: true,

  concatenatedProperties: ['queryParams'],

  target: null,

  store: null,

  init() {
    this._super(...arguments);
    let owner = getOwner(this);
    if (owner) {
      this.namespace = owner.lookup('application:main');
      this.target = owner.lookup('router:main');
    }
  },

  model: computed({
    get() {
      return this[MIXIN_MODEL];
    },

    set(_key, value) {
      return (this[MIXIN_MODEL] = value);
    },
  }),

  queryParams: null,

  /**
   This property is updated to various different callback functions depending on
   the current "state" of the backing route. It is used by
   `Controller.prototype._qpChanged`.

   The methods backing each state can be found in the `Route.prototype._qp` computed
   property return value (the `.states` property). The current values are listed here for
   the sanity of future travelers:

   * `inactive` - This state is used when this controller instance is not part of the active
     route hierarchy. Set in `Route.prototype._reset` (a `router.js` microlib hook) and
     `Route.prototype.actions.finalizeQueryParamChange`.
   * `active` - This state is used when this controller instance is part of the active
     route hierarchy. Set in `Route.prototype.actions.finalizeQueryParamChange`.
   * `allowOverrides` - This state is used in `Route.prototype.setup` (`route.js` microlib hook).

    @method _qpDelegate
    @private
  */
  _qpDelegate: null, // set by route

  /**
   During `Route#setup` observers are created to invoke this method
   when any of the query params declared in `Controller#queryParams` property
   are changed.

   When invoked this method uses the currently active query param update delegate
   (see `Controller.prototype._qpDelegate` for details) and invokes it with
   the QP key/value being changed.

    @method _qpChanged
    @private
  */
  _qpChanged(controller: any, _prop: string) {
    let dotIndex = _prop.indexOf('.[]');
    let prop = dotIndex === -1 ? _prop : _prop.slice(0, dotIndex);

    let delegate = controller._qpDelegate;
    let value = get(controller, prop);
    delegate(prop, value);
  },
});

export { ControllerMixin };
