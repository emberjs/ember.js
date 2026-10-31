import Controller from '@ember/controller';
import { Component as EmberComponent } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';
import {
  moduleFor,
  ApplicationTestCase,
  getTextOf,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Application Lifecycle - Component Context (classic component)',
    class extends ApplicationTestCase {
      ['@test Components without a block should have the proper content'](assert) {
        expectClassicComponentDeprecation();

        this.add(
          'template:application',
          precompileTemplate(
            `
      <div id='wrapper'>{{my-component}}</div>
    `
          )
        );

        this.add(
          'controller:application',
          class extends Controller {
            text = 'outer';
          }
        );
        this.add(
          'component:my-component',
          class extends EmberComponent {
            didInsertElement() {
              this.element.innerHTML = 'Some text inserted';
            }
          }
        );

        return this.visit('/').then(() => {
          let text = getTextOf(this.element.querySelector('#wrapper'));
          assert.equal(text, 'Some text inserted', 'The component is composed correctly');
        });
      }

      ['@test properties of a component without a template should not collide with internal structures [DEPRECATED]'](
        assert
      ) {
        expectClassicComponentDeprecation();

        this.add(
          'template:application',
          precompileTemplate(
            `
      <div id='wrapper'>{{my-component data=this.foo}}</div>`
          )
        );

        this.add(
          'controller:application',
          class extends Controller {
            text = 'outer';
            foo = 'Some text inserted';
          }
        );
        this.add(
          'component:my-component',
          class extends EmberComponent {
            didInsertElement() {
              this.element.innerHTML = this.get('data');
            }
          }
        );

        return this.visit('/').then(() => {
          let text = getTextOf(this.element.querySelector('#wrapper'));
          assert.equal(text, 'Some text inserted', 'The component is composed correctly');
        });
      }

      ['@test attrs property of a component without a template should not collide with internal structures'](
        assert
      ) {
        expectClassicComponentDeprecation();

        this.add(
          'template:application',
          precompileTemplate(
            `
      <div id='wrapper'>{{my-component attrs=this.foo}}</div>
    `
          )
        );

        this.add(
          'controller:application',
          class extends Controller {
            text = 'outer';
            foo = 'Some text inserted';
          }
        );
        this.add(
          'component:my-component',
          class extends EmberComponent {
            didInsertElement() {
              this.element.innerHTML = this.get('attrs.attrs.value');
            }
          }
        );

        return this.visit('/').then(() => {
          let text = getTextOf(this.element.querySelector('#wrapper'));
          assert.equal(text, 'Some text inserted', 'The component is composed correctly');
        });
      }
    }
  );
}
