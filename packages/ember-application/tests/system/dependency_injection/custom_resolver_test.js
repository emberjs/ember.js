import DefaultResolver from '../../../system/resolver';
import { assign } from 'ember-utils';
import {
  moduleFor,
  DefaultResolverApplicationTestCase
} from 'internal-test-helpers';

moduleFor('Ember.Application with extended default resolver and autoboot', class extends DefaultResolverApplicationTestCase {

  get applicationOptions() {
    let applicationTemplate = this.compile(`<h1>Fallback</h1>`);

    let Resolver = DefaultResolver.extend({
      resolveTemplate(resolvable) {
        if (resolvable.fullNameWithoutType === 'application') {
          return applicationTemplate;
        } else {
          return this._super(resolvable);
        }
      }
    });

    return assign(super.applicationOptions, {
      Resolver,
      autoboot: true
    });
  }

  [`@test a resolver can be supplied to application`](assert) {
    this.runTask(() => this.createApplication());
    assert.equal(this.$('h1').text(), 'Fallback');
  }

});
