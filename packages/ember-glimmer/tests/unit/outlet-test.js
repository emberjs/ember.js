import OutletView from 'ember-glimmer/views/outlet';
import { run } from 'ember-metal';

QUnit.module('Glimmer OutletView');

QUnit.test('render in the render queue', function(assert) {
  let didAppendOutletView = 0;
  let expectedOutlet = '#foo.bar';

  let renderer = {
    appendOutletView(view, target) {
      didAppendOutletView++;
      assert.equal(view, outletView);
      assert.equal(target, expectedOutlet);
    }
  };

  let outletView  = new OutletView({}, renderer);

  run(() => {
    assert.equal(didAppendOutletView, 0, 'appendOutletView should not yet have been called (before appendTo)');
    outletView.appendTo(expectedOutlet);
    assert.equal(didAppendOutletView, 0, 'appendOutletView should not yet have been called (sync after appendTo)');

    run.schedule('actions', () => assert.equal(didAppendOutletView, 0, 'appendOutletView should not yet have been called (in actions)'));
    run.schedule('render',  () => assert.equal(didAppendOutletView, 1, 'appendOutletView should be invoked in render'));
  });
});
