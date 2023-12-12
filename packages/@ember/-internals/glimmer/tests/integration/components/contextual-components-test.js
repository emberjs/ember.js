import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, applyMixins, strip, runTask } from 'internal-test-helpers';

import { isEmpty } from '@ember/utils';
import { A as emberA } from '@ember/array';

import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: contextual components',
  class extends RenderingTestCase {
    ['@test renders with component helper']() {
      let expectedText = 'Hodi';

      this.registerComponent('-looked-up', {
        template: expectedText,
      });

      this.render('{{component (component "-looked-up")}}');

      this.assertText(expectedText);

      runTask(() => this.rerender());

      this.assertText(expectedText);
    }

    ['@test renders with component helper with invocation params, hash']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name'],
        }),
        template: '{{this.greeting}} {{this.name}}',
      });

      this.render(strip`
      {{component (component "-looked-up") "Hodari" greeting="Hodi"}}`);

      this.assertText('Hodi Hodari');

      runTask(() => this.rerender());

      this.assertText('Hodi Hodari');
    }

    ['@test GH#13742 keeps nested rest positional parameters if rendered with no positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

      this.render('{{component (component "-looked-up" this.model.greeting this.model.name)}}', {
        model: {
          greeting: 'Gabon ',
          name: 'Zack',
        },
      });

      this.assertText('Gabon Zack');

      runTask(() => this.rerender());

      this.assertText('Gabon Zack');

      runTask(() => this.context.set('model.greeting', 'Good morning '));

      this.assertText('Good morning Zack');

      runTask(() => this.context.set('model.name', 'Matthew'));

      this.assertText('Good morning Matthew');

      runTask(() => this.context.set('model', { greeting: 'Gabon ', name: 'Zack' }));

      this.assertText('Gabon Zack');
    }

    // Take a look at this one. Seems to pass even when currying isn't implemented.
    ['@test overwrites nested rest positional parameters if rendered with positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

      this.render(
        '{{component (component "-looked-up" this.model.greeting this.model.name) this.model.name this.model.greeting}}',
        {
          model: {
            greeting: 'Gabon ',
            name: 'Zack ',
          },
        }
      );

      this.assertText('Gabon Zack Zack Gabon ');

      runTask(() => this.rerender());

      this.assertText('Gabon Zack Zack Gabon ');

      runTask(() => this.context.set('model.greeting', 'Good morning '));

      this.assertText('Good morning Zack Zack Good morning ');

      runTask(() => this.context.set('model.name', 'Matthew '));

      this.assertText('Good morning Matthew Matthew Good morning ');

      runTask(() => this.context.set('model', { greeting: 'Gabon ', name: 'Zack ' }));

      this.assertText('Gabon Zack Zack Gabon ');
    }

    ['@test GH#13742  keeps nested rest positional parameters if nested and rendered with no positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

      this.render(
        '{{component (component (component "-looked-up" this.model.greeting this.model.name))}}',
        {
          model: {
            greeting: 'Gabon ',
            name: 'Zack',
          },
        }
      );

      this.assertText('Gabon Zack');

      runTask(() => this.rerender());

      this.assertText('Gabon Zack');

      runTask(() => this.context.set('model.greeting', 'Good morning '));

      this.assertText('Good morning Zack');

      runTask(() => this.context.set('model.name', 'Matthew'));

      this.assertText('Good morning Matthew');

      runTask(() => this.context.set('model', { greeting: 'Gabon ', name: 'Zack' }));

      this.assertText('Gabon Zack');
    }

    ['@test overwrites nested rest positional parameters if nested with new pos params and rendered with no positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

      this.render(
        '{{component (component (component "-looked-up" this.model.greeting this.model.name) this.model.name this.model.greeting)}}',
        {
          model: {
            greeting: 'Gabon ',
            name: 'Zack ',
          },
        }
      );

      this.assertText('Gabon Zack Zack Gabon ');

      runTask(() => this.rerender());

      this.assertText('Gabon Zack Zack Gabon ');

      runTask(() => this.context.set('model.greeting', 'Good morning '));

      this.assertText('Good morning Zack Zack Good morning ');

      runTask(() => this.context.set('model.name', 'Matthew '));

      this.assertText('Good morning Matthew Matthew Good morning ');

      runTask(() => this.context.set('model', { greeting: 'Gabon ', name: 'Zack ' }));

      this.assertText('Gabon Zack Zack Gabon ');
    }

    ['@test renders with component helper with curried params, hash']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name'],
        }),
        template: '{{this.greeting}} {{this.name}}',
      });

      this.render(strip`
      {{component (component "-looked-up" "Hodari" greeting="Hodi")
                  greeting="Hola"}}`);

      this.assertText('Hola Hodari');

      runTask(() => this.rerender());

      this.assertText('Hola Hodari');
    }

    ['@test updates when component path is bound']() {
      this.registerComponent('-mandarin', {
        template: 'ni hao',
      });

      this.registerComponent('-hindi', {
        template: 'Namaste',
      });

      this.render('{{component (component this.model.lookupComponent)}}', {
        model: {
          lookupComponent: '-mandarin',
        },
      });

      this.assertText('ni hao');

      runTask(() => this.rerender());

      this.assertText('ni hao');

      runTask(() => this.context.set('model.lookupComponent', '-hindi'));

      this.assertText('Namaste');

      runTask(() => this.context.set('model', { lookupComponent: '-mandarin' }));

      this.assertText('ni hao');
    }

    ['@test updates when curried hash argument is bound']() {
      this.registerComponent('-looked-up', {
        template: '{{this.greeting}}',
      });

      this.render(`{{component (component "-looked-up" greeting=this.model.greeting)}}`, {
        model: {
          greeting: 'Hodi',
        },
      });

      this.assertText('Hodi');

      runTask(() => this.rerender());

      this.assertText('Hodi');

      runTask(() => this.context.set('model.greeting', 'Hola'));

      this.assertText('Hola');

      runTask(() => this.context.set('model', { greeting: 'Hodi' }));

      this.assertText('Hodi');
    }

    ['@test updates when curried hash arguments is bound in block form']() {
      this.registerComponent('-looked-up', {
        template: '{{this.greeting}}',
      });

      this.render(
        strip`
      {{#let (hash comp=(component "-looked-up" greeting=this.model.greeting)) as |my|}}
        {{#my.comp}}{{/my.comp}}
      {{/let}}`,
        {
          model: {
            greeting: 'Hodi',
          },
        }
      );

      this.assertText('Hodi');

      runTask(() => this.rerender());

      this.assertText('Hodi');

      runTask(() => this.context.set('model.greeting', 'Hola'));

      this.assertText('Hola');

      runTask(() => this.context.set('model', { greeting: 'Hodi' }));

      this.assertText('Hodi');
    }

    ['@test nested components do not overwrite positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
        template: '{{this.name}} {{this.age}}',
      });

      this.render(
        '{{component (component (component "-looked-up" "Sergio" 29) "Marvin" 21) "Hodari"}}'
      );

      this.assertText('Sergio 29');

      runTask(() => this.rerender());

      this.assertText('Sergio 29');
    }

    ['@test positional parameters are combined not clobbered']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['greeting', 'name', 'age'],
        }),
        template: '{{this.greeting}} {{this.name}} {{this.age}}',
      });

      this.render('{{component (component (component "-looked-up" "Hi") "Max") 9}}');

      this.assertText('Hi Max 9');

      runTask(() => this.rerender());

      this.assertText('Hi Max 9');
    }

    ['@test nested components overwrite hash parameters']() {
      this.registerComponent('-looked-up', {
        template: '{{this.greeting}} {{this.name}} {{this.age}}',
      });

      this.render(
        strip`
      {{#let (component "-looked-up" greeting="Hola" name="Dolores" age=33) as |first|}}
        {{#let (component first greeting="Hej" name="Sigmundur") as |second|}}
          {{component second greeting=this.model.greeting}}
        {{/let}}
      {{/let}}`,
        {
          model: {
            greeting: 'Hodi',
          },
        }
      );

      this.assertText('Hodi Sigmundur 33');

      runTask(() => this.rerender());

      this.assertText('Hodi Sigmundur 33');

      runTask(() => this.context.set('model.greeting', 'Kaixo'));

      this.assertText('Kaixo Sigmundur 33');

      runTask(() => this.context.set('model', { greeting: 'Hodi' }));

      this.assertText('Hodi Sigmundur 33');
    }

    ['@test bound outer named parameters get updated in the right scope']() {
      this.registerComponent('-inner-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['comp'],
        }),
        template: '{{component this.comp "Inner"}}',
      });

      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
        template: '{{this.name}} {{this.age}}',
      });

      this.render(
        '{{component "-inner-component" (component "-looked-up" this.model.outerName this.model.outerAge)}}',
        {
          model: {
            outerName: 'Outer',
            outerAge: 28,
          },
        }
      );

      this.assertText('Outer 28');

      runTask(() => this.rerender());

      this.assertText('Outer 28');

      runTask(() => this.context.set('model.outerAge', 29));

      this.assertText('Outer 29');

      runTask(() => this.context.set('model.outerName', 'Not outer'));

      this.assertText('Not outer 29');

      runTask(() => {
        this.context.set('model', {
          outerName: 'Outer',
          outerAge: 28,
        });
      });

      this.assertText('Outer 28');
    }

    ['@test bound outer hash parameters get updated in the right scope']() {
      this.registerComponent('-inner-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['comp'],
        }),
        template: '{{component this.comp name="Inner"}}',
      });

      this.registerComponent('-looked-up', {
        template: '{{this.name}} {{this.age}}',
      });

      this.render(
        '{{component "-inner-component" (component "-looked-up" name=this.model.outerName age=this.model.outerAge)}}',
        {
          model: {
            outerName: 'Outer',
            outerAge: 28,
          },
        }
      );

      this.assertText('Inner 28');

      runTask(() => this.rerender());

      this.assertText('Inner 28');

      runTask(() => this.context.set('model.outerAge', 29));

      this.assertText('Inner 29');

      runTask(() => this.context.set('model.outerName', 'Not outer'));

      this.assertText('Inner 29');

      runTask(() => {
        this.context.set('model', {
          outerName: 'Outer',
          outerAge: 28,
        });
      });

      this.assertText('Inner 28');
    }

    ['@test conflicting positional and hash parameters does not raise an assertion if rerendered']() {
      // In some cases, rerendering with a positional param used to cause an
      // assertion. This test checks it does not.
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name'],
        }),
        template: '{{this.greeting}} {{this.name}}',
      });

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

    ['@test component with dynamic component name resolving to undefined, then an existing component']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component (component this.componentName name=this.name)}}', {
        componentName: undefined,
        name: 'Alex',
      });

      this.assertText('');

      runTask(() => this.rerender());

      this.assertText('');

      runTask(() => this.context.set('componentName', 'foo-bar'));

      this.assertText('hello Alex');

      runTask(() => this.context.set('componentName', undefined));

      this.assertText('');
    }

    ['@test component with dynamic component name resolving to a component, then undefined']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component (component this.componentName name=this.name)}}', {
        componentName: 'foo-bar',
        name: 'Alex',
      });

      this.assertText('hello Alex');

      runTask(() => this.rerender());

      this.assertText('hello Alex');

      runTask(() => this.context.set('componentName', undefined));

      this.assertText('');

      runTask(() => this.context.set('componentName', 'foo-bar'));

      this.assertText('hello Alex');
    }

    ['@test component with dynamic component name resolving to null, then an existing component']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component (component this.componentName name=this.name)}}', {
        componentName: null,
        name: 'Alex',
      });

      this.assertText('');

      runTask(() => this.rerender());

      this.assertText('');

      runTask(() => this.context.set('componentName', 'foo-bar'));

      this.assertText('hello Alex');

      runTask(() => this.context.set('componentName', null));

      this.assertText('');
    }

    ['@test component with dynamic component name resolving to a component, then null']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component (component this.componentName name=this.name)}}', {
        componentName: 'foo-bar',
        name: 'Alex',
      });

      this.assertText('hello Alex');

      runTask(() => this.rerender());

      this.assertText('hello Alex');

      runTask(() => this.context.set('componentName', null));

      this.assertText('');

      runTask(() => this.context.set('componentName', 'foo-bar'));

      this.assertText('hello Alex');
    }

    ['@test raises an assertion when component path is not a component name (static)'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        this.render('{{component (component "not-a-component")}}');
      }, 'Could not find component named "not-a-component" (no component or template with that name was found)');
    }

    ['@test raises an assertion when component path is not a component name (dynamic)'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        this.render('{{component (component this.compName)}}', {
          compName: 'not-a-component',
        });
      }, 'Could not find component named "not-a-component" (no component or template with that name was found)');
    }

    ['@test renders with dot path']() {
      let expectedText = 'Hodi';
      this.registerComponent('-looked-up', {
        template: expectedText,
      });

      this.render(strip`
      {{#let (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup}}
      {{/let}}`);

      this.assertText(expectedText);

      runTask(() => this.rerender());

      this.assertText(expectedText);
    }

    ['@test renders with dot path and attr']() {
      let expectedText = 'Hodi';
      this.registerComponent('-looked-up', {
        template: '{{this.expectedText}}',
      });

      this.render(
        strip`
      {{#let (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup expectedText=this.model.expectedText}}
      {{/let}}`,
        {
          model: {
            expectedText,
          },
        }
      );

      this.assertText(expectedText);

      runTask(() => this.rerender());

      this.assertText(expectedText);

      runTask(() => this.context.set('model.expectedText', 'Hola'));

      this.assertText('Hola');

      runTask(() => this.context.set('model', { expectedText }));

      this.assertText(expectedText);
    }

    ['@test renders with dot path and curried over attr']() {
      let expectedText = 'Hodi';
      this.registerComponent('-looked-up', {
        template: '{{this.expectedText}}',
      });

      this.render(
        strip`
      {{#let (hash lookedup=(component "-looked-up" expectedText=this.model.expectedText)) as |object|}}
        {{object.lookedup}}
      {{/let}}`,
        {
          model: {
            expectedText,
          },
        }
      );

      this.assertText(expectedText);

      runTask(() => this.rerender());

      this.assertText(expectedText);

      runTask(() => this.context.set('model.expectedText', 'Hola'));

      this.assertText('Hola');

      runTask(() => this.context.set('model', { expectedText }));

      this.assertText(expectedText);
    }

    ['@test renders with dot path and with rest positional parameters']() {
      this.registerComponent('-looked-up', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{this.params}}',
      });

      let expectedText = 'Hodi';

      this.render(
        strip`
      {{#let (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup this.model.expectedText "Hola"}}
      {{/let}}`,
        {
          model: {
            expectedText,
          },
        }
      );

      this.assertText(`${expectedText},Hola`);

      runTask(() => this.rerender());

      this.assertText(`${expectedText},Hola`);

      runTask(() => this.context.set('model.expectedText', 'Kaixo'));

      this.assertText('Kaixo,Hola');

      runTask(() => this.context.set('model', { expectedText }));

      this.assertText(`${expectedText},Hola`);
    }

    ['@test renders with dot path and rest parameter does not leak'](assert) {
      // In the original implementation, positional parameters were not handled
      // correctly causing the first positional parameter to be the contextual
      // component itself.
      let value = false;

      this.registerComponent('my-component', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            value = this.getAttr('value');
          },
        }).reopenClass({
          positionalParams: ['value'],
        }),
      });

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
      this.registerComponent('my-nested-component', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            this.set('myProp', this.getAttr('my-parent-attr'));
          },
        }),
        template: '<span id="nested-prop">{{this.myProp}}</span>',
      });

      this.registerComponent('my-component', {
        template:
          '{{yield (hash my-nested-component=(component "my-nested-component" my-parent-attr=this.my-attr))}}',
      });

      this.registerComponent('my-action-component', {
        ComponentClass: Component.extend({
          actions: {
            changeValue() {
              this.incrementProperty('myProp');
            },
          },
        }),
        template: strip`
        {{#my-component my-attr=this.myProp as |api|}}
          {{api.my-nested-component}}
        {{/my-component}}
        <br>
        <button onclick={{action 'changeValue'}}>Change value</button>`,
      });

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

    ["@test adding parameters to a contextual component's instance does not add it to other instances"]() {
      // If parameters and attributes are not handled correctly, setting a value
      // in an invokation can leak to others invocation.
      this.registerComponent('select-box', {
        template: '{{yield (hash option=(component "select-box-option"))}}',
      });

      this.registerComponent('select-box-option', {
        template: '{{this.label}}',
      });

      this.render(strip`
      {{#select-box as |sb|}}
        {{sb.option label="Foo"}}
        {{sb.option}}
      {{/select-box}}`);

      this.assertText('Foo');

      runTask(() => this.rerender());

      this.assertText('Foo');
    }

    ['@test parameters in a contextual component are mutable when value is a param'](assert) {
      // This checks that a `(mut)` is added to parameters and attributes to
      // contextual components when it is a param.

      this.registerComponent('change-button', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['val'],
        }),
        template: strip`
        <button {{action (action (mut this.val) 10)}} class="my-button">
          Change to 10
        </button>`,
      });

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
      this.registerComponent('my-comp', {
        ComponentClass: Component.extend({ tagName: '' }),
      });

      this.render(`{{my-comp}}`);

      runTask(() => this.rerender());

      assert.equal(this.$().text(), '');
    }

    ['@test GH#13494 tagless blockless component with property binding'](assert) {
      this.registerComponent('outer-component', {
        ComponentClass: Component.extend({
          message: 'hello',
          actions: {
            change() {
              this.set('message', 'goodbye');
            },
          },
        }),
        template: strip`
        message: {{this.message}}{{inner-component message=this.message}}
        <button onclick={{action "change"}} />`,
      });

      this.registerComponent('inner-component', {
        ComponentClass: Component.extend({
          tagName: '',
        }),
      });

      this.render(`{{outer-component}}`);

      assert.equal(this.$().text(), 'message: hello');

      runTask(() => this.rerender());

      assert.equal(this.$().text(), 'message: hello');

      runTask(() => this.$('button').click());

      assert.equal(this.$().text(), 'message: goodbye');

      runTask(() => this.rerender());

      assert.equal(this.$().text(), 'message: goodbye');
    }

    ['@test GH#13982 contextual component ref is stable even when bound params change'](assert) {
      let instance, previousInstance;
      let initCount = 0;

      this.registerComponent('my-comp', {
        ComponentClass: Component.extend({
          init() {
            this._super();
            previousInstance = instance;
            instance = this;
            initCount++;
          },
          isOpen: undefined,
        }),
        template: '{{if this.isOpen "open" "closed"}}',
      });

      this.render(
        strip`
      {{#let (hash ctxCmp=(component "my-comp" isOpen=this.isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/let}}
    `,
        {
          isOpen: true,
        }
      );

      assert.ok(!isEmpty(instance), 'a instance was created');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.rerender());

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.context.set('isOpen', false));

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.rerender());

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.context.set('isOpen', true));

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');
    }

    ['@test GH#13982 contextual component ref is stable even when bound params change (bound name param)'](
      assert
    ) {
      let instance, previousInstance;
      let initCount = 0;

      this.registerComponent('my-comp', {
        ComponentClass: Component.extend({
          init() {
            this._super();
            previousInstance = instance;
            instance = this;
            initCount++;
          },
          isOpen: undefined,
        }),
        template: '{{if this.isOpen "open" "closed"}}',
      });

      this.render(
        strip`
      {{#let (hash ctxCmp=(component this.compName isOpen=this.isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/let}}
    `,
        {
          compName: 'my-comp',
          isOpen: true,
        }
      );

      assert.ok(!isEmpty(instance), 'a instance was created');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.rerender());

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.context.set('isOpen', false));

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.rerender());

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.context.set('isOpen', true));

      assert.ok(!isEmpty(instance), 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');
    }

    ['@test GH#13982 contextual component ref is recomputed when component name param changes'](
      assert
    ) {
      let instance, previousInstance;
      let initCount = 0;

      this.registerComponent('my-comp', {
        ComponentClass: Component.extend({
          init() {
            this._super();
            previousInstance = instance;
            instance = this;
            initCount++;
          },
          isOpen: undefined,
        }),
        template: 'my-comp: {{if this.isOpen "open" "closed"}}',
      });

      this.registerComponent('your-comp', {
        ComponentClass: Component.extend({
          init() {
            this._super();
            previousInstance = instance;
            instance = this;
            initCount++;
          },
          isOpen: undefined,
        }),
        template: 'your-comp: {{if this.isOpen "open" "closed"}}',
      });

      this.render(
        strip`
      {{#let (hash ctxCmp=(component this.compName isOpen=this.isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/let}}
    `,
        {
          compName: 'my-comp',
          isOpen: true,
        }
      );

      assert.ok(!isEmpty(instance), 'a instance was created');
      assert.equal(previousInstance, undefined, 'there is no previous instance');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'my-comp: open');

      runTask(() => this.rerender());

      assert.ok(!isEmpty(instance), 'a instance exists after rerender');
      assert.equal(previousInstance, undefined, 'there is no previous instance after rerender');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'my-comp: open');

      runTask(() => this.context.set('compName', 'your-comp'));

      assert.ok(!isEmpty(instance), 'an instance was created after component name changed');
      assert.ok(!isEmpty(previousInstance), 'a previous instance now exists');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object'
      );
      assert.equal(initCount, 2, 'the component was constructed exactly 2 times');
      assert.equal(this.$().text(), 'your-comp: open');

      runTask(() => this.rerender());

      assert.ok(
        !isEmpty(instance),
        'an instance was created after component name changed (rerender)'
      );
      assert.ok(!isEmpty(previousInstance), 'a previous instance now exists (rerender)');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object (rerender)'
      );
      assert.equal(initCount, 2, 'the component was constructed exactly 2 times (rerender)');
      assert.equal(this.$().text(), 'your-comp: open');

      runTask(() => this.context.set('compName', 'my-comp'));

      assert.ok(!isEmpty(instance), 'an instance was created after component name changed');
      assert.ok(!isEmpty(previousInstance), 'a previous instance still exists');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object'
      );
      assert.equal(initCount, 3, 'the component was constructed exactly 3 times (rerender)');
      assert.equal(this.$().text(), 'my-comp: open');
    }

    ['@test GH#14508 rest positional params are received when passed as named parameter']() {
      this.registerComponent('my-link', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

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
      this.registerComponent('my-link', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: '{{#each this.params as |p|}}{{p}}{{/each}}',
      });

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

    ['@test it can invoke input component']() {
      this.render('{{component (component "input" type="text" value=this.value)}}', {
        value: 'foo',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: {
          class: 'ember-text-field ember-view',
          type: 'text',
        },
      });

      this.assert.strictEqual('foo', this.firstChild.value);

      this.assertStableRerender();

      runTask(() => this.context.set('value', 'bar'));

      this.assert.strictEqual('bar', this.firstChild.value);

      runTask(() => this.context.set('value', 'foo'));

      this.assert.strictEqual('foo', this.firstChild.value);
    }

    ['@test it can invoke textarea component']() {
      this.render('{{component (component "textarea" value=this.value)}}', {
        value: 'foo',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'textarea',
        attrs: {
          class: 'ember-text-area ember-view',
        },
      });

      this.assert.strictEqual('foo', this.firstChild.value);

      this.assertStableRerender();

      runTask(() => this.context.set('value', 'bar'));

      this.assert.strictEqual('bar', this.firstChild.value);

      runTask(() => this.context.set('value', 'foo'));

      this.assert.strictEqual('foo', this.firstChild.value);
    }

    ['@test GH#17121 local variable should win over helper (without arguments)']() {
      this.registerHelper('foo', () => 'foo helper');

      this.registerComponent('foo-bar', { template: 'foo-bar component' });

      this.render(strip`
        {{#let (component 'foo-bar') as |foo|}}
          {{foo}}
        {{/let}}
      `);

      this.assertText('foo-bar component');

      this.assertStableRerender();
    }

    ['@test GH#17121 local variable should win over helper (with arguments)']() {
      this.registerHelper('foo', (params) => `foo helper: ${params.join(' ')}`);

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: 'foo-bar component:{{#each this.params as |param|}} {{param}}{{/each}}',
      });

      this.render(strip`
        {{#let (component 'foo-bar') as |foo|}}
          {{foo 1 2 3}}
        {{/let}}
      `);

      this.assertText('foo-bar component: 1 2 3');

      this.assertStableRerender();
    }

    ['@test RFC#311 invoking named args (without arguments)']() {
      this.registerComponent('x-outer', { template: '{{@inner}}' });
      this.registerComponent('x-inner', { template: 'inner' });

      this.render('{{x-outer inner=(component "x-inner")}}');

      this.assertText('inner');

      this.assertStableRerender();
    }

    ['@test RFC#311 invoking named args (with arguments)']() {
      this.registerComponent('x-outer', { template: '{{@inner 1 2 3}}' });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'params',
        }),
        template: 'inner:{{#each this.params as |param|}} {{param}}{{/each}}',
      });

      this.render('{{x-outer inner=(component "x-inner")}}');

      this.assertText('inner: 1 2 3');

      this.assertStableRerender();
    }

    ['@test RFC#311 invoking named args (with a block)']() {
      this.registerComponent('x-outer', { template: '{{#@inner}}outer{{/@inner}}' });
      this.registerComponent('x-inner', { template: 'inner {{yield}}' });

      this.render('{{x-outer inner=(component "x-inner")}}');

      this.assertText('inner outer');

      this.assertStableRerender();
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked within mustaches']() {
      this.registerComponent('component-with-has-block', {
        ComponentClass: Component.extend(),
        template: '<div>{{(has-block)}}</div>',
      });

      this.registerComponent('yielding-component', {
        ComponentClass: Component.extend(),
        template: '{{yield (component "component-with-has-block")}}',
      });

      this.registerComponent('test-component', {
        ComponentClass: Component.extend(),
        template:
          '{{#yielding-component as |componentWithHasBlock|}}{{componentWithHasBlock}}{{/yielding-component}}',
      });

      this.render('{{test-component}}');

      this.assertText('false');
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked with angle bracket invocation (falsy)']() {
      this.registerComponent('component-with-has-block', {
        ComponentClass: Component.extend(),
        template: '<div>{{(has-block)}}</div>',
      });

      this.registerComponent('yielding-component', {
        ComponentClass: Component.extend(),
        template: '{{yield (component "component-with-has-block")}}',
      });

      this.registerComponent('test-component', {
        ComponentClass: Component.extend(),
        template:
          '{{#yielding-component as |componentWithHasBlock|}}<componentWithHasBlock/>{{/yielding-component}}',
      });

      this.render('{{test-component}}');

      this.assertText('false');
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked with angle bracket invocation (truthy)']() {
      this.registerComponent('component-with-has-block', {
        ComponentClass: Component.extend(),
        template: '<div>{{(has-block)}}</div>',
      });

      this.registerComponent('yielding-component', {
        ComponentClass: Component.extend(),
        template: '{{yield (component "component-with-has-block")}}',
      });

      this.registerComponent('test-component', {
        ComponentClass: Component.extend(),
        template:
          '{{#yielding-component as |componentWithHasBlock|}}<componentWithHasBlock></componentWithHasBlock>{{/yielding-component}}',
      });

      this.render('{{test-component}}');

      this.assertText('true');
    }
  }
);

