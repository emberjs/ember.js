import {
  RenderingTestCase,
  moduleFor,
  strip
} from 'internal-test-helpers';
import { renderSettled } from 'ember-glimmer';
import { all } from 'rsvp';
import { run } from 'ember-metal';

moduleFor('renderSettled', class extends RenderingTestCase {
  ['@test resolves when no rendering is happening'](assert) {
    return renderSettled().then(() => {
      assert.ok(true, 'resolved even without rendering');
    });
  }

  ['@test resolves renderers exist but no runloops are triggered'](assert) {
    this.render(strip`{{foo}}`, { foo: 'bar' });

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
    this.render(strip`{{foo}}`, { foo: 'bar' });

    this.assertText('bar');
    this.component.set('foo', 'baz');
    this.assertText('bar');

    return renderSettled().then(() => {
      this.assertText('baz');
    });
  }

  ['@test resolves in run loop when renderer has settled'](assert) {
    assert.expect(3);

    this.render(strip`{{foo}}`, { foo: 'bar' });

    this.assertText('bar');
    let promise;

    return run(() => {
      run.schedule('actions', null, () => {
        this.component.set('foo', 'set in actions');

        promise = renderSettled().then(() => {
          this.assertText('set in afterRender');
        });

        run.schedule('afterRender', null, () => {
          this.component.set('foo', 'set in afterRender');
        });
      });

      // still not updated here
      this.assertText('bar');

      return promise;
    });
  }
});
