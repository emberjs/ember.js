import CoreView from 'ember-views/views/core_view';
import ChildViewsSupport from './ember-views/child-views-support';
import ClassNamesSupport from './ember-views/class-names-support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaRoleSupport from 'ember-views/mixins/aria_role_support';
import ViewMixin from 'ember-views/mixins/view_support';
import EmberView from 'ember-views/views/view';
import symbol from 'ember-metal/symbol';
import { get } from 'ember-metal/property_get';
import { PROPERTY_DID_CHANGE } from 'ember-metal/property_events';
import { UPDATE } from './utils/references';
import { DirtyableTag } from 'glimmer-reference';

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const ARGS = symbol('ARGS');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const HAS_BLOCK = symbol('HAS_BLOCK');

export default CoreView.extend(
  ChildViewsSupport,
  ViewStateSupport,
  ClassNamesSupport,
  InstrumentationSupport,
  AriaRoleSupport,
  ViewMixin, {
    isComponent: true,
    template: null,
    layoutName: null,
    layout: null,

    init() {
      this._super(...arguments);
      this._viewRegistry = this._viewRegistry || EmberView.views;
      this[DIRTY_TAG] = new DirtyableTag();
    },

    rerender() {
      this[DIRTY_TAG].dirty();
      this._super();
    },

    __defineNonEnumerable(property) {
      this[property.name] = property.descriptor.value;
    },

    [IS_DISPATCHING_ATTRS]: false,

    [PROPERTY_DID_CHANGE](key) {
      if (this[IS_DISPATCHING_ATTRS]) { return; }

      let args, reference;

      if ((args = this[ARGS]) && (reference = args[key])) {
        if (reference[UPDATE]) {
          reference[UPDATE](get(this, key));
        } else {
          let name = this._debugContainerKey.split(':')[1];
          let value = get(this, key);
          throw new Error(strip`
Cannot set the \`${key}\` property (on component ${name}) to
\`${value}\`. The \`${key}\` property came from an immutable
binding in the template, such as {{${name} ${key}="string"}}
or {{${name} ${key}=(if theTruth "truth" "false")}}.
          `);
        }
      }
    }
  });

function strip([...strings], ...values) {
  let str = strings.map((string, index) => {
    let interpolated = values[index];
    return string + (interpolated !== undefined ? interpolated : '');
  }).join('');
  return str.split('\n').map(s => s.trim()).join(' ');
}
