import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { run } from 'ember-metal';
import { Router } from 'ember-routing';

moduleFor('Router.map', class extends ApplicationTestCase {
  ['@test Router.map returns an Ember Router class'](assert) {
    assert.expect(1);

    let ret = this.router.map(function() {
      this.route('hello');
    });

    assert.ok(Router.detect(ret));
  }

  ['@test Router.map can be called multiple times'](assert) {
    assert.expect(2);

    this.addTemplate('hello', 'Hello!');
    this.addTemplate('goodbye', 'Goodbye!');

    this.router.map(function() {
      this.route('hello');
    });

    this.router.map(function() {
      this.route('goodbye');
    });

    return run(() => {
      return this.visit('/hello').then(() => {
        this.assertText('Hello!');
      }).then(() => {
        return this.visit('/goodbye');
      }).then(() => {
        this.assertText('Goodbye!');
      });
    });
  }
});
