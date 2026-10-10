import type { Dict, Owner } from '@glimmer/interfaces';
import {
  GlimmerishComponent,
  jitSuite,
  nodeSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';
import { isTracking, resetTracking } from '@glimmer/validator';

import { assert } from './support';

// A render that throws part-way leaves a tracking frame open.
// The opcode that opened it never reaches the one that would close it.
// The VM resets the tracking state when that happens.
// That reset has to run in every build.
// When it ran only in DEBUG builds, a production build kept the frame open
// for as long as the process lived, and every later render added its tags.
// In a browser the page was already broken.
// A long-lived server-side renderer such as FastBoot kept rendering,
// so it leaked until it ran out of heap (emberjs/ember.js#20130).
class TrackingResetAfterErrorTest extends RenderTest {
  static suiteName = 'tracking state after a render error';

  // Never let a failing assertion here leak an open frame into other tests.
  afterEach(): void {
    resetTracking();
  }

  @test
  'a component that throws while being created does not leave a tracking frame open'() {
    class Boom extends GlimmerishComponent {
      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        throw new Error('boom');
      }
    }

    this.registerComponent('Glimmer', 'Boom', 'never rendered', Boom);

    assert.false(isTracking(), 'precondition: nothing is tracking before the render');

    assert.throws(() => this.render('<Boom />'), /boom/);

    assert.false(isTracking(), 'the frame opened for the failed render was closed');
  }

  @test
  'a rerender that throws does not leave a tracking frame open'() {
    class Fragile extends GlimmerishComponent {
      get value(): string {
        if (this.args['explode']) {
          throw new Error('boom on rerender');
        }
        return 'fine';
      }
    }

    this.registerComponent('Glimmer', 'Fragile', '{{this.value}}', Fragile);

    this.render('<Fragile @explode={{this.explode}} />', { explode: false });
    this.assertHTML('fine');
    assert.false(isTracking(), 'precondition: nothing is tracking after a clean render');

    assert.throws(() => this.rerender({ explode: true }), /boom on rerender/);

    assert.false(isTracking(), 'the frame opened for the failed rerender was closed');
  }
}

jitSuite(TrackingResetAfterErrorTest);
nodeSuite(TrackingResetAfterErrorTest);
