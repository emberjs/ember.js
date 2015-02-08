import Service from "ember-runtime/system/service";
import { Registry } from "ember-runtime/system/container";
import inject from "ember-runtime/inject";
import View from "ember-views/views/view";

QUnit.module('EmberView - injected properties');

QUnit.test("services can be injected into views", function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('view:application', View.extend({
    profilerService: inject.service('profiler')
  }));

  registry.register('service:profiler', Service.extend());

  var appView = container.lookup('view:application');
  var profilerService = container.lookup('service:profiler');

  equal(profilerService, appView.get('profilerService'), "service.profiler is injected");
});
