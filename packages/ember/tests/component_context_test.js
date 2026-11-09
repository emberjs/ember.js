import Controller from '@ember/controller';
import Component from '@glimmer/component';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { moduleFor, ApplicationTestCase, getTextOf } from 'internal-test-helpers';

moduleFor(
  'Application Lifecycle - Component Context',
  class extends ApplicationTestCase {
    ['@test Components with a block should have the proper content when a template is provided'](
      assert
    ) {
      this.add(
        'template:application',
        precompileTemplate(
          `
      <div id='wrapper'>
        {{#my-component}}{{this.text}}{{/my-component}}
      </div>
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
        setComponentTemplate(
          precompileTemplate(`{{this.text}}-{{yield}}`),
          class extends Component {
            text = 'inner';
          }
        )
      );

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'inner-outer', 'The component is composed correctly');
      });
    }

    ['@test Components with a block should yield the proper content without a template provided'](
      assert
    ) {
      this.add(
        'template:application',
        precompileTemplate(
          `
      <div id='wrapper'>
        {{#my-component}}{{this.text}}{{/my-component}}
      </div>
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
        class extends Component {
          text = 'inner';
        }
      );

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'outer', 'The component is composed correctly');
      });
    }
    ['@test Components without a block should have the proper content when a template is provided'](
      assert
    ) {
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
        setComponentTemplate(
          precompileTemplate('{{this.text}}'),
          class extends Component {
            text = 'inner';
          }
        )
      );

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'inner', 'The component is composed correctly');
      });
    }

    ['@test an argument called `data` should not collide with internal structures'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`<div id='wrapper'>{{my-component data=this.foo}}</div>`)
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
        setComponentTemplate(precompileTemplate('{{@data}}'), class extends Component {})
      );

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'Some text inserted', 'The component is composed correctly');
      });
    }

    ['@test an argument called `attrs` should not collide with internal structures'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`<div id='wrapper'>{{my-component attrs=this.foo}}</div>`)
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
        setComponentTemplate(precompileTemplate('{{@attrs}}'), class extends Component {})
      );

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'Some text inserted', 'The component is composed correctly');
      });
    }
  }
);
