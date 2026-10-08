import { moduleFor, RenderingTestCase, applyMixins, strip, runTask } from 'internal-test-helpers';
import { action } from '@ember/object';
import { A as emberA } from '@ember/array';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { Component as EmberComponent } from '../../../utils/helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  'Components test: contextual components (classic component)',
  class extends RenderingTestCase {
    ['@test conflicting positional and hash parameters does not raise an assertion if rerendered']() {
      // In some cases, rerendering with a positional param used to cause an
      // assertion. This test checks it does not.
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(
          precompileTemplate('{{this.greeting}} {{this.name}}'),
          class extends EmberComponent {
            static positionalParams = ['name'];
          }
        )
      );

      this.render('{{component (component "-looked-up" this.model.name greeting="Hodi")}}', {
        model: {
          name: 'Hodari',
        },
      });

      this.assertText('Hodi Hodari');

      runTask(() => this.rerender());

      this.assertText('Hodi Hodari');

      runTask(() => this.context.set('model.name', 'Sergio'));

      this.assertText('Hodi Sergio');

      runTask(() => this.context.set('model', { name: 'Hodari' }));

      this.assertText('Hodi Hodari');
    }

    ['@test renders with dot path and rest parameter does not leak'](assert) {
      // In the original implementation, positional parameters were not handled
      // correctly causing the first positional parameter to be the contextual
      // component itself.
      let value = false;

      this.owner.register(
        'component:my-component',
        class extends EmberComponent {
          static positionalParams = ['value'];

          didReceiveAttrs() {
            value = this.getAttr('value');
          }
        }
      );

      this.render(
        strip`
      {{#let (hash my-component=(component 'my-component' this.first)) as |c|}}
        {{c.my-component}}
      {{/let}}`,
        { first: 'first' }
      );

      assert.equal(value, 'first', 'value is the expected parameter');
    }

    ['@test renders with dot path and updates attributes'](assert) {
      this.owner.register(
        'component:my-nested-component',
        setComponentTemplate(
          precompileTemplate('<span id="nested-prop">{{this.myProp}}</span>'),
          class extends EmberComponent {
            static positionalParams = ['my-parent-attr'];

            didReceiveAttrs() {
              this.set('myProp', this.getAttr('my-parent-attr'));
            }
          }
        )
      );

      this.owner.register(
        'component:my-component',
        setComponentTemplate(
          precompileTemplate(
            '{{yield (hash my-nested-component=(component "my-nested-component" my-parent-attr=@my-attr))}}'
          ),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:my-action-component',
        setComponentTemplate(
          precompileTemplate(
            '{{#my-component my-attr=this.myProp as |api|}}{{api.my-nested-component}}{{/my-component}}<br><button onclick={{this.changeValue}}>Change value</button>'
          ),
          class extends EmberComponent {
            @action
            changeValue() {
              this.incrementProperty('myProp');
            }
          }
        )
      );

      this.render('{{my-action-component myProp=this.model.myProp}}', {
        model: {
          myProp: 1,
        },
      });

      assert.equal(this.$('#nested-prop').text(), '1');

      runTask(() => this.rerender());

      assert.equal(this.$('#nested-prop').text(), '1');

      runTask(() => this.$('button').click());

      assert.equal(this.$('#nested-prop').text(), '2');

      runTask(() => this.$('button').click());

      assert.equal(this.$('#nested-prop').text(), '3');

      runTask(() => this.context.set('model', { myProp: 1 }));

      assert.equal(this.$('#nested-prop').text(), '1');
    }

    ['@test parameters in a contextual component are mutable when value is a param'](assert) {
      // This checks that a `(mut)` is added to parameters and attributes to
      // contextual components when it is a param.
      this.owner.register(
        'component:change-button',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" (fn (mut this.val) 10)}} class="my-button">Change to 10</button>'
          ),
          class extends EmberComponent {
            static positionalParams = ['val'];
          }
        )
      );

      this.render(
        strip`
      {{component (component "change-button" this.model.val2)}}
      <span class="value">{{this.model.val2}}</span>`,
        {
          model: {
            val2: 8,
          },
        }
      );

      assert.equal(this.$('.value').text(), '8');

      runTask(() => this.rerender());

      assert.equal(this.$('.value').text(), '8');

      runTask(() => this.$('.my-button').click());

      assert.equal(this.$('.value').text(), '10');

      runTask(() => this.context.set('model', { val2: 8 }));

      assert.equal(this.$('.value').text(), '8');
    }

    ['@test tagless blockless components render'](assert) {
      this.owner.register(
        'component:my-comp',
        class extends EmberComponent {
          tagName = '';
        }
      );

      this.render(`{{my-comp}}`);

      runTask(() => this.rerender());

      assert.equal(this.$().text(), '');
    }

    ['@test GH#13494 tagless blockless component with property binding'](assert) {
      this.owner.register(
        'component:outer-component',
        setComponentTemplate(
          precompileTemplate(
            'message: {{this.message}}{{inner-component message=this.message}}<button onclick={{this.change}} />'
          ),
          class extends Component {
            @tracked message = 'hello';
            @action
            change() {
              this.message = 'goodbye';
            }
          }
        )
      );

      this.owner.register(
        'component:inner-component',
        class extends EmberComponent {
          tagName = '';
        }
      );

      this.render(`{{outer-component}}`);

      assert.equal(this.$().text(), 'message: hello');

      runTask(() => this.rerender());

      assert.equal(this.$().text(), 'message: hello');

      runTask(() => this.$('button').click());

      assert.equal(this.$().text(), 'message: goodbye');

      runTask(() => this.rerender());

      assert.equal(this.$().text(), 'message: goodbye');
    }

    ['@test GH#14508 rest positional params are received when passed as named parameter']() {
      this.owner.register(
        'component:my-link',
        setComponentTemplate(
          precompileTemplate('{{#each this.params as |p|}}{{p}}{{/each}}'),
          class extends EmberComponent {
            positionalParams = 'params';
          }
        )
      );

      this.render('{{component (component "my-link") params=this.allParams}}', {
        allParams: emberA(['a', 'b']),
      });

      this.assertText('ab');

      runTask(() => this.rerender());

      this.assertText('ab');

      runTask(() => this.context.get('allParams').pushObject('c'));

      this.assertText('abc');

      runTask(() => this.context.get('allParams').popObject());

      this.assertText('ab');

      runTask(() => this.context.get('allParams').clear());

      this.assertText('');

      runTask(() => this.context.set('allParams', emberA(['1', '2'])));

      this.assertText('12');

      runTask(() => this.context.set('allParams', emberA(['a', 'b'])));

      this.assertText('ab');
    }

    ['@test GH#14508 rest positional params are received when passed as named parameter with dot notation']() {
      this.owner.register(
        'component:my-link',
        setComponentTemplate(
          precompileTemplate('{{#each this.params as |p|}}{{p}}{{/each}}'),
          class extends EmberComponent {
            positionalParams = 'params';
          }
        )
      );

      this.render(
        '{{#let (hash link=(component "my-link")) as |c|}}{{c.link params=this.allParams}}{{/let}}',
        {
          allParams: emberA(['a', 'b']),
        }
      );

      this.assertText('ab');

      runTask(() => this.rerender());

      this.assertText('ab');

      runTask(() => this.context.get('allParams').pushObject('c'));

      this.assertText('abc');

      runTask(() => this.context.get('allParams').popObject());

      this.assertText('ab');

      runTask(() => this.context.get('allParams').clear());

      this.assertText('');

      runTask(() => this.context.set('allParams', emberA(['1', '2'])));

      this.assertText('12');

      runTask(() => this.context.set('allParams', emberA(['a', 'b'])));

      this.assertText('ab');
    }

    '@test component helper can curry arguments'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(
            '1. [{{this.one}}]2. [{{this.two}}]3. [{{this.three}}]4. [{{this.four}}]5. [{{this.five}}]6. [{{this.six}}]{{yield}}a. [{{this.a}}]b. [{{this.b}}]c. [{{this.c}}]d. [{{this.d}}]e. [{{this.e}}]f. [{{this.f}}]'
          ),
          class extends EmberComponent {
            static positionalParams = ['one', 'two', 'three', 'four', 'five', 'six'];
          }
        )
      );

      this.render(strip`
        {{#let (component "foo-bar" "outer 1" "outer 2" a="outer a" b="outer b" c="outer c" e="outer e") as |outer|}}
          {{#let (component outer "inner 1" a="inner a" d="inner d" e="inner e") as |inner|}}
            {{#component inner "invocation 1" "invocation 2" a="invocation a" b="invocation b"}}---{{/component}}
          {{/let}}
        {{/let}}
      `);

      this.assertText(
        '1. [outer 1]2. [outer 2]3. [inner 1]4. [invocation 1]5. [invocation 2]6. []---a. [invocation a]b. [invocation b]c. [outer c]d. [inner d]e. [inner e]f. []'
      );
    }

    '@test component helper: currying works inline'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(
            '1. [{{this.one}}]2. [{{this.two}}]3. [{{this.three}}]4. [{{this.four}}]5. [{{this.five}}]6. [{{this.six}}]'
          ),
          class extends EmberComponent {
            static positionalParams = ['one', 'two', 'three', 'four', 'five', 'six'];
          }
        )
      );

      this.render(
        strip`
          {{component (component (component 'foo-bar' this.foo.first this.foo.second) 'inner 1') 'invocation 1' 'invocation 2'}}
        `,
        { foo: { first: 'outer 1', second: 'outer 2' } }
      );

      this.assertText(
        '1. [outer 1]2. [outer 2]3. [inner 1]4. [invocation 1]5. [invocation 2]6. []'
      );
    }
  }
);
