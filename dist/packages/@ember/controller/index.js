import { getOwner } from '@ember/-internals/owner'; // This is imported from -internals to avoid circularity
import { computed, get } from '@ember/object';
import { FrameworkObject } from '@ember/object/-internals';
import { inject as metalInject } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { ActionHandler } from '@ember/-internals/runtime';
import { symbol } from '@ember/-internals/utils';
const MODEL = symbol('MODEL');
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
      return this[MODEL];
    },
    set(_key, value) {
      return this[MODEL] = value;
    }
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
  _qpDelegate: null,
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
  _qpChanged(controller, _prop) {
    let dotIndex = _prop.indexOf('.[]');
    let prop = dotIndex === -1 ? _prop : _prop.slice(0, dotIndex);
    let delegate = controller._qpDelegate;
    let value = get(controller, prop);
    delegate(prop, value);
  }
});
class Controller extends FrameworkObject.extend(ControllerMixin) {}
export function inject(...args) {
  return metalInject('controller', ...args);
}
export { Controller as default, ControllerMixin };