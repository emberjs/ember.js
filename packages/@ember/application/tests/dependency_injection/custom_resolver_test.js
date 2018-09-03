fdimport DefaultResolver from '@ember/application/globals-resolver';
import { assign } from '@ember/polyfills';
import { moduleFor, DefaultResolverApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Application with extended default resolver and autoboot',
  class extends DefaultResolverApplicationTestCase {
    get applicationOptions() {
      let applicationTemplate = this.compile(`<h1>Fallback</h1>`);

      let Resolver = DefaultResolver.extend({
        resolveTemplate(resolvable) {
          if (resolvable.fullNameWithoutType === 'application') {
            return applicationTemplate;
          } else {
            return this._super(resolvable);
          }
        },
      });

      return assign(super.applicationOptions, {
        Resolver,
        autoboot: true,
      });
    }

    [`@test a resolver can be supplied to application`]() {
      this.runTask(() => this.createApplication());
      this.assertText('Fallback');
    }
  }
);
