import { assign } from 'ember-utils';
import { Component } from '../../utils/helpers';
import { applyMixins, strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { isEmpty } from 'ember-metal';
import { A as emberA } from 'ember-runtime/system/native_array';

moduleFor('Components test: contextual components', class extends RenderingTest {
  ['@test renders with component helper']() {
    let expectedText = 'Hodi';

    this.registerComponent('-looked-up', {
      template: expectedText
    });

    this.render('{{component (component "-looked-up")}}');

    this.assertText(expectedText);

    this.runTask(() => this.rerender());

    this.assertText(expectedText);
  }

  ['@test renders with component helper with invocation params, hash']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name']
      }),
      template: '{{greeting}} {{name}}'
    });

    this.render(strip`
      {{component (component "-looked-up") "Hodari" greeting="Hodi"}}`
    );

    this.assertText('Hodi Hodari');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Hodari');
  }

  ['@test GH#13742 keeps nested rest positional parameters if rendered with no positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{component (component "-looked-up" model.greeting model.name)}}', {
      model: {
        greeting: 'Gabon ',
        name: 'Zack'
      }
    });

    this.assertText('Gabon Zack');

    this.runTask(() => this.rerender());

    this.assertText('Gabon Zack');

    this.runTask(() => this.context.set('model.greeting', 'Good morning '));

    this.assertText('Good morning Zack');

    this.runTask(() => this.context.set('model.name', 'Matthew'));

    this.assertText('Good morning Matthew');

    this.runTask(() => this.context.set('model',  { greeting: 'Gabon ', name: 'Zack' }));

    this.assertText('Gabon Zack');
  }

  ['@test overwrites nested rest positional parameters if rendered with positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{component (component "-looked-up" model.greeting model.name) model.name model.greeting}}', {
      model: {
        greeting: 'Gabon ',
        name: 'Zack '
      }
    });

    this.assertText('Gabon Zack Zack Gabon ');

    this.runTask(() => this.rerender());

    this.assertText('Gabon Zack Zack Gabon ');

    this.runTask(() => this.context.set('model.greeting', 'Good morning '));

    this.assertText('Good morning Zack Zack Good morning ');

    this.runTask(() => this.context.set('model.name', 'Matthew '));

    this.assertText('Good morning Matthew Matthew Good morning ');

    this.runTask(() => this.context.set('model',  { greeting: 'Gabon ', name: 'Zack ' }));

    this.assertText('Gabon Zack Zack Gabon ');
  }

  ['@test GH#13742  keeps nested rest positional parameters if nested and rendered with no positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{component (component (component "-looked-up" model.greeting model.name))}}', {
      model: {
        greeting: 'Gabon ',
        name: 'Zack'
      }
    });

    this.assertText('Gabon Zack');

    this.runTask(() => this.rerender());

    this.assertText('Gabon Zack');

    this.runTask(() => this.context.set('model.greeting', 'Good morning '));

    this.assertText('Good morning Zack');

    this.runTask(() => this.context.set('model.name', 'Matthew'));

    this.assertText('Good morning Matthew');

    this.runTask(() => this.context.set('model',  { greeting: 'Gabon ', name: 'Zack' }));

    this.assertText('Gabon Zack');
  }

  ['@test overwrites nested rest positional parameters if nested with new pos params and rendered with no positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{component (component (component "-looked-up" model.greeting model.name) model.name model.greeting)}}', {
      model: {
        greeting: 'Gabon ',
        name: 'Zack '
      }
    });

    this.assertText('Gabon Zack Zack Gabon ');

    this.runTask(() => this.rerender());

    this.assertText('Gabon Zack Zack Gabon ');

    this.runTask(() => this.context.set('model.greeting', 'Good morning '));

    this.assertText('Good morning Zack Zack Good morning ');

    this.runTask(() => this.context.set('model.name', 'Matthew '));

    this.assertText('Good morning Matthew Matthew Good morning ');

    this.runTask(() => this.context.set('model',  { greeting: 'Gabon ', name: 'Zack ' }));

    this.assertText('Gabon Zack Zack Gabon ');
  }

  ['@test renders with component helper with curried params, hash']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name']
      }),
      template: '{{greeting}} {{name}}'
    });

    this.render(strip`
      {{component (component "-looked-up" "Hodari" greeting="Hodi")
                  greeting="Hola"}}`
    );

    this.assertText('Hola Hodari');

    this.runTask(() => this.rerender());

    this.assertText('Hola Hodari');
  }

  ['@test updates when component path is bound']() {
    this.registerComponent('-mandarin', {
      template: 'ni hao'
    });

    this.registerComponent('-hindi', {
      template: 'Namaste'
    });

    this.render('{{component (component model.lookupComponent)}}', {
      model: {
        lookupComponent: '-mandarin'
      }
    });

    this.assertText('ni hao');

    this.runTask(() => this.rerender());

    this.assertText('ni hao');

    this.runTask(() => this.context.set('model.lookupComponent', '-hindi'));

    this.assertText('Namaste');

    this.runTask(() => this.context.set('model', { lookupComponent: '-mandarin' }));

    this.assertText('ni hao');
  }

  ['@test updates when curried hash argument is bound']() {
    this.registerComponent('-looked-up', {
      template: '{{greeting}}'
    });

    this.render(`{{component (component "-looked-up" greeting=model.greeting)}}`, {
      model: {
        greeting: 'Hodi'
      }
    });

    this.assertText('Hodi');

    this.runTask(() => this.rerender());

    this.assertText('Hodi');

    this.runTask(() => this.context.set('model.greeting', 'Hola'));

    this.assertText('Hola');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi');
  }

  ['@test updates when curried hash arguments is bound in block form']() {
    this.registerComponent('-looked-up', {
      template: '{{greeting}}'
    });

    this.render(strip`
      {{#with (hash comp=(component "-looked-up" greeting=model.greeting)) as |my|}}
        {{#my.comp}}{{/my.comp}}
      {{/with}}`, {
        model: {
          greeting: 'Hodi'
        }
      }
    );

    this.assertText('Hodi');

    this.runTask(() => this.rerender());

    this.assertText('Hodi');

    this.runTask(() => this.context.set('model.greeting', 'Hola'));

    this.assertText('Hola');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi');
  }

  ['@test nested components do not overwrite positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name', 'age']
      }),
      template: '{{name}} {{age}}'
    });

    this.render('{{component (component (component "-looked-up" "Sergio" 29) "Marvin" 21) "Hodari"}}');

    this.assertText('Sergio 29');

    this.runTask(() => this.rerender());

    this.assertText('Sergio 29');
  }

  ['@test positional parameters are combined not clobbered']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['greeting', 'name', 'age']
      }),
      template: '{{greeting}} {{name}} {{age}}'
    });

    this.render('{{component (component (component "-looked-up" "Hi") "Max") 9}}');

    this.assertText('Hi Max 9');

    this.runTask(() => this.rerender());

    this.assertText('Hi Max 9');
  }

  ['@test nested components positional parameters are overridden by named parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name', 'age']
      }),
      template: '{{name}} {{age}}'
    });

    this.render('{{component (component (component "-looked-up" "Sergio" 29) name="Marvin" age=21)}}');

    this.assertText('Marvin 21');

    this.runTask(() => this.rerender());

    this.assertText('Marvin 21');
  }

  ['@test nested components with positional params at outer layer are overwriten by hash parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['greeting', 'name', 'age']
      }),

      template: '{{greeting}} {{name}} {{age}}'
    });

    this.render(strip`
      {{#with (component "-looked-up" "Hola" "Dolores" 33) as |first|}}
        {{#with (component first greeting="Hej" name="Sigmundur") as |second|}}
          {{component second greeting=model.greeting}}
        {{/with}}
      {{/with}}`, {
        model: {
          greeting: 'Hodi'
        }
      });

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.context.set('model.greeting', 'Kaixo'));

    this.assertText('Kaixo Sigmundur 33');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi Sigmundur 33');
  }

  ['@test nested components with positional params at middle layer are partially overwriten by hash parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['greeting', 'name', 'age']
      }),

      template: '{{greeting}} {{name}} {{age}}'
    });

    this.render(strip`
      {{#with (component "-looked-up" greeting="Hola" name="Dolores" age=33) as |first|}}
        {{#with (component first "Hej" "Sigmundur") as |second|}}
          {{component second greeting=model.greeting}}
        {{/with}}
      {{/with}}`, {
        model: {
          greeting: 'Hodi'
        }
      });

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.context.set('model.greeting', 'Kaixo'));

    this.assertText('Kaixo Sigmundur 33');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi Sigmundur 33');
  }

  ['@test nested components with positional params at invocation override earlier hash parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['greeting', 'name', 'age']
      }),

      template: '{{greeting}} {{name}} {{age}}'
    });

    this.render(strip`
      {{#with (component "-looked-up" greeting="Hola" name="Dolores" age=33) as |first|}}
        {{#with (component first greeting="Hej" name="Sigmundur") as |second|}}
          {{component second model.greeting}}
        {{/with}}
      {{/with}}`, {
        model: {
          greeting: 'Hodi'
        }
      });

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.context.set('model.greeting', 'Kaixo'));

    this.assertText('Kaixo Sigmundur 33');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi Sigmundur 33');
  }

  ['@test nested components overwrite hash parameters']() {
    this.registerComponent('-looked-up', {
      template: '{{greeting}} {{name}} {{age}}'
    });

    this.render(strip`
      {{#with (component "-looked-up" greeting="Hola" name="Dolores" age=33) as |first|}}
        {{#with (component first greeting="Hej" name="Sigmundur") as |second|}}
          {{component second greeting=model.greeting}}
        {{/with}}
      {{/with}}`, {
        model: {
          greeting: 'Hodi'
        }
      });

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Sigmundur 33');

    this.runTask(() => this.context.set('model.greeting', 'Kaixo'));

    this.assertText('Kaixo Sigmundur 33');

    this.runTask(() => this.context.set('model', { greeting: 'Hodi' }));

    this.assertText('Hodi Sigmundur 33');
  }

  ['@test bound outer named parameters get updated in the right scope']() {
    this.registerComponent('-inner-component', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['comp']
      }),
      template: '{{component comp "Inner"}}'
    });

    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name', 'age']
      }),
      template: '{{name}} {{age}}'
    });

    this.render('{{component "-inner-component" (component "-looked-up" model.outerName model.outerAge)}}', {
      model: {
        outerName: 'Outer',
        outerAge: 28
      }
    });

    this.assertText('Outer 28');

    this.runTask(() => this.rerender());

    this.assertText('Outer 28');

    this.runTask(() => this.context.set('model.outerAge', 29));

    this.assertText('Outer 29');

    this.runTask(() => this.context.set('model.outerName', 'Not Outer'));

    this.assertText('Not Outer 29');

    this.runTask(() => {
      this.context.set('model', {
        outerName: 'Outer',
        outerAge: 28
      });
    });

    this.assertText('Outer 28');
  }

  ['@test bound outer hash parameters get updated in the right scope']() {
    this.registerComponent('-inner-component', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['comp']
      }),
      template: '{{component comp name="Inner"}}'
    });

    this.registerComponent('-looked-up', {
      template: '{{name}} {{age}}'
    });

    this.render('{{component "-inner-component" (component "-looked-up" name=model.outerName age=model.outerAge)}}', {
      model: {
        outerName: 'Outer',
        outerAge: 28
      }
    });

    this.assertText('Inner 28');

    this.runTask(() => this.rerender());

    this.assertText('Inner 28');

    this.runTask(() => this.context.set('model.outerAge', 29));

    this.assertText('Inner 29');

    this.runTask(() => this.context.set('model.outerName', 'Not outer'));

    this.assertText('Inner 29');

    this.runTask(() => {
      this.context.set('model', {
        outerName: 'Outer',
        outerAge: 28
      });
    });

    this.assertText('Inner 28');
  }

  ['@test conflicting positional and hash parameters raise and assertion if in the same component context']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name']
      }),
      template: '{{greeting}} {{name}}'
    });

    expectAssertion(() => {
      this.render('{{component (component "-looked-up" "Hodari" name="Sergio") "Hodari" greeting="Hodi"}}');
    }, 'You cannot specify both a positional param (at position 0) and the hash argument `name`.');
  }

  ['@test conflicting positional and hash parameters raise and assertion if in the same component context with prior curried positional params']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['greeting', 'name']
      }),
      template: '{{greeting}} {{name}}'
    });

    expectAssertion(() => {
      this.render('{{component (component "-looked-up" "Hodari") "Sergio" name="Hodi"}}');
    }, 'You cannot specify both a positional param (at position 0) and the hash argument `name`.');
  }

  ['@test conflicting positional and hash parameters does not raise an assertion if rerendered']() {
    // In some cases, rerendering with a positional param used to cause an
    // assertion. This test checks it does not.
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name']
      }),
      template: '{{greeting}} {{name}}'
    });

    this.render('{{component (component "-looked-up" model.name greeting="Hodi")}}', {
      model: {
        name: 'Hodari'
      }
    });

    this.assertText('Hodi Hodari');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Hodari');

    this.runTask(() => this.context.set('model.name', 'Sergio'));

    this.assertText('Hodi Sergio');

    this.runTask(() => this.context.set('model', { name: 'Hodari' }));

    this.assertText('Hodi Hodari');
  }

  ['@test conflicting positional and hash parameters does not raise an assertion if in different component context']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name']
      }),
      template: '{{greeting}} {{name}}'
    });

    this.render('{{component (component "-looked-up" "Hodari") name="Sergio" greeting="Hodi"}}');

    this.assertText('Hodi Sergio');

    this.runTask(() => this.rerender());

    this.assertText('Hodi Sergio');
  }

  ['@test raises an asserton when component path is null']() {
    expectAssertion(() => {
      this.render('{{component (component lookupComponent)}}');
    });
  }

  ['@test raises an assertion when component path is not a component name (static)']() {
    expectAssertion(() => {
      this.render('{{component (component "not-a-component")}}');
    }, 'The component helper cannot be used without a valid component name. You used "not-a-component" via (component "not-a-component")');
  }

  ['@test raises an assertion when component path is not a component name (dynamic)']() {
    expectAssertion(() => {
      this.render('{{component (component compName)}}', {
        compName: 'not-a-component'
      });
    }, /The component helper cannot be used without a valid component name. You used "not-a-component" via \(component .*\)/);
  }

  ['@test renders with dot path']() {
    let expectedText = 'Hodi';
    this.registerComponent('-looked-up', {
      template: expectedText
    });

    this.render(strip`
      {{#with (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup}}
      {{/with}}`);

    this.assertText(expectedText);

    this.runTask(() => this.rerender());

    this.assertText(expectedText);
  }

  ['@test renders with dot path and attr']() {
    let expectedText = 'Hodi';
    this.registerComponent('-looked-up', {
      template: '{{expectedText}}'
    });

    this.render(strip`
      {{#with (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup expectedText=model.expectedText}}
      {{/with}}`, {
        model: {
          expectedText
        }
      }
    );

    this.assertText(expectedText);

    this.runTask(() => this.rerender());

    this.assertText(expectedText);

    this.runTask(() => this.context.set('model.expectedText', 'Hola'));

    this.assertText('Hola');

    this.runTask(() => this.context.set('model', { expectedText }));

    this.assertText(expectedText);
  }

  ['@test renders with dot path and curried over attr']() {
    let expectedText = 'Hodi';
    this.registerComponent('-looked-up', {
      template: '{{expectedText}}'
    });

    this.render(strip`
      {{#with (hash lookedup=(component "-looked-up" expectedText=model.expectedText)) as |object|}}
        {{object.lookedup}}
      {{/with}}`, {
        model: {
          expectedText
        }
      }
    );

    this.assertText(expectedText);

    this.runTask(() => this.rerender());

    this.assertText(expectedText);

    this.runTask(() => this.context.set('model.expectedText', 'Hola'));

    this.assertText('Hola');

    this.runTask(() => this.context.set('model', { expectedText }));

    this.assertText(expectedText);
  }

  ['@test renders with dot path and with rest positional parameters']() {
    this.registerComponent('-looked-up', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{params}}'
    });

    let expectedText = 'Hodi';

    this.render(strip`
      {{#with (hash lookedup=(component "-looked-up")) as |object|}}
        {{object.lookedup model.expectedText "Hola"}}
      {{/with}}`, {
        model: {
          expectedText
        }
      }
    );

    this.assertText(`${expectedText},Hola`);

    this.runTask(() => this.rerender());

    this.assertText(`${expectedText},Hola`);

    this.runTask(() => this.context.set('model.expectedText', 'Kaixo'));

    this.assertText('Kaixo,Hola');

    this.runTask(() => this.context.set('model', { expectedText }));

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
        }
      }).reopenClass({
        positionalParams: ['value']
      })
    });

    this.render(strip`
      {{#with (hash my-component=(component 'my-component' first)) as |c|}}
        {{c.my-component}}
      {{/with}}`, { first: 'first' }
    );

    assert.equal(value, 'first', 'value is the expected parameter');
  }

  ['@test renders with dot path and updates attributes'](assert) {
    this.registerComponent('my-nested-component', {
      ComponentClass: Component.extend({
        didReceiveAttrs() {
          this.set('myProp', this.getAttr('my-parent-attr'));
        }
      }),
      template: '<span id="nested-prop">{{myProp}}</span>'
    });

    this.registerComponent('my-component', {
      template: '{{yield (hash my-nested-component=(component "my-nested-component" my-parent-attr=my-attr))}}'
    });

    this.registerComponent('my-action-component', {
      ComponentClass: Component.extend({
        actions: {
          changeValue() { this.incrementProperty('myProp'); }
        }
      }),
      template: strip`
        {{#my-component my-attr=myProp as |api|}}
          {{api.my-nested-component}}
        {{/my-component}}
        <br>
        <button onclick={{action 'changeValue'}}>Change value</button>`
    });

    this.render('{{my-action-component myProp=model.myProp}}', {
      model: {
        myProp: 1
      }
    });

    assert.equal(this.$('#nested-prop').text(), '1');

    this.runTask(() => this.rerender());

    assert.equal(this.$('#nested-prop').text(), '1');

    this.runTask(() => this.$('button').click());

    assert.equal(this.$('#nested-prop').text(), '2');

    this.runTask(() => this.$('button').click());

    assert.equal(this.$('#nested-prop').text(), '3');

    this.runTask(() => this.context.set('model', { myProp: 1 }));

    assert.equal(this.$('#nested-prop').text(), '1');
  }

  ['@test adding parameters to a contextual component\'s instance does not add it to other instances']() {
    // If parameters and attributes are not handled correctly, setting a value
    // in an invokation can leak to others invocation.
    this.registerComponent('select-box', {
      template: '{{yield (hash option=(component "select-box-option"))}}'
    });

    this.registerComponent('select-box-option', {
      template: '{{label}}'
    });

    this.render(strip`
      {{#select-box as |sb|}}
        {{sb.option label="Foo"}}
        {{sb.option}}
      {{/select-box}}`);

    this.assertText('Foo');

    this.runTask(() => this.rerender());

    this.assertText('Foo');
  }

  ['@test parameters in a contextual component are mutable when value is a param'](assert) {
    // This checks that a `(mut)` is added to parameters and attributes to
    // contextual components when it is a param.

    this.registerComponent('change-button', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['val']
      }),
      template: strip`
        <button {{action (action (mut val) 10)}} class="my-button">
          Change to 10
        </button>`
    });

    this.render(strip`
      {{component (component "change-button" model.val2)}}
      <span class="value">{{model.val2}}</span>`, {
        model: {
          val2: 8
        }
      }
    );

    assert.equal(this.$('.value').text(), '8');

    this.runTask(() => this.rerender());

    assert.equal(this.$('.value').text(), '8');

    this.runTask(() => this.$('.my-button').click());

    assert.equal(this.$('.value').text(), '10');

    this.runTask(() => this.context.set('model', { val2: 8 }));

    assert.equal(this.$('.value').text(), '8');
  }

  ['@test tagless blockless components render'](assert) {
    this.registerComponent('my-comp', {
      ComponentClass: Component.extend({ tagName: '' })
    });

    this.render(`{{my-comp}}`);

    this.runTask(() => this.rerender());

    assert.equal(this.$().text(), '');
  }

  ['@test GH#13494 tagless blockless component with property binding'](assert) {
    this.registerComponent('outer-component', {
      ComponentClass: Component.extend({
        message: 'hello',
        actions: {
          change() {
            this.set('message', 'goodbye');
          }
        }
      }),
      template: strip`
        message: {{message}}{{inner-component message=message}}
        <button onclick={{action "change"}} />`
    });

    this.registerComponent('inner-component', {
      ComponentClass: Component.extend({
        tagName: ''
      })
    });

    this.render(`{{outer-component}}`);

    assert.equal(this.$().text(), 'message: hello');

    this.runTask(() => this.rerender());

    assert.equal(this.$().text(), 'message: hello');

    this.runTask(() => this.$('button').click());

    assert.equal(this.$().text(), 'message: goodbye');

    this.runTask(() => this.rerender());

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
        isOpen: undefined
      }),
      template: '{{if isOpen "open" "closed"}}'
    });

    this.render(strip`
      {{#with (hash ctxCmp=(component "my-comp" isOpen=isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/with}}
    `, {
      isOpen: true
    });

    assert.ok(!isEmpty(instance), 'a instance was created');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');

    this.runTask(() => this.context.set('isOpen', false));

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

    this.runTask(() => this.context.set('isOpen', true));

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');
  }

  ['@test GH#13982 contextual component ref is stable even when bound params change (bound name param)'](assert) {
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
        isOpen: undefined
      }),
      template: '{{if isOpen "open" "closed"}}'
    });

    this.render(strip`
      {{#with (hash ctxCmp=(component compName isOpen=isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/with}}
    `, {
      compName: 'my-comp',
      isOpen: true
    });

    assert.ok(!isEmpty(instance), 'a instance was created');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');

    this.runTask(() => this.context.set('isOpen', false));

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

    this.runTask(() => this.context.set('isOpen', true));

    assert.ok(!isEmpty(instance), 'the component instance exists');
    assert.equal(previousInstance, undefined, 'no previous component exists');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'open', 'the components text is "open"');
  }

  ['@test GH#13982 contextual component ref is recomputed when component name param changes'](assert) {
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
        isOpen: undefined
      }),
      template: 'my-comp: {{if isOpen "open" "closed"}}'
    });

    this.registerComponent('your-comp', {
      ComponentClass: Component.extend({
        init() {
          this._super();
          previousInstance = instance;
          instance = this;
          initCount++;
        },
        isOpen: undefined
      }),
      template: 'your-comp: {{if isOpen "open" "closed"}}'
    });

    this.render(strip`
      {{#with (hash ctxCmp=(component compName isOpen=isOpen)) as |thing|}}
        {{#thing.ctxCmp}}This is a contextual component{{/thing.ctxCmp}}
      {{/with}}
    `, {
      compName: 'my-comp',
      isOpen: true
    });

    assert.ok(!isEmpty(instance), 'a instance was created');
    assert.equal(previousInstance, undefined, 'there is no previous instance');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'my-comp: open');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'a instance exists after rerender');
    assert.equal(previousInstance, undefined, 'there is no previous instance after rerender');
    assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
    assert.equal(this.$().text(), 'my-comp: open');

    this.runTask(() => this.context.set('compName', 'your-comp'));

    assert.ok(!isEmpty(instance), 'an instance was created after component name changed');
    assert.ok(!isEmpty(previousInstance), 'a previous instance now exists');
    assert.notEqual(instance, previousInstance, 'the instance and previous instance are not the same object');
    assert.equal(initCount, 2, 'the component was constructed exactly 2 times');
    assert.equal(this.$().text(), 'your-comp: open');

    this.runTask(() => this.rerender());

    assert.ok(!isEmpty(instance), 'an instance was created after component name changed (rerender)');
    assert.ok(!isEmpty(previousInstance), 'a previous instance now exists (rerender)');
    assert.notEqual(instance, previousInstance, 'the instance and previous instance are not the same object (rerender)');
    assert.equal(initCount, 2, 'the component was constructed exactly 2 times (rerender)');
    assert.equal(this.$().text(), 'your-comp: open');

    this.runTask(() => this.context.set('compName', 'my-comp'));

    assert.ok(!isEmpty(instance), 'an instance was created after component name changed');
    assert.ok(!isEmpty(previousInstance), 'a previous instance still exists');
    assert.notEqual(instance, previousInstance, 'the instance and previous instance are not the same object');
    assert.equal(initCount, 3, 'the component was constructed exactly 3 times (rerender)');
    assert.equal(this.$().text(), 'my-comp: open');
  }

  ['@test GH#14508 rest positional params are received when passed as named parameter']() {
    this.registerComponent('my-link', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{component (component "my-link") params=allParams}}', {
      allParams: emberA(['a', 'b'])
    });

    this.assertText('ab');

    this.runTask(() => this.rerender());

    this.assertText('ab');

    this.runTask(() => this.context.get('allParams').pushObject('c'));

    this.assertText('abc');

    this.runTask(() => this.context.get('allParams').popObject());

    this.assertText('ab');

    this.runTask(() => this.context.get('allParams').clear());

    this.assertText('');

    this.runTask(() => this.context.set('allParams', emberA(['1', '2'])));

    this.assertText('12');

    this.runTask(() => this.context.set('allParams', emberA(['a', 'b'])));

    this.assertText('ab');
  }

  ['@test GH#14508 rest positional params are received when passed as named parameter with dot notation']() {
    this.registerComponent('my-link', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'params'
      }),
      template: '{{#each params as |p|}}{{p}}{{/each}}'
    });

    this.render('{{#with (hash link=(component "my-link")) as |c|}}{{c.link params=allParams}}{{/with}}', {
      allParams: emberA(['a', 'b'])
    });

    this.assertText('ab');

    this.runTask(() => this.rerender());

    this.assertText('ab');

    this.runTask(() => this.context.get('allParams').pushObject('c'));

    this.assertText('abc');

    this.runTask(() => this.context.get('allParams').popObject());

    this.assertText('ab');

    this.runTask(() => this.context.get('allParams').clear());

    this.assertText('');

    this.runTask(() => this.context.set('allParams', emberA(['1', '2'])));

    this.assertText('12');

    this.runTask(() => this.context.set('allParams', emberA(['a', 'b'])));

    this.assertText('ab');
  }

  ['@test GH#14632 give useful warning when calling contextual components with input as a name']() {
    expectAssertion(() => {
      this.render('{{component (component "input" type="text")}}');
    }, 'You cannot use the input helper as a contextual helper. Please extend Ember.TextField or Ember.Checkbox to use it as a contextual component.');
  }

  ['@test GH#14632 give useful warning when calling contextual components with textarea as a name']() {
    expectAssertion(() => {
      this.render('{{component (component "textarea" type="text")}}');
    }, 'You cannot use the textarea helper as a contextual helper. Please extend Ember.TextArea to use it as a contextual component.');
  }
});

