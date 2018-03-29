import { Controller } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import {
  moduleFor,
  ApplicationTestCase,
  getTextOf
} from 'internal-test-helpers';

moduleFor(
  'Application Lifecycle - Component Context',
  class extends ApplicationTestCase {
    ['@test Components with a block should have the proper content when a template is provided'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>
        {{#my-component}}{{text}}{{/my-component}}
      </div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          text: 'inner'
        }),
        template: `{{text}}-{{yield}}`
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(
          text,
          'inner-outer',
          'The component is composed correctly'
        );
      });
    }

    ['@test Components with a block should yield the proper content without a template provided'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>
        {{#my-component}}{{text}}{{/my-component}}
      </div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          text: 'inner'
        })
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'outer', 'The component is composed correctly');
      });
    }
    ['@test Components without a block should have the proper content when a template is provided'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>{{my-component}}</div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          text: 'inner'
        }),
        template: '{{text}}'
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(text, 'inner', 'The component is composed correctly');
      });
    }

    ['@test Components without a block should have the proper content'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>{{my-component}}</div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          didInsertElement() {
            this.element.innerHTML = 'Some text inserted';
          }
        })
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(
          text,
          'Some text inserted',
          'The component is composed correctly'
        );
      });
    }

    ['@test properties of a component without a template should not collide with internal structures [DEPRECATED]'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>{{my-component data=foo}}</div>`
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer',
          foo: 'Some text inserted'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          didInsertElement() {
            this.element.innerHTML = this.get('data');
          }
        })
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(
          text,
          'Some text inserted',
          'The component is composed correctly'
        );
      });
    }

    ['@test attrs property of a component without a template should not collide with internal structures'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>{{my-component attrs=foo}}</div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          text: 'outer',
          foo: 'Some text inserted'
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          didInsertElement() {
            this.element.innerHTML = this.get('attrs.attrs.value');
          }
        })
      });

      return this.visit('/').then(() => {
        let text = getTextOf(this.element.querySelector('#wrapper'));
        assert.equal(
          text,
          'Some text inserted',
          'The component is composed correctly'
        );
      });
    }

    ['@test Components trigger actions in the parents context when called from within a block'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>
        {{#my-component}}
          <a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>
        {{/my-component}}
      </div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          actions: {
            fizzbuzz() {
              assert.ok(true, 'action triggered on parent');
            }
          }
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({})
      });

      return this.visit('/').then(() => {
        this.$('#fizzbuzz', '#wrapper').click();
      });
    }

    ['@test Components trigger actions in the components context when called from within its template'](
      assert
    ) {
      this.addTemplate(
        'application',
        `
      <div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>
    `
      );

      this.add(
        'controller:application',
        Controller.extend({
          actions: {
            fizzbuzz() {
              assert.ok(false, 'action on the wrong context');
            }
          }
        })
      );
      this.addComponent('my-component', {
        ComponentClass: Component.extend({
          actions: {
            fizzbuzz() {
              assert.ok(true, 'action triggered on component');
            }
          }
        }),
        template: `<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>`
      });

      return this.visit('/').then(() => {
        this.$('#fizzbuzz', '#wrapper').click();
      });
    }
  }
);
