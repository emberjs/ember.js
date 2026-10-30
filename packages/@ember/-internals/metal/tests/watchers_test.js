import { notifyPropertyChange } from '@ember/object';
import { watchProperty } from '@ember/-internals/metal/lib/watchers';
import { destroy } from '@glimmer/destroyable';
import { tracked } from '@glimmer/tracking';
import { moduleFor, AbstractTestCase, runLoopSettled, runTask } from 'internal-test-helpers';

class Post {
  @tracked title = 'one';
  @tracked tags = [];

  get shoutedTitle() {
    return this.title.toUpperCase();
  }
}

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'watchProperty',
    class extends AbstractTestCase {
      async ['@test it runs once per run loop after the property changes'](assert) {
        let post = new Post();

        watchProperty(post, 'title', () => assert.step(`changed to ${post.title}`));

        runTask(() => {
          post.title = 'two';
          post.title = 'three';
          assert.verifySteps([]);
        });
        await runLoopSettled();

        assert.verifySteps(['changed to three']);

        runTask(() => {});
        await runLoopSettled();

        assert.verifySteps([]);
      }

      async ['@test it watches a getter through the tracked state that it uses'](assert) {
        let post = new Post();

        watchProperty(post, 'shoutedTitle', () => assert.step(post.shoutedTitle));

        runTask(() => (post.title = 'two'));
        await runLoopSettled();

        assert.verifySteps(['TWO']);
      }

      async ['@test it sees changes inside of an array'](assert) {
        let post = new Post();

        watchProperty(post, 'tags', () => assert.step(`tags ${post.tags}`));

        runTask(() => {
          post.tags.push('a');
          notifyPropertyChange(post.tags, '[]');
        });
        await runLoopSettled();

        assert.verifySteps(['tags a']);
      }

      async ['@test a second watcher of the same property does nothing'](assert) {
        let post = new Post();

        watchProperty(post, 'title', () => assert.step('first'));
        watchProperty(post, 'title', () => assert.step('second'));

        runTask(() => (post.title = 'two'));
        await runLoopSettled();

        assert.verifySteps(['first']);
      }

      async ['@test it stops when the object is destroyed'](assert) {
        let post = new Post();

        watchProperty(post, 'title', () => assert.step('changed'));

        runTask(() => destroy(post));
        await runLoopSettled();
        runTask(() => (post.title = 'two'));
        await runLoopSettled();

        assert.verifySteps([]);
      }
    }
  );
}
