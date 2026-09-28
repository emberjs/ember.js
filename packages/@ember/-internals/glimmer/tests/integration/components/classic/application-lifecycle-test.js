import {
  moduleFor,
  AutobootApplicationTestCase,
  runTask,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import Application from '@ember/application';
import Router from '@ember/routing/router';
import { Component } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Application Lifecycle (classic component)',
    class extends AutobootApplicationTestCase {
      createApplication() {
        let application = super.createApplication(...arguments);
        this.add(
          'router:main',
          class extends Router {
            location = 'none';
          }
        );
        return application;
      }

      [`@test initializers can augment an applications customEvents hash`](assert) {
        expectClassicComponentDeprecation();

        assert.expect(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isEnabled ? 2 : 1);

        let MyApplication = class extends Application {};

        MyApplication.initializer({
          name: 'customize-things',
          initialize(application) {
            application.customEvents = {
              wowza: 'wowza',
            };
          },
        });

        runTask(() => {
          this.createApplication({}, MyApplication);

          this.add(
            'component:foo-bar',
            setComponentTemplate(
              precompileTemplate(`<div id='wowza-thingy'></div>`),
              class extends Component {
                wowza() {
                  assert.ok(true, 'fired the event!');
                }
              }
            )
          );

          this.add('template:application', precompileTemplate(`{{foo-bar}}`));
        });

        this.$('#wowza-thingy').trigger('wowza');
      }

      [`@test instanceInitializers can augment an the customEvents hash`](assert) {
        expectClassicComponentDeprecation();

        assert.expect(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isEnabled ? 2 : 1);

        let MyApplication = class extends Application {};

        MyApplication.instanceInitializer({
          name: 'customize-things',
          initialize(application) {
            application.customEvents = {
              herky: 'jerky',
            };
          },
        });
        runTask(() => {
          this.createApplication({}, MyApplication);

          this.add(
            'component:foo-bar',
            setComponentTemplate(
              precompileTemplate(`<div id='herky-thingy'></div>`),
              class extends Component {
                jerky() {
                  assert.ok(true, 'fired the event!');
                }
              }
            )
          );

          this.add('template:application', precompileTemplate(`{{foo-bar}}`));
        });

        this.$('#herky-thingy').trigger('herky');
      }
    }
  );
}
