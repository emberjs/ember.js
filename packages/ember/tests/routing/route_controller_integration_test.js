import { Route } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Route <-> Controller Integration',
  class extends ApplicationTestCase {
    ['@test properties that autotrack the model update when the model changes'](assert) {
      assert.expect(2);

      this.router.map(function() {
        this.route('home', { path: '/home/:id' });
      });

      class HomeRoute extends Route {
        async model({ id }) {
          return { value: id };
        }
      }

      class HomeController extends Controller {
        get derivedProperty() {
          return this.model.value || 'value is unset';
        }
      }

      this.add('route:home', HomeRoute);
      this.add('controller:home', HomeController);
      this.addTemplate('home', '<h3 class="derivedProperty">{{this.derivedProperty}}</h3>');

      return this.visit('/home/2')
        .then(() => {
          assert.equal(
            document.querySelector('h3').innerText,
            '2',
            'the derived property matches the id'
          );
        })
        .then(() => {
          return this.visit('/home/3').then(() => {
            assert.equal(
              document.querySelector('h3').innerText,
              '3',
              'the derived property matches the id'
            );
          });
        });
    }
  }
);
