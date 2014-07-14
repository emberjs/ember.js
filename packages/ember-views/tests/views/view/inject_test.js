import Service from "ember-runtime/system/service";
import Container from "ember-runtime/system/container";
import inject from "ember-runtime/inject";
import View from "ember-views/views/view";

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  QUnit.module('EmberView - injected properties');

  test("services can be injected into views", function() {
    var container = new Container();

    container.register('view:application', View.extend({
      profilerService: inject.service('profiler')
    }));

    container.register('service:profiler', Service.extend());

    var appView = container.lookup('view:application'),
      profilerService = container.lookup('service:profiler');

    equal(profilerService, appView.get('profilerService'), "service.profiler is injected");
  });
}
