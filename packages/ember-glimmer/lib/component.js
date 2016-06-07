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
import { deprecate } from 'ember-metal/debug';
import { NAME_KEY } from 'ember-metal/mixin';

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const ARGS = symbol('ARGS');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const HAS_BLOCK = symbol('HAS_BLOCK');

const Component = CoreView.extend(
  ChildViewsSupport,
  ViewStateSupport,
  ClassNamesSupport,
  InstrumentationSupport,
  AriaRoleSupport,
  ViewMixin, {
    isComponent: true,
    layoutName: null,
    layout: null,

    init() {
      this._super(...arguments);
      this._viewRegistry = this._viewRegistry || EmberView.views;
      this[DIRTY_TAG] = new DirtyableTag();

      // If a `defaultLayout` was specified move it to the `layout` prop.
      // `layout` is no longer a CP, so this just ensures that the `defaultLayout`
      // logic is supported with a deprecation
      if (this.defaultLayout && !this.layout) {
        deprecate(
          `Specifying \`defaultLayout\` to ${this} is deprecated. Please use \`layout\` instead.`,
          false,
          {
            id: 'ember-views.component.defaultLayout',
            until: '3.0.0',
            url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-component-defaultlayout'
          }
        );

        this.layout = this.defaultLayout;
      }
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
  }
);

Component[NAME_KEY] = 'Ember.Component';

Component.reopenClass({
  isComponentFactory: true
});

function strip([...strings], ...values) {
  let str = strings.map((string, index) => {
    let interpolated = values[index];
    return string + (interpolated !== undefined ? interpolated : '');
  }).join('');
  return str.split('\n').map(s => s.trim()).join(' ');
}

export default Component;
