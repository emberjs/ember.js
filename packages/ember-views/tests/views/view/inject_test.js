import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';
import View from 'ember-views/views/view';
import buildOwner from 'container/tests/test-helpers/build-owner';

QUnit.module('EmberView - injected properties');

QUnit.test('services can be injected into views', function() {
  let owner = buildOwner();

  owner.register('view:application', View.extend({
    profilerService: inject.service('profiler')
  }));

  owner.register('service:profiler', Service.extend());

  var appView = owner.lookup('view:application');
  var profilerService = owner.lookup('service:profiler');

  equal(profilerService, appView.get('profilerService'), 'service.profiler is injected');
});
