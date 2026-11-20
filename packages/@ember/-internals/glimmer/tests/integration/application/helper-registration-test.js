import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import Controller from '@ember/controller';
import Service, { service } from '@ember/service';
import { Helper, helper } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';
import { hbs } from '@lifeart/gxt';

// Dual-backend template registration, branched inline at each call site:
// GXT needs the runtime-`hbs` factory form (late-invoked container helpers
// resolve through GXT's compile pipeline); classic needs the upstream
// `precompileTemplate` form — a GXT factory is not a classic Template and
// fails the application render. `precompileTemplate` is a build-time babel
// macro, so every call must receive a literal template string (no shared
// helper indirection).

moduleFor(
  'Application Lifecycle - Helper Registration',
  class extends ApplicationTestCase {
    ['@test Unbound dashed helpers registered on the container can be late-invoked'](assert) {
      if (__GXT_MODE__) {
        this.addTemplate(
          'application',
          () => hbs`<div id='wrapper'>{{x-borf}} {{x-borf 'YES'}}</div>`
        );
      } else {
        this.add(
          'template:application',
          precompileTemplate(`<div id='wrapper'>{{x-borf}} {{x-borf 'YES'}}</div>`)
        );
      }

      let myHelper = helper((params) => params[0] || 'BORF');
      this.application.register('helper:x-borf', myHelper);

      return this.visit('/').then(() => {
        assert.equal(
          this.$('#wrapper').text(),
          'BORF YES',
          'The helper was invoked from the container'
        );
      });
    }

    ['@test Bound helpers registered on the container can be late-invoked'](assert) {
      if (__GXT_MODE__) {
        this.addTemplate('application', function () {
          return hbs`<div id='wrapper'>{{x-reverse}} {{x-reverse this.foo}}</div>`;
        });
      } else {
        this.add(
          'template:application',
          precompileTemplate(`<div id='wrapper'>{{x-reverse}} {{x-reverse this.foo}}</div>`)
        );
      }

      this.add(
        'controller:application',
        class extends Controller {
          foo = 'alex';
        }
      );

      this.application.register(
        'helper:x-reverse',
        helper(function ([value]) {
          return value ? value.split('').reverse().join('') : '--';
        })
      );

      return this.visit('/').then(() => {
        assert.equal(
          this.$('#wrapper').text(),
          '-- xela',
          'The bound helper was invoked from the container'
        );
      });
    }

    ['@test Undashed helpers registered on the container can be invoked'](assert) {
      if (__GXT_MODE__) {
        this.addTemplate('application', function () {
          return hbs`<div id='wrapper'>{{omg}}|{{yorp 'boo'}}|{{yorp 'ya'}}</div>`;
        });
      } else {
        this.add(
          'template:application',
          precompileTemplate(`<div id='wrapper'>{{omg}}|{{yorp 'boo'}}|{{yorp 'ya'}}</div>`)
        );
      }

      this.application.register(
        'helper:omg',
        helper(() => 'OMG')
      );

      this.application.register(
        'helper:yorp',
        helper(([value]) => value)
      );

      return this.visit('/').then(() => {
        assert.equal(
          this.$('#wrapper').text(),
          'OMG|boo|ya',
          'The helper was invoked from the container'
        );
      });
    }

    ['@test Helpers can receive injections'](assert) {
      if (__GXT_MODE__) {
        this.addTemplate('application', function () {
          return hbs`<div id='wrapper'>{{full-name}}</div>`;
        });
      } else {
        this.add(
          'template:application',
          precompileTemplate(`<div id='wrapper'>{{full-name}}</div>`)
        );
      }

      let serviceCalled = false;

      this.add(
        'service:name-builder',
        class extends Service {
          build() {
            serviceCalled = true;
          }
        }
      );

      this.add(
        'helper:full-name',
        class extends Helper {
          @service('name-builder')
          nameBuilder;

          compute() {
            this.get('nameBuilder').build();
          }
        }
      );

      return this.visit('/').then(() => {
        assert.ok(serviceCalled, 'service was injected, method called');
      });
    }
  }
);
