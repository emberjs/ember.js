import CoreView from 'ember-views/views/core_view';
import ChildViewsSupport from './child-views-support';
import ClassNamesSupport from './class-names-support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaSupport from 'ember-views/mixins/aria_support';
import ViewMixin from 'ember-views/mixins/view_support';
import EmberView from 'ember-views/views/view';

export default CoreView.extend(
  ChildViewsSupport,
  ViewStateSupport,
  ClassNamesSupport,
  InstrumentationSupport,
  AriaSupport,
  ViewMixin, {
    isComponent: true,
    template: null,
    layoutName: null,
    layout: null,

    init() {
      this._super(...arguments);
      this._viewRegistry = this._viewRegistry || EmberView.views;
    }
  });