class ContextualComponentMutableParamsTest extends RenderingTestCase {
  render(templateStr, context = {}) {
    super.render(
      `${templateStr}<span class="value">{{this.model.val2}}</span>`,
      Object.assign(context, { model: { val2: 8 } })
    );
  }
}

class MutableParamTestGenerator {
  constructor(cases) {
    this.cases = cases;
  }

  generate({ title, setup }) {
    return {
      [`@test parameters in a contextual component are mutable when value is a ${title}`](assert) {
        this.registerComponent('change-button', {
          ComponentClass: Component.extend().reopenClass({
            positionalParams: ['val'],
          }),
          template: strip`
          <button {{action (action (mut this.val) 10)}} class="my-button">
            Change to 10
          </button>`,
        });

        setup.call(this, assert);

        assert.equal(this.$('.value').text(), '8');

        runTask(() => this.rerender());

        assert.equal(this.$('.value').text(), '8');

        runTask(() => this.$('.my-button').click());

        assert.equal(this.$('.value').text(), '10');

        runTask(() => this.context.set('model', { val2: 8 }));

        assert.equal(this.$('.value').text(), '8');
      },
    };
  }
}

applyMixins(
  ContextualComponentMutableParamsTest,
  new MutableParamTestGenerator([
    {
      title: 'param',
      setup() {
        this.render('{{component (component "change-button" this.model.val2)}}');
      },
    },

    {
      title: 'nested param',
      setup() {
        this.registerComponent('my-comp', {
          ComponentClass: Component.extend().reopenClass({
            positionalParams: ['components'],
          }),
          template: '{{component this.components.comp}}',
        });

        this.render('{{my-comp (hash comp=(component "change-button" this.model.val2))}}');
      },
    },

    {
      title: 'hash value',
      setup() {
        this.registerComponent('my-comp', {
          template: '{{component this.component}}',
        });

        this.render('{{my-comp component=(component "change-button" val=this.model.val2)}}');
      },
    },

    {
      title: 'nested hash value',
      setup() {
        this.registerComponent('my-comp', {
          template: '{{component this.components.button}}',
        });

        this.render(
          '{{my-comp components=(hash button=(component "change-button" val=this.model.val2))}}'
        );
      },
    },
  ])
);

moduleFor(
  'Components test: contextual components -- mutable params',
  ContextualComponentMutableParamsTest
);
