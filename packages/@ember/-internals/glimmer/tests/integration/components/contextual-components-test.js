import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, applyMixins, strip, runTask } from 'internal-test-helpers';

import { action } from '@ember/object';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  'Components test: contextual components',
  class extends RenderingTestCase {
    ['@test renders with component helper']() {
      let expectedText = 'Hodi';

      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('Hodi'), class extends Component {})
      );

      this.render('{{component (component "-looked-up")}}');

      this.assertText(expectedText);

      runTask(() => this.rerender());

      this.assertText(expectedText);
    }

    ['@test updates when component path is bound']() {
      this.owner.register(
        'component:-mandarin',
        setComponentTemplate(precompileTemplate('ni hao'), class extends Component {})
      );

      this.owner.register(
        'component:-hindi',
        setComponentTemplate(precompileTemplate('Namaste'), class extends Component {})
      );

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
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('{{@greeting}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('{{@greeting}}'), class extends Component {})
      );

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

    ['@test nested components overwrite hash parameters']() {
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(
          precompileTemplate('{{@greeting}} {{@name}} {{@age}}'),
          class extends Component {}
        )
      );

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

    ['@test bound outer hash parameters get updated in the right scope']() {
      this.owner.register(
        'component:-inner-component',
        setComponentTemplate(
          precompileTemplate('{{component @comp name="Inner"}}'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('{{@name}} {{@age}}'), class extends Component {})
      );

      this.render(
        '{{component "-inner-component" comp=(component "-looked-up" name=this.model.outerName age=this.model.outerAge)}}',
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

    ['@test component with dynamic component name resolving to undefined, then an existing component']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello {{@name}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello {{@name}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello {{@name}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello {{@name}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('Hodi'), class extends Component {})
      );

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
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('{{@expectedText}}'), class extends Component {})
      );

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
      this.owner.register(
        'component:-looked-up',
        setComponentTemplate(precompileTemplate('{{@expectedText}}'), class extends Component {})
      );

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

    ['@test renders with dot path and updates attributes'](assert) {
      this.owner.register(
        'component:my-nested-component',
        setComponentTemplate(
          precompileTemplate('<span id="nested-prop">{{@my-parent-attr}}</span>'),
          class extends Component {}
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
            '{{#my-component my-attr=@myProp as |api|}}{{api.my-nested-component}}{{/my-component}}<br><button onclick={{@changeValue}}>Change value</button>'
          ),
          class extends Component {}
        )
      );

      this.render('{{my-action-component myProp=this.model.myProp changeValue=this.changeValue}}', {
        model: {
          myProp: 1,
        },
        changeValue: () => this.context.incrementProperty('model.myProp'),
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
      this.owner.register(
        'component:select-box',
        setComponentTemplate(
          precompileTemplate('{{yield (hash option=(component "select-box-option"))}}'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:select-box-option',
        setComponentTemplate(precompileTemplate('{{@label}}'), class extends Component {})
      );

      this.render(strip`
      {{#select-box as |sb|}}
        {{sb.option label="Foo"}}
        {{sb.option}}
      {{/select-box}}`);

      this.assertText('Foo');

      runTask(() => this.rerender());

      this.assertText('Foo');
    }

    ['@test GH#13982 contextual component ref is stable even when bound params change'](assert) {
      let instance, previousInstance;
      let initCount = 0;

      this.owner.register(
        'component:my-comp',
        setComponentTemplate(
          precompileTemplate('{{if @isOpen "open" "closed"}}'),
          class extends Component {
            constructor(owner, args) {
              super(owner, args);
              previousInstance = instance;
              instance = this;
              initCount++;
            }
          }
        )
      );

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

      assert.ok(instance, 'a instance was created');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.rerender());

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.context.set('isOpen', false));

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.rerender());

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.context.set('isOpen', true));

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');
    }

    ['@test GH#13982 contextual component ref is stable even when bound params change (bound name param)'](
      assert
    ) {
      let instance, previousInstance;
      let initCount = 0;

      this.owner.register(
        'component:my-comp',
        setComponentTemplate(
          precompileTemplate('{{if @isOpen "open" "closed"}}'),
          class extends Component {
            constructor(owner, args) {
              super(owner, args);
              previousInstance = instance;
              instance = this;
              initCount++;
            }
          }
        )
      );

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

      assert.ok(instance, 'a instance was created');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.rerender());

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');

      runTask(() => this.context.set('isOpen', false));

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.rerender());

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'closed', 'the component text is "closed"');

      runTask(() => this.context.set('isOpen', true));

      assert.ok(instance, 'the component instance exists');
      assert.equal(previousInstance, undefined, 'no previous component exists');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'open', 'the components text is "open"');
    }

    ['@test GH#13982 contextual component ref is recomputed when component name param changes'](
      assert
    ) {
      let instance, previousInstance;
      let initCount = 0;

      this.owner.register(
        'component:my-comp',
        setComponentTemplate(
          precompileTemplate('my-comp: {{if @isOpen "open" "closed"}}'),
          class extends Component {
            constructor(owner, args) {
              super(owner, args);
              previousInstance = instance;
              instance = this;
              initCount++;
            }
          }
        )
      );

      this.owner.register(
        'component:your-comp',
        setComponentTemplate(
          precompileTemplate('your-comp: {{if @isOpen "open" "closed"}}'),
          class extends Component {
            constructor(owner, args) {
              super(owner, args);
              previousInstance = instance;
              instance = this;
              initCount++;
            }
          }
        )
      );

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

      assert.ok(instance, 'a instance was created');
      assert.equal(previousInstance, undefined, 'there is no previous instance');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'my-comp: open');

      runTask(() => this.rerender());

      assert.ok(instance, 'a instance exists after rerender');
      assert.equal(previousInstance, undefined, 'there is no previous instance after rerender');
      assert.equal(initCount, 1, 'the component was constructed exactly 1 time');
      assert.equal(this.$().text(), 'my-comp: open');

      runTask(() => this.context.set('compName', 'your-comp'));

      assert.ok(instance, 'an instance was created after component name changed');
      assert.ok(previousInstance, 'a previous instance now exists');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object'
      );
      assert.equal(initCount, 2, 'the component was constructed exactly 2 times');
      assert.equal(this.$().text(), 'your-comp: open');

      runTask(() => this.rerender());

      assert.ok(instance, 'an instance was created after component name changed (rerender)');
      assert.ok(previousInstance, 'a previous instance now exists (rerender)');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object (rerender)'
      );
      assert.equal(initCount, 2, 'the component was constructed exactly 2 times (rerender)');
      assert.equal(this.$().text(), 'your-comp: open');

      runTask(() => this.context.set('compName', 'my-comp'));

      assert.ok(instance, 'an instance was created after component name changed');
      assert.ok(previousInstance, 'a previous instance still exists');
      assert.notEqual(
        instance,
        previousInstance,
        'the instance and previous instance are not the same object'
      );
      assert.equal(initCount, 3, 'the component was constructed exactly 3 times (rerender)');
      assert.equal(this.$().text(), 'my-comp: open');
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

    ['@test GH#13494 component without content with an argument binding'](assert) {
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
        setComponentTemplate(precompileTemplate(''), class extends Component {})
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

    ['@test GH#17121 local variable should win over helper (without arguments)']() {
      this.registerHelper('foo', () => 'foo helper');

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('foo-bar component'), class extends Component {})
      );

      this.render(strip`
        {{#let (component 'foo-bar') as |foo|}}
          {{foo}}
        {{/let}}
      `);

      this.assertText('foo-bar component');

      this.assertStableRerender();
    }

    ['@test RFC#311 invoking named args (without arguments)']() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(precompileTemplate('{{@inner}}'), class extends Component {})
      );
      this.owner.register(
        'component:x-inner',
        setComponentTemplate(precompileTemplate('inner'), class extends Component {})
      );

      this.render('{{x-outer inner=(component "x-inner")}}');

      this.assertText('inner');

      this.assertStableRerender();
    }

    ['@test RFC#311 invoking named args (with a block)']() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate('{{#@inner}}outer{{/@inner}}'),
          class extends Component {}
        )
      );
      this.owner.register(
        'component:x-inner',
        setComponentTemplate(precompileTemplate('inner {{yield}}'), class extends Component {})
      );

      this.render('{{x-outer inner=(component "x-inner")}}');

      this.assertText('inner outer');

      this.assertStableRerender();
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked within mustaches']() {
      this.owner.register(
        'component:component-with-has-block',
        setComponentTemplate(
          precompileTemplate('<div>{{(has-block)}}</div>'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:yielding-component',
        setComponentTemplate(
          precompileTemplate('{{yield (component "component-with-has-block")}}'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:test-component',
        setComponentTemplate(
          precompileTemplate(
            '{{#yielding-component as |componentWithHasBlock|}}{{componentWithHasBlock}}{{/yielding-component}}'
          ),
          class extends Component {}
        )
      );

      this.render('{{test-component}}');

      this.assertText('false');
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked with angle bracket invocation (falsy)']() {
      this.owner.register(
        'component:component-with-has-block',
        setComponentTemplate(
          precompileTemplate('<div>{{(has-block)}}</div>'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:yielding-component',
        setComponentTemplate(
          precompileTemplate('{{yield (component "component-with-has-block")}}'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:test-component',
        setComponentTemplate(
          precompileTemplate(
            '{{#yielding-component as |componentWithHasBlock|}}<componentWithHasBlock/>{{/yielding-component}}'
          ),
          class extends Component {}
        )
      );

      this.render('{{test-component}}');

      this.assertText('false');
    }

    ['@test GH#18732 (has-block) works within a yielded curried component invoked with angle bracket invocation (truthy)']() {
      this.owner.register(
        'component:component-with-has-block',
        setComponentTemplate(
          precompileTemplate('<div>{{(has-block)}}</div>'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:yielding-component',
        setComponentTemplate(
          precompileTemplate('{{yield (component "component-with-has-block")}}'),
          class extends Component {}
        )
      );

      this.owner.register(
        'component:test-component',
        setComponentTemplate(
          precompileTemplate(
            '{{#yielding-component as |componentWithHasBlock|}}<componentWithHasBlock></componentWithHasBlock>{{/yielding-component}}'
          ),
          class extends Component {}
        )
      );

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
        this.owner.register(
          'component:change-button',
          setComponentTemplate(
            precompileTemplate(
              '<button {{on "click" (fn (mut @val) 10)}} class="my-button">Change to 10</button>'
            ),
            class extends Component {}
          )
        );

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
      title: 'hash value',
      setup() {
        this.owner.register(
          'component:my-comp',
          setComponentTemplate(
            precompileTemplate('{{component @component}}'),
            class extends Component {}
          )
        );

        this.render('{{my-comp component=(component "change-button" val=this.model.val2)}}');
      },
    },

    {
      title: 'nested hash value',
      setup() {
        this.owner.register(
          'component:my-comp',
          setComponentTemplate(
            precompileTemplate('{{component @components.button}}'),
            class extends Component {}
          )
        );

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
