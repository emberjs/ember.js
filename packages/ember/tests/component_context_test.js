import { Controller } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('Application Lifecycle - Component Context', class extends ApplicationTestCase {
  ['@test Components with a block should have the proper content when a template is provided'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>
        {{#my-component}}{{text}}{{/my-component}}
      </div>
    `);

    this.add('controller:application', Controller.extend({
      'text': 'outer'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        text: 'inner'
      }),
      template: `{{text}}-{{yield}}`
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim();
      assert.equal(text, 'inner-outer', 'The component is composed correctly');
    });
  }

  ['@test Components with a block should yield the proper content without a template provided'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>
        {{#my-component}}{{text}}{{/my-component}}
      </div>
    `);

    this.add('controller:application', Controller.extend({
      'text': 'outer'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        text: 'inner'
      })
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim()
      assert.equal(text, 'outer', 'The component is composed correctly');
    });
  }
  ['@test Components without a block should have the proper content when a template is provided'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>{{my-component}}</div>
    `);

    this.add('controller:application', Controller.extend({
      'text': 'outer'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        text: 'inner'
      }),
      template: '{{text}}'
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim();
      assert.equal(text, 'inner', 'The component is composed correctly');
    });
  }

  ['@test Components without a block should have the proper content'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>{{my-component}}</div>
    `);

    this.add('controller:application', Controller.extend({
      'text': 'outer'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        didInsertElement() {
          this.$().html('Some text inserted by jQuery');
        }
      })
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim();
      assert.equal(text, 'Some text inserted by jQuery', 'The component is composed correctly');
    });
  }

  ['@test properties of a component without a template should not collide with internal structures [DEPRECATED]'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>{{my-component data=foo}}</div>`
    );

    this.add('controller:application', Controller.extend({
      'text': 'outer',
      'foo': 'Some text inserted by jQuery'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        didInsertElement() {
          this.$().html(this.get('data'));
        }
      })
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim();
      assert.equal(text, 'Some text inserted by jQuery', 'The component is composed correctly');
    });
  }

  ['@test attrs property of a component without a template should not collide with internal structures'](assert) {
    this.addTemplate('application', `
      <div id='wrapper'>{{my-component attrs=foo}}</div>
    `);

    this.add('controller:application', Controller.extend({
      'text': 'outer',
      'foo': 'Some text inserted by jQuery'
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        didInsertElement() {
          // FIXME: I'm unsure if this is even the right way to access attrs
          this.$().html(this.get('attrs.attrs.value'));
        }
      })
    });

    this.visit('/').then(() => {
      let text = this.$('#wrapper').text().trim();
      assert.equal(text, 'Some text inserted by jQuery', 'The component is composed correctly');
    });
  }

  ['@test Components trigger actions in the parents context when called from within a block']() {
    this.addTemplate('application', `
      <div id='wrapper'>
        {{#my-component}}
          <a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>
        {{/my-component}}
      </div>
    `);

    this.add('controller:application', Controller.extend({
      actions: {
        fizzbuzz() {
          ok(true, 'action triggered on parent');
        }
      }
    }));
    this.addComponent('my-component', { ComponentClass: Component.extend({}) });

    this.visit('/').then(() => {
      this.$('#fizzbuzz', '#wrapper').click();
    });
  }

  ['@test Components trigger actions in the components context when called from within its template']() {
    this.addTemplate('application', `
      <div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>
    `);

    this.add('controller:application', Controller.extend({
      actions: {
        fizzbuzz() {
          ok(false, 'action on the wrong context');
        }
      }
    }));
    this.addComponent('my-component', {
      ComponentClass: Component.extend({
        actions: {
          fizzbuzz() {
            ok(true, 'action triggered on component');
          }
        }
      }),
      template: `<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>`
    });

    this.visit('/').then(() => {
      this.$('#fizzbuzz', '#wrapper').click();
    });
  }
});
