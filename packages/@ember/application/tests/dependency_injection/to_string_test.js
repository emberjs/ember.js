import { assign } from '@ember/polyfills';
import { guidFor } from '@ember/-internals/utils';
import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  DefaultResolverApplicationTestCase,
} from 'internal-test-helpers';

moduleFor(
  'Application Dependency Injection - DefaultResolver#toString',
  class extends DefaultResolverApplicationTestCase {
    constructor() {
      super();
      this.runTask(() => this.createApplication());
      this.application.Post = EmberObject.extend();
    }

    beforeEach() {
      return this.visit('/');
    }

    ['@test factories'](assert) {
      let PostFactory = this.applicationInstance.factoryFor('model:post').class;
      assert.equal(PostFactory.toString(), 'TestApp.Post', 'expecting the model to be post');
    }

    ['@test instances'](assert) {
      let post = this.applicationInstance.lookup('model:post');
      let guid = guidFor(post);

      assert.equal(
        post.toString(),
        '<TestApp.Post:' + guid + '>',
        'expecting the model to be post'
      );
    }
  }
);

moduleFor(
  'Application Dependency Injection - Resolver#toString',
  class extends ApplicationTestCase {
    beforeEach() {
      return this.visit('/');
    }

    get applicationOptions() {
      return assign(super.applicationOptions, {
        Resolver: class extends ModuleBasedTestResolver {
          makeToString(_, fullName) {
            return fullName;
          }
        },
      });
    }

    ['@test toString called on a resolver'](assert) {
      this.add('model:peter', EmberObject.extend());

      let peter = this.applicationInstance.lookup('model:peter');
      let guid = guidFor(peter);
      assert.equal(
        peter.toString(),
        `<model:peter:${guid}>`,
        'expecting the supermodel to be peter'
      );
    }
  }
);
