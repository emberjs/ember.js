import DefaultResolver from '@ember/application/globals-resolver';
import { moduleFor, DefaultResolverApplicationTestCase, runTask } from 'internal-test-helpers';

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

      return Object.assign(super.applicationOptions, {
        Resolver,
        autoboot: true,
      });
    }

    [`@test a resolver can be supplied to application`]() {
      runTask(() => this.createApplication());
      this.assertText('Fallback');
    }
  }
);
