import { RenderingTestCase, moduleFor, strip } from 'internal-test-helpers';

import { renderSettled } from '@ember/-internals/glimmer';
import { set } from '@ember/object';
import { run, schedule } from '@ember/runloop';

import { all } from 'rsvp';

moduleFor(
  'renderSettled',
  class extends RenderingTestCase {
    ['@test resolves when no rendering is happening'](assert) {
      return renderSettled().then(() => {
        assert.ok(true, 'resolved even without rendering');
      });
    }

    ['@test resolves renderers exist but no runloops are triggered'](assert) {
      this.render(strip`{{this.foo}}`, { foo: 'bar' });

      return renderSettled().then(() => {
        assert.ok(true, 'resolved even without runloops');
      });
    }

    ['@test does not create extraneous promises'](assert) {
      let first = renderSettled();
      let second = renderSettled();

      assert.strictEqual(first, second);

      return all([first, second]);
    }

    ['@test resolves when rendering has completed (after property update)']() {
      this.render(strip`{{this.foo}}`, { foo: 'bar' });

      this.assertText('bar');
      set(this.component, 'foo', 'baz');
      this.assertText('bar');

      return renderSettled().then(() => {
        this.assertText('baz');
      });
    }

    ['@test resolves in run loop when renderer has settled'](assert) {
      assert.expect(3);

      this.render(strip`{{this.foo}}`, { foo: 'bar' });

      this.assertText('bar');
      let promise;

      return run(() => {
        schedule('actions', null, () => {
          set(this.component, 'foo', 'set in actions');

          promise = renderSettled().then(() => {
            this.assertText('set in afterRender');
          });

          schedule('afterRender', null, () => {
            set(this.component, 'foo', 'set in afterRender');
          });
        });

        // still not updated here
        this.assertText('bar');

        return promise;
      });
    }
  }
);
