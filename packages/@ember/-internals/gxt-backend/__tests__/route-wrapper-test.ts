/**
 * Routes whose route manager provides its own wrapper (`getRouteWrapper()`,
 * RFC 1169), rendered by the compat outlets (GXT_MODE).
 *
 * Upstream's outlet invokes a level's wrapper with `@Component` (the route's
 * invokable), `@bucket`, `@context` (the route's model) and `@outlet` (the
 * next level). For a classic route the invokable renders the route's template
 * with its controller as `this`. These tests cover what the route-manager
 * suite does not: a new model on the same route, the controller as `this`,
 * and a route without a template.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, ApplicationTestCase, runTask } from 'internal-test-helpers';
import { ClassicRouteManager } from '@ember/-internals/routing/route-managers/classic/manager';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { setRouteManager } from '@ember/routing';
import Route from '@ember/routing/route';
import { precompileTemplate } from '@ember/template-compilation';
import { tracked } from '@glimmer/tracking';

const WrapOutlet = setComponentTemplate(
  precompileTemplate('wrap(<@Component @model={{@context}} @outlet={{@outlet}} />)', {
    strictMode: true,
  }),
  templateOnly()
);

class WrapperRouteManager extends ClassicRouteManager {
  getRouteWrapper(): object {
    return WrapOutlet;
  }
}

class WrappedRoute extends Route {}
setRouteManager((owner) => new WrapperRouteManager(owner), WrappedRoute);

moduleFor(
  'GXT route manager wrappers',
  class extends ApplicationTestCase {
    async ['@test a wrapped route renders the new model of its dynamic segment']() {
      this.add(
        'route:post',
        class extends WrappedRoute {
          model({ id }: { id: string }) {
            return { id };
          }
        }
      );
      this.add('template:application', precompileTemplate('app:{{outlet}}'));
      this.add('template:post', precompileTemplate('post:{{@model.id}}'));
      this.router.map(function (this: any) {
        this.route('post', { path: '/post/:id' });
      });

      await this.visit('/post/1');
      this.assertText('app:wrap(post:1)');

      await this.visit('/post/2');
      // the wrapper received the new model
      this.assertText('app:wrap(post:2)');

      await this.visit('/post/1');
      // and the first one again
      this.assertText('app:wrap(post:1)');
    }

    async ['@test a wrapped route template renders with its controller as this'](assert: any) {
      class IndexController extends Controller {
        @tracked count = 0;
        name = 'a';

        @action
        bump() {
          this.count++;
        }
      }
      this.add('controller:index', IndexController);
      this.add('route:index', class extends WrappedRoute {});
      this.add('template:application', precompileTemplate('app:{{outlet}}'));
      this.add(
        'template:index',
        precompileTemplate(
          '<button id="bump" {{on "click" this.bump}}>bump</button>{{this.name}}:{{this.count}}'
        )
      );

      await this.visit('/');
      this.assertText('app:wrap(bumpa:0)');

      runTask(() => (this.element!.querySelector('#bump') as HTMLButtonElement).click());
      // an action of the template updates the controller
      this.assertText('app:wrap(bumpa:1)');

      const controller = this.applicationInstance!.lookup('controller:index') as IndexController;
      assert.strictEqual(controller.count, 1, 'the action ran with the controller as this');

      runTask(() => set(controller, 'name', 'b'));
      // a controller property set with set() re-renders
      this.assertText('app:wrap(bumpb:1)');
    }

    async ['@test a wrapped route without a template renders the next level']() {
      this.add('route:parent', class extends WrappedRoute {});
      this.add('template:application', precompileTemplate('app:{{outlet}}'));
      this.add('template:parent.child', precompileTemplate('child'));
      this.router.map(function (this: any) {
        this.route('parent', function (this: any) {
          this.route('child');
        });
      });

      await this.visit('/parent/child');
      this.assertText('app:wrap(child)');

      await this.visit('/parent');
      // the child level tore down
      this.assertText('app:wrap()');
    }

    async ['@test a classic route template renders the next level with <@outlet />']() {
      this.add('template:application', precompileTemplate('app:<@outlet />'));
      this.add('template:index', precompileTemplate('index'));

      await this.visit('/');
      this.assertText('app:index');
    }
  }
);