class ContextualComponentMutableParamsTest extends RenderingTest {
  render(templateStr, context = {}) {
    super.render(`${templateStr}<span class="value">{{model.val2}}</span>`, assign(context, { model: { val2: 8 } }));
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
            positionalParams: ['val']
          }),
          template: strip`
          <button {{action (action (mut val) 10)}} class="my-button">
            Change to 10
          </button>`
        });

        setup.call(this, assert);

        assert.equal(this.$('.value').text(), '8');

        this.runTask(() => this.rerender());

        assert.equal(this.$('.value').text(), '8');

        this.runTask(() => this.$('.my-button').click());

        assert.equal(this.$('.value').text(), '10');

        this.runTask(() => this.context.set('model', { val2: 8 }));

        assert.equal(this.$('.value').text(), '8');
      }
    };
  }
}

applyMixins(ContextualComponentMutableParamsTest,
  new MutableParamTestGenerator([
    {
      title: 'param',
      setup() {
        this.render('{{component (component "change-button" model.val2)}}');
      }
    },

    {
      title: 'nested param',
      setup() {
        this.registerComponent('my-comp', {
          ComponentClass: Component.extend().reopenClass({
            positionalParams: ['components']
          }),
          template: '{{component components.comp}}'
        });

        this.render('{{my-comp (hash comp=(component "change-button" model.val2))}}');
      }
    },

    {
      title: 'hash value',
      setup() {
        this.registerComponent('my-comp', {
          template: '{{component component}}'
        });

        this.render('{{my-comp component=(component "change-button" val=model.val2)}}');
      }
    },

    {
      title: 'nested hash value',
      setup() {
        this.registerComponent('my-comp', {
          template: '{{component components.button}}'
        });

        this.render('{{my-comp components=(hash button=(component "change-button" val=model.val2))}}');
      }
    }
  ])
);

moduleFor('Components test: contextual components -- mutable params', ContextualComponentMutableParamsTest);
