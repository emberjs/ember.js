import CoreView from 'ember-views/views/core_view';
import ViewChildViewsSupport from 'ember-views/mixins/view_child_views_support';
import ViewStateSupport from 'ember-views/mixins/view_state_support';
import TemplateRenderingSupport from 'ember-views/mixins/template_rendering_support';
import ClassNamesSupport from 'ember-views/mixins/class_names_support';
import InstrumentationSupport from 'ember-views/mixins/instrumentation_support';
import AriaRoleSupport from 'ember-views/mixins/aria_role_support';
import ViewMixin from 'ember-views/mixins/view_support';
import EmberView from 'ember-views/views/view';

export default CoreView.extend(
  ViewChildViewsSupport,
  ViewStateSupport,
  TemplateRenderingSupport,
  ClassNamesSupport,
  InstrumentationSupport,
  AriaRoleSupport,
  ViewMixin, {
    isComponent: true,
    isGlimmerComponent: true,

    init() {
      this._super(...arguments);
      this._viewRegistry = this._viewRegistry || EmberView.views;
    }
  });
