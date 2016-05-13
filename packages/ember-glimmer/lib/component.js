import CoreView from 'ember-views/views/core_view';
import ChildViewsSupport from './ember-views/child-views-support';
import ClassNamesSupport from './ember-views/class-names-support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaRoleSupport from 'ember-views/mixins/aria_role_support';
import ViewMixin from 'ember-views/mixins/view_support';
import EmberView from 'ember-views/views/view';
import symbol from 'ember-metal/symbol';
import { DirtyableTag } from 'glimmer-reference';

export const DIRTY_TAG = symbol('DIRTY_TAG');

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
    }
  });
