import CoreView from 'ember-views/views/core_view';
import ClassNamesSupport from './ember-views/class-names-support';
import ChildViewsSupport from 'ember-views/mixins/child_views_support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaRoleSupport from 'ember-views/mixins/aria_role_support';
import ViewMixin from 'ember-views/mixins/view_support';
import ActionSupport from 'ember-views/mixins/action_support';
import TargetActionSupport from 'ember-runtime/mixins/target_action_support';
import EmberView from 'ember-views/views/view';
import symbol from 'ember-metal/symbol';
import EmptyObject from 'ember-metal/empty_object';
import { get } from 'ember-metal/property_get';
import { PROPERTY_DID_CHANGE } from 'ember-metal/property_events';
import {
  UPDATE,
  TO_ROOT_REFERENCE,
  REFERENCE_FOR_KEY,
  RootReference,
  PropertyReference
} from './utils/references';
import { isReadonly } from './helpers/readonly';
import { DirtyableTag } from 'glimmer-reference';
import { assert, deprecate } from 'ember-metal/debug';
import { NAME_KEY } from 'ember-metal/mixin';
import { getOwner } from 'container/owner';

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const ARGS = symbol('ARGS');
export const ROOT_REF = symbol('ROOT_REF');
export const REFS = symbol('REFS');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const HAS_BLOCK = symbol('HAS_BLOCK');

const Component = CoreView.extend(
  ChildViewsSupport,
  ViewStateSupport,
  ClassNamesSupport,
  InstrumentationSupport,
  AriaRoleSupport,
  TargetActionSupport,
  ActionSupport,
  ViewMixin, {
    isComponent: true,
    layoutName: null,
    layout: null,
    controller: null,
    _controller: null,

    init() {
      this._super(...arguments);
      this._viewRegistry = this._viewRegistry || EmberView.views;
      this[DIRTY_TAG] = new DirtyableTag();
      this[ROOT_REF] = null;
      this[REFS] = new EmptyObject();
      this.controller = this;

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

      // If in a tagless component, assert that no event handlers are defined
      assert(
        `You can not define a function that handles DOM events in the \`${this}\` tagless component since it doesn't have any DOM element.`,
        this.tagName !== '' || !this.renderer._destinedForDOM || !(() => {
          let eventDispatcher = getOwner(this).lookup('event_dispatcher:main');
          let events = (eventDispatcher && eventDispatcher._finalEvents) || {};

          for (let key in events) {
            let methodName = events[key];

            if (typeof this[methodName]  === 'function') {
              return true; // indicate that the assertion should be triggered
            }
          }
        }
      )());
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
        let value = get(this, key);

        if (reference[UPDATE]) {
          reference[UPDATE](value);
        } else if (!isReadonly(reference)) {
          let name = this._debugContainerKey.split(':')[1];

          throw new Error(strip`
            Cannot set the \`${key}\` property (on component ${name}) to
            \`${value}\`. The \`${key}\` property came from an immutable
            binding in the template, such as {{${name} ${key}="string"}}
            or {{${name} ${key}=(if theTruth "truth" "false")}}.
          `);
        }
      }
    },

    readDOMAttr(name) {
      // TODO this is probably not correct
      return this.element.getAttribute(name);
    },

    [TO_ROOT_REFERENCE]() {
      let ref = this[ROOT_REF];

      if (!ref) {
        ref = this[ROOT_REF] = new RootReference(this);
      }

      return ref;
    },

    [REFERENCE_FOR_KEY](key) {
      let refs = this[REFS];
      let ref = refs[key];

      if (ref) {
        return ref;
      }

      let args = this[ARGS];
      ref = args && args[key];

      if (!ref || isReadonly(ref)) {
        return refs[key] = new PropertyReference(this[TO_ROOT_REFERENCE](), key);
      }

      let { concatenatedProperties } = this;

      if (concatenatedProperties &&
          concatenatedProperties.length > 0 &&
          concatenatedProperties.indexOf(key) >= 0) {
        return refs[key] = new PropertyReference(this[TO_ROOT_REFERENCE](), key);
      }

      let { mergedProperties } = this;

      if (mergedProperties &&
          mergedProperties.length > 0 &&
          mergedProperties.indexOf(key) >= 0) {
        return refs[key] = new PropertyReference(this[TO_ROOT_REFERENCE](), key);
      }

      return refs[key] = ref;
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
