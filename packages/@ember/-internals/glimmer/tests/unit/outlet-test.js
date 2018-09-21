import { OutletView } from '@ember/-internals/glimmer';
import { run, schedule } from '@ember/runloop';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Glimmer OutletView',
  class extends AbstractTestCase {
    ['@test render in the render queue'](assert) {
      let didAppendOutletView = 0;
      let expectedOutlet = '#foo.bar';

      let renderer = {
        appendOutletView(view, target) {
          didAppendOutletView++;
          assert.equal(view, outletView);
          assert.equal(target, expectedOutlet);
        },
      };

      let outletView = new OutletView({}, renderer);

      run(() => {
        assert.equal(
          didAppendOutletView,
          0,
          'appendOutletView should not yet have been called (before appendTo)'
        );
        outletView.appendTo(expectedOutlet);
        assert.equal(
          didAppendOutletView,
          0,
          'appendOutletView should not yet have been called (sync after appendTo)'
        );

        schedule('actions', () =>
          assert.equal(
            didAppendOutletView,
            0,
            'appendOutletView should not yet have been called (in actions)'
          )
        );
        schedule('render', () =>
          assert.equal(didAppendOutletView, 1, 'appendOutletView should be invoked in render')
        );
      });
    }
  }
);
