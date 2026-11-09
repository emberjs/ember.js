import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { Component as EmberComponent } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'Route - template rendering (classic component)',
  class extends ApplicationTestCase {
    ['@test Components inside an outlet have their didInsertElement hook invoked when the route is displayed'](
      assert
    ) {
      this.add(
        'template:index',
        precompileTemplate(
          '{{#if this.showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'
        )
      );

      let myComponentCounter = 0;
      let otherComponentCounter = 0;
      let indexController;

      this.router.map(function () {
        this.route('index', { path: '/' });
      });

      this.add(
        'controller:index',
        class extends Controller {
          showFirst = true;
        }
      );

      this.add(
        'route:index',
        class extends Route {
          setupController(controller) {
            indexController = controller;
          }
        }
      );

      this.add(
        'component:my-component',
        class extends EmberComponent {
          didInsertElement() {
            myComponentCounter++;
          }
        }
      );

      this.add(
        'component:other-component',
        class extends EmberComponent {
          didInsertElement() {
            otherComponentCounter++;
          }
        }
      );

      return this.visit('/').then(() => {
        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          0,
          'didInsertElement not invoked on displayed component'
        );

        run(() => indexController.set('showFirst', false));

        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement not invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
      });
    }
  }
);
