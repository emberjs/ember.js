import {
  moduleFor,
  RenderingTestCase,
  strip,
  equalTokens,
  equalsElement,
  runTask,
  defineSimpleModifier,
} from 'internal-test-helpers';

import { tracked } from '@ember/-internals/metal';
import { alias } from '@ember/object/computed';
import Service, { service } from '@ember/service';
import EmberObject, { set, computed } from '@ember/object';
import { A as emberA } from '@ember/array';

import { htmlSafe } from '../../utils/helpers';
import ClassicComponent from '@ember/component';
import GlimmerComponent from '@glimmer/component';
import { template } from '@ember/template-compiler/runtime';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { backtrackingMessageFor } from '../../utils/debug-stack';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'Components test: curly components',
  class extends RenderingTestCase {
    ['@test it can render a basic component']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), templateOnly())
      );

      this.render('{{foo-bar}}');

      this.assertHTML('hello');

      runTask(() => this.rerender());

      this.assertHTML('hello');
    }

    ['@test it renders passed named arguments']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly())
      );

      this.render('{{foo-bar foo=this.model.bar}}', {
        model: {
          bar: 'Hola',
        },
      });

      this.assertText('Hola');

      runTask(() => this.rerender());

      this.assertText('Hola');

      runTask(() => this.context.set('model.bar', 'Hello'));

      this.assertText('Hello');

      runTask(() => this.context.set('model', { bar: 'Hola' }));

      this.assertText('Hola');
    }

    ['@test it can render a basic component with a block']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{yield}} - In component'), templateOnly())
      );

      this.render('{{#foo-bar}}hello{{/foo-bar}}');

      this.assertHTML('hello - In component');

      runTask(() => this.rerender());

      this.assertHTML('hello - In component');
    }

    ['@test it renders the layout with the component instance as the context']() {
      let instance;

      let FooBarComponent = class extends GlimmerComponent {
        @tracked message = 'hello';

        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.message}}'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertHTML('hello');

      runTask(() => this.rerender());

      this.assertHTML('hello');

      runTask(() => set(instance, 'message', 'goodbye'));

      this.assertHTML('goodbye');

      runTask(() => set(instance, 'message', 'hello'));

      this.assertHTML('hello');
    }

    ['@test it preserves the outer context when yielding']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{yield}}'), templateOnly())
      );

      this.render('{{#foo-bar}}{{this.message}}{{/foo-bar}}', { message: 'hello' });

      this.assertHTML('hello');

      runTask(() => this.rerender());

      this.assertHTML('hello');

      runTask(() => set(this.context, 'message', 'goodbye'));

      this.assertHTML('goodbye');

      runTask(() => set(this.context, 'message', 'hello'));

      this.assertHTML('hello');
    }

    ['@test it can yield a block param named for reserved words [GH#14096]']() {
      let instance;

      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }

        @tracked name = 'foo-bar';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{yield this}}'), FooBarComponent)
      );

      this.render('{{#foo-bar as |component|}}{{component.name}}{{/foo-bar}}');

      this.assertHTML('foo-bar');

      this.assertStableRerender();

      runTask(() => set(instance, 'name', 'derp-qux'));

      this.assertHTML('derp-qux');

      runTask(() => set(instance, 'name', 'foo-bar'));

      this.assertHTML('foo-bar');
    }

    ['@test it can yield internal and external properties positionally']() {
      let instance;

      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }

        @tracked greeting = 'hello';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield this.greeting @greetee.firstName}}'),
          FooBarComponent
        )
      );

      this.render(
        '{{#foo-bar greetee=this.person as |greeting name|}}{{name}} {{this.person.lastName}}, {{greeting}}{{/foo-bar}}',
        {
          person: {
            firstName: 'Joel',
            lastName: 'Kang',
          },
        }
      );

      this.assertHTML('Joel Kang, hello');

      runTask(() => this.rerender());

      this.assertHTML('Joel Kang, hello');

      runTask(() =>
        set(this.context, 'person', {
          firstName: 'Dora',
          lastName: 'the Explorer',
        })
      );

      this.assertHTML('Dora the Explorer, hello');

      runTask(() => set(instance, 'greeting', 'hola'));

      this.assertHTML('Dora the Explorer, hola');

      runTask(() => {
        set(instance, 'greeting', 'hello');
        set(this.context, 'person', {
          firstName: 'Joel',
          lastName: 'Kang',
        });
      });

      this.assertHTML('Joel Kang, hello');
    }

    ['@test #11519 - block param infinite loop']() {
      let instance;
      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }

        @tracked danger = 0;
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.danger}}{{yield this.danger}}'),
          FooBarComponent
        )
      );

      // On initial render, create streams. The bug will not have manifested yet, but at this point
      // we have created streams that create a circular invalidation.
      this.render(`{{#foo-bar as |dangerBlockParam|}}{{/foo-bar}}`);

      this.assertText('0');

      // Trigger a non-revalidating re-render. The yielded block will not be dirtied
      // nor will block param streams, and thus no infinite loop will occur.
      runTask(() => this.rerender());

      this.assertText('0');

      // Trigger a revalidation, which will cause an infinite loop without the fix
      // in place.  Note that we do not see the infinite loop is in testing mode,
      // because a deprecation warning about re-renders is issued, which Ember
      // treats as an exception.
      runTask(() => set(instance, 'danger', 1));

      this.assertText('1');

      runTask(() => set(instance, 'danger', 0));

      this.assertText('0');
    }

    ['@test the component and its child components are destroyed'](assert) {
      let destroyed = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{@id}} {{yield}}'),
          class extends GlimmerComponent {
            willDestroy() {
              super.willDestroy();
              destroyed[this.args.id]++;
            }
          }
        )
      );

      this.render(
        strip`
      {{#if this.cond1}}
        {{#foo-bar id=1}}
          {{#if this.cond2}}
            {{#foo-bar id=2}}{{/foo-bar}}
            {{#if this.cond3}}
              {{#foo-bar id=3}}
                {{#if this.cond4}}
                  {{#foo-bar id=4}}
                    {{#if this.cond5}}
                      {{#foo-bar id=5}}{{/foo-bar}}
                      {{#foo-bar id=6}}{{/foo-bar}}
                      {{#foo-bar id=7}}{{/foo-bar}}
                    {{/if}}
                    {{#foo-bar id=8}}{{/foo-bar}}
                  {{/foo-bar}}
                {{/if}}
              {{/foo-bar}}
            {{/if}}
          {{/if}}
        {{/foo-bar}}
      {{/if}}`,
        {
          cond1: true,
          cond2: true,
          cond3: true,
          cond4: true,
          cond5: true,
        }
      );

      this.assertText('1 2 3 4 5 6 7 8 ');

      runTask(() => this.rerender());

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
      });

      runTask(() => set(this.context, 'cond5', false));

      this.assertText('1 2 3 4 8 ');

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 1,
        6: 1,
        7: 1,
        8: 0,
      });

      runTask(() => {
        set(this.context, 'cond3', false);
        set(this.context, 'cond5', true);
        set(this.context, 'cond4', false);
      });

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
      });

      runTask(() => {
        set(this.context, 'cond2', false);
        set(this.context, 'cond1', false);
      });

      assert.deepEqual(destroyed, {
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
      });
    }

    ['@test should escape HTML in normal mustaches']() {
      let component;
      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          component = this;
        }

        @tracked output = 'you need to be more <b>bold</b>';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.output}}'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertText('you need to be more <b>bold</b>');

      runTask(() => this.rerender());

      this.assertText('you need to be more <b>bold</b>');

      runTask(() => set(component, 'output', 'you are so <i>super</i>'));

      this.assertText('you are so <i>super</i>');

      runTask(() => set(component, 'output', 'you need to be more <b>bold</b>'));
    }

    ['@test should not escape HTML in triple mustaches']() {
      let expectedHtmlBold = 'you need to be more <b>bold</b>';
      let expectedHtmlItalic = 'you are so <i>super</i>';
      let component;
      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          component = this;
        }

        @tracked output = expectedHtmlBold;
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{{this.output}}}'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      equalTokens(this.element, expectedHtmlBold);

      runTask(() => this.rerender());

      equalTokens(this.element, expectedHtmlBold);

      runTask(() => set(component, 'output', expectedHtmlItalic));

      equalTokens(this.element, expectedHtmlItalic);

      runTask(() => set(component, 'output', expectedHtmlBold));

      equalTokens(this.element, expectedHtmlBold);
    }

    ['@test should not escape HTML if string is a htmlSafe']() {
      let expectedHtmlBold = 'you need to be more <b>bold</b>';
      let expectedHtmlItalic = 'you are so <i>super</i>';
      let component;
      let FooBarComponent = class extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          component = this;
        }

        @tracked output = htmlSafe(expectedHtmlBold);
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.output}}'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      equalTokens(this.element, expectedHtmlBold);

      runTask(() => this.rerender());

      equalTokens(this.element, expectedHtmlBold);

      runTask(() => set(component, 'output', htmlSafe(expectedHtmlItalic)));

      equalTokens(this.element, expectedHtmlItalic);

      runTask(() => set(component, 'output', htmlSafe(expectedHtmlBold)));

      equalTokens(this.element, expectedHtmlBold);
    }

    ['@test can use isStream property without conflict (#13271)']() {
      let component;
      let FooBarComponent = class extends GlimmerComponent {
        @tracked isStream = true;

        constructor(owner, args) {
          super(owner, args);
          component = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        template(
          strip`
            {{#if this.isStream}}
              true
            {{else}}
              false
            {{/if}}
          `,
          { component: FooBarComponent, strictMode: false }
        )
      );

      this.render('{{foo-bar}}');

      this.assertHTML('true');

      runTask(() => this.rerender());

      this.assertHTML('true');

      runTask(() => set(component, 'isStream', false));

      this.assertHTML('false');

      runTask(() => set(component, 'isStream', true));

      this.assertHTML('true');
    }
    ['@test lookup of component takes priority over property']() {
      this.owner.register(
        'component:some-component',
        setComponentTemplate(precompileTemplate('some-component'), templateOnly())
      );

      this.render('{{this.some-prop}} {{some-component}}', {
        'some-component': 'not-some-component',
        'some-prop': 'some-prop',
      });

      this.assertText('some-prop some-component');

      runTask(() => this.rerender());

      this.assertText('some-prop some-component');
    }

    ['@test component without dash is looked up']() {
      this.owner.register(
        'component:somecomponent',
        setComponentTemplate(precompileTemplate('somecomponent'), templateOnly())
      );

      this.render('{{somecomponent}}', {
        somecomponent: 'notsomecomponent',
      });

      this.assertText('somecomponent');

      this.assertStableRerender();

      runTask(() => this.context.set('somecomponent', 'not not notsomecomponent'));

      this.assertText('somecomponent');

      runTask(() => this.context.set('somecomponent', 'notsomecomponent'));

      this.assertText('somecomponent');
    }

    ['@test non-block with properties access via attrs is asserted against']() {
      expectAssertion(() => {
        this.owner.register(
          'component:non-block',
          template('In layout - someProp: {{attrs.someProp}}', {
            component: templateOnly(),
            strictMode: false,
          })
        );
      }, 'Using {{attrs}} to reference named arguments is not supported. {{attrs.someProp}} should be updated to {{@someProp}}. (L1:C24) ');
    }

    ['@test non-block with named argument']() {
      this.owner.register(
        'component:non-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{@someProp}}'),
          templateOnly()
        )
      );

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something here',
      });

      this.assertText('In layout - someProp: something here');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here');

      runTask(() => this.context.set('prop', 'other thing there'));

      this.assertText('In layout - someProp: other thing there');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here');
    }

    ['@test block with properties on attrs is asserted against']() {
      expectAssertion(() => {
        this.owner.register(
          'component:with-block',
          template('In layout - someProp: {{attrs.someProp}} - {{yield}}', {
            component: templateOnly(),
            strictMode: false,
          })
        );
      }, 'Using {{attrs}} to reference named arguments is not supported. {{attrs.someProp}} should be updated to {{@someProp}}. (L1:C24) ');
    }

    ['@test block with named argument']() {
      this.owner.register(
        'component:with-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{@someProp}} - {{yield}}'),
          templateOnly()
        )
      );

      this.render(
        strip`
      {{#with-block someProp=this.prop}}
        In template
      {{/with-block}}`,
        {
          prop: 'something here',
        }
      );

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else - In template');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here - In template');
    }

    ['@test static arbitrary number of positional parameters'](assert) {
      this.owner.register(
        'component:sample-component',
        template(
          strip`
            {{#each this.names as |name|}}
              {{name}}
            {{/each}}
          `,
          {
            component: class extends ClassicComponent {
              static positionalParams = 'names';
            },
            strictMode: false,
          }
        )
      );

      this.render(strip`
      <div id="args-3">{{sample-component "Foo" 4 "Bar"}}</div>
      <div id="args-5">{{sample-component "Foo" 4 "Bar" 5 "Baz"}}</div>`);

      assert.equal(this.$('#args-3').text(), 'Foo4Bar');
      assert.equal(this.$('#args-5').text(), 'Foo4Bar5Baz');

      runTask(() => this.rerender());

      assert.equal(this.$('#args-3').text(), 'Foo4Bar');
      assert.equal(this.$('#args-5').text(), 'Foo4Bar5Baz');
    }

    ['@test dynamic arbitrary number of positional parameters']() {
      this.owner.register(
        'component:sample-component',
        template(
          strip`
            {{#each this.n as |name|}}
              {{name}}
            {{/each}}
          `,
          {
            component: class extends ClassicComponent {
              static positionalParams = 'n';
            },
            strictMode: false,
          }
        )
      );

      this.render(`{{sample-component this.user1 this.user2}}`, {
        user1: 'Foo',
        user2: 4,
      });

      this.assertText('Foo4');

      runTask(() => this.rerender());

      this.assertText('Foo4');

      runTask(() => this.context.set('user1', 'Bar'));

      this.assertText('Bar4');

      runTask(() => this.context.set('user2', '5'));

      this.assertText('Bar5');

      runTask(() => {
        this.context.set('user1', 'Foo');
        this.context.set('user2', 4);
      });

      this.assertText('Foo4');
    }

    ['@test (has-block) is true when block supplied']() {
      this.owner.register(
        'component:with-block',
        template(
          strip`
            {{#if (has-block)}}
              {{yield}}
            {{else}}
              No Block!
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(strip`
      {{#with-block}}
        In template
      {{/with-block}}`);

      this.assertText('In template');

      runTask(() => this.rerender());

      this.assertText('In template');
    }

    ['@test (has-block) is false when no block supplied']() {
      this.owner.register(
        'component:with-block',
        template(
          strip`
            {{#if (has-block)}}
              {{yield}}
            {{else}}
              No Block!
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render('{{with-block}}');

      this.assertText('No Block!');

      runTask(() => this.rerender());

      this.assertText('No Block!');
    }

    ['@test (has-block-params) is true when block param supplied']() {
      this.owner.register(
        'component:with-block',
        template(
          strip`
            {{#if (has-block-params)}}
              {{yield this}} - In Component
            {{else}}
              {{yield}} No Block!
            {{/if}}
          `,
          { component: class extends GlimmerComponent {}, strictMode: false }
        )
      );

      this.render(strip`
      {{#with-block as |something|}}
        In template
      {{/with-block}}`);

      this.assertText('In template - In Component');

      runTask(() => this.rerender());

      this.assertText('In template - In Component');
    }

    ['@test (has-block-params) is false when no block param supplied']() {
      this.owner.register(
        'component:with-block',
        template(
          strip`
            {{#if (has-block-params)}}
              {{yield this}}
            {{else}}
              {{yield}} No Block Param!
            {{/if}}
          `,
          { component: class extends GlimmerComponent {}, strictMode: false }
        )
      );

      this.render(strip`
      {{#with-block}}
        In block
      {{/with-block}}`);

      this.assertText('In block No Block Param!');

      runTask(() => this.rerender());

      this.assertText('In block No Block Param!');
    }

    ['@test static named positional parameters']() {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{this.name}}{{this.age}}'),
          class extends ClassicComponent {
            static positionalParams = ['name', 'age'];
          }
        )
      );

      this.render('{{sample-component "Quint" 4}}');

      this.assertText('Quint4');

      runTask(() => this.rerender());

      this.assertText('Quint4');
    }

    ['@test dynamic named positional parameters']() {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{this.name}}{{this.age}}'),
          class extends ClassicComponent {
            static positionalParams = ['name', 'age'];
          }
        )
      );

      this.render('{{sample-component this.myName this.myAge}}', {
        myName: 'Quint',
        myAge: 4,
      });

      this.assertText('Quint4');

      runTask(() => this.rerender());

      this.assertText('Quint4');

      runTask(() => this.context.set('myName', 'Sergio'));

      this.assertText('Sergio4');

      runTask(() => this.context.set('myAge', 2));

      this.assertText('Sergio2');

      runTask(() => {
        this.context.set('myName', 'Quint');
        this.context.set('myAge', 4);
      });

      this.assertText('Quint4');
    }

    ['@test yield to inverse']() {
      this.owner.register(
        'component:my-if',
        template(
          strip`
            {{#if @predicate}}
              Yes:{{yield @someValue}}
            {{else}}
              No:{{yield to="inverse"}}
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(
        strip`
      {{#my-if predicate=this.activated someValue=42 as |result|}}
        Hello{{result}}
      {{else}}
        Goodbye
      {{/my-if}}`,
        {
          activated: true,
        }
      );

      this.assertText('Yes:Hello42');

      runTask(() => this.rerender());

      this.assertText('Yes:Hello42');

      runTask(() => this.context.set('activated', false));

      this.assertText('No:Goodbye');

      runTask(() => this.context.set('activated', true));

      this.assertText('Yes:Hello42');
    }

    ['@test yield to else']() {
      this.owner.register(
        'component:my-if',
        template(
          strip`
            {{#if @predicate}}
              Yes:{{yield @someValue}}
            {{else}}
              No:{{yield to="else"}}
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(
        strip`
      {{#my-if predicate=this.activated someValue=42 as |result|}}
        Hello{{result}}
      {{else}}
        Goodbye
      {{/my-if}}`,
        {
          activated: true,
        }
      );

      this.assertText('Yes:Hello42');

      runTask(() => this.rerender());

      this.assertText('Yes:Hello42');

      runTask(() => this.context.set('activated', false));

      this.assertText('No:Goodbye');

      runTask(() => this.context.set('activated', true));

      this.assertText('Yes:Hello42');
    }

    ['@test expression (has-block) inverse']() {
      this.owner.register(
        'component:check-inverse',
        template(
          strip`
            {{#if (has-block "inverse")}}
              Yes
            {{else}}
              No
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(strip`
      {{#check-inverse}}{{/check-inverse}}
      {{#check-inverse}}{{else}}{{/check-inverse}}`);

      this.assertHTML('NoYes');

      this.assertStableRerender();
    }

    ['@test (has-block "inverse") in content position']() {
      this.owner.register(
        'component:check-inverse',
        template('[{{has-block "inverse"}}]', {
          component: templateOnly(),
          strictMode: false,
        })
      );

      this.render(strip`
      {{#check-inverse}}{{/check-inverse}}
      {{#check-inverse}}{{else}}{{/check-inverse}}`);

      this.assertHTML('[false][true]');

      this.assertStableRerender();
    }

    ['@test expression (has-block) default']() {
      this.owner.register(
        'component:check-block',
        template(
          strip`
            {{#if (has-block)}}
              Yes
            {{else}}
              No
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(strip`
      {{check-block}}
      {{#check-block}}{{/check-block}}`);

      this.assertHTML('NoYes');

      this.assertStableRerender();
    }

    ['@test expression (has-block-params) inverse']() {
      this.owner.register(
        'component:check-inverse',
        template(
          strip`
            {{#if (has-block-params "inverse")}}
              Yes
            {{else}}
              No
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(strip`
      {{#check-inverse}}{{/check-inverse}}
      {{#check-inverse as |something|}}{{/check-inverse}}`);

      this.assertHTML('NoNo');

      this.assertStableRerender();
    }

    ['@test expression (has-block-params) default']() {
      this.owner.register(
        'component:check-block',
        template(
          strip`
            {{#if (has-block-params)}}
              Yes
            {{else}}
              No
            {{/if}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.render(strip`
      {{#check-block}}{{/check-block}}
      {{#check-block as |something|}}{{/check-block}}`);

      this.assertHTML('NoYes');

      this.assertStableRerender();
    }

    ['@test (has-block) expression in an attribute'](assert) {
      this.owner.register(
        'component:check-attr',
        setComponentTemplate(
          precompileTemplate('<button name={{(has-block)}}></button>'),
          templateOnly()
        )
      );

      this.render(strip`
      {{check-attr}}
      {{#check-attr}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block) inverse expression in an attribute'](assert) {
      this.owner.register(
        'component:check-attr',
        setComponentTemplate(
          precompileTemplate('<button name={{(has-block "inverse")}}></button>'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr}}{{else}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block-params) expression in an attribute'](assert) {
      this.owner.register(
        'component:check-attr',
        setComponentTemplate(
          precompileTemplate('<button name={{(has-block-params)}}></button>'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr as |something|}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block-params) inverse expression in an attribute'](assert) {
      this.owner.register(
        'component:check-attr',
        setComponentTemplate(
          precompileTemplate('<button name={{(has-block-params "inverse")}}></button>'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr as |something|}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'false' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block) as a param to a helper']() {
      this.owner.register(
        'component:check-helper',
        setComponentTemplate(
          precompileTemplate('{{if (has-block) "true" "false"}}'),
          templateOnly()
        )
      );

      this.render(strip`
      {{check-helper}}
      {{#check-helper}}{{/check-helper}}`);

      this.assertHTML('falsetrue');

      this.assertStableRerender();
    }

    ['@test (has-block) inverse as a param to a helper']() {
      this.owner.register(
        'component:check-helper',
        setComponentTemplate(
          precompileTemplate('{{if (has-block "inverse") "true" "false"}}'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper}}{{else}}{{/check-helper}}`);

      this.assertHTML('falsetrue');

      this.assertStableRerender();
    }

    ['@test (has-block-params) as a param to a helper']() {
      this.owner.register(
        'component:check-helper',
        setComponentTemplate(
          precompileTemplate('{{if (has-block-params) "true" "false"}}'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper as |something|}}{{/check-helper}}`);

      this.assertHTML('falsetrue');

      this.assertStableRerender();
    }

    ['@test (has-block-params) inverse as a param to a helper']() {
      this.owner.register(
        'component:check-helper',
        setComponentTemplate(
          precompileTemplate('{{if (has-block-params "inverse") "true" "false"}}'),
          templateOnly()
        )
      );

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper as |something|}}{{/check-helper}}`);

      this.assertHTML('falsefalse');

      this.assertStableRerender();
    }

    ["@test when a property is changed during children's rendering"]() {
      let middle;

      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate('{{#x-middle}}{{x-inner value=this.value}}{{/x-middle}}'),
          class extends GlimmerComponent {
            value = 1;
          }
        )
      );

      class MiddleComponent extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          middle = this;
        }
        @tracked value = null;
      }

      this.owner.register(
        'component:x-middle',
        setComponentTemplate(
          precompileTemplate('<div id="middle-value">{{this.value}}</div>{{yield}}'),
          MiddleComponent
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div id="inner-value">{{@value}}</div>'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);
              middle.value = this.args.value;
            }
          }
        )
      );

      let expectedBacktrackingMessage = backtrackingMessageFor('value', MiddleComponent.name, {
        renderTree: ['x-outer', 'x-middle', 'this.value'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ["@test when a shared dependency is changed during children's rendering"]() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate(
            '<div id="outer-value">{{this.wrapper.content}}</div> {{x-inner value=this.value wrapper=this.wrapper}}'
          ),
          class extends GlimmerComponent {
            value = 1;
            wrapper = EmberObject.create({ content: null });
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div id="inner-value">{{@wrapper.content}}</div>'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);
              this.args.wrapper.set('content', this.args.value);
            }
          }
        )
      );

      let expectedBacktrackingMessage = backtrackingMessageFor('content', '<.+?>', {
        renderTree: ['x-outer', 'this.wrapper.content'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ["@test when a shared dependency is changed during children's rendering (tracked)"]() {
      class Wrapper {
        @tracked content = null;
      }

      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate(
            '<div id="outer-value">{{this.wrapper.content}}</div> {{x-inner value=this.value wrapper=this.wrapper}}'
          ),
          class extends GlimmerComponent {
            value = 1;
            wrapper = new Wrapper();
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div id="inner-value">{{@wrapper.content}}</div>'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);
              this.args.wrapper.content = this.args.value;
            }
          }
        )
      );

      let expectedBacktrackingMessage = backtrackingMessageFor('content', Wrapper.name, {
        renderTree: ['x-outer', 'this.wrapper.content'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ['@test non-block with each rendering child components']() {
      this.owner.register(
        'component:non-block',
        template(
          strip`
            In layout. {{#each @items as |item|}}
              [{{child-non-block item=item}}]
            {{/each}}
          `,
          { component: templateOnly(), strictMode: false }
        )
      );

      this.owner.register(
        'component:child-non-block',
        setComponentTemplate(precompileTemplate('Child: {{@item}}.'), templateOnly())
      );

      let items = emberA(['Tom', 'Dick', 'Harry']);

      this.render('{{non-block items=this.items}}', { items });

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

      runTask(() => this.rerender());

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

      runTask(() => this.context.get('items').pushObject('Sergio'));

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.][Child: Sergio.]');

      runTask(() => this.context.get('items').shiftObject());

      this.assertText('In layout. [Child: Dick.][Child: Harry.][Child: Sergio.]');

      runTask(() => this.context.set('items', emberA(['Tom', 'Dick', 'Harry'])));

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');
    }

    ['@test services can be injected into components']() {
      let serviceInstance;
      this.registerService(
        'name',
        class extends Service {
          init() {
            super.init(...arguments);
            serviceInstance = this;
          }
          last = 'Jackson';
        }
      );

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.name.last}}'),
          class extends GlimmerComponent {
            @service
            name;
          }
        )
      );

      this.render('{{foo-bar}}');

      this.assertText('Jackson');

      runTask(() => this.rerender());

      this.assertText('Jackson');

      runTask(() => {
        serviceInstance.set('last', 'McGuffey');
      });

      this.assertText('McGuffey');

      runTask(() => {
        serviceInstance.set('last', 'Jackson');
      });

      this.assertText('Jackson');
    }

    ['@test component yielding in an {{#each}} has correct block values after rerendering (GH#14284)']() {
      this.owner.register(
        'component:list-items',
        setComponentTemplate(
          precompileTemplate(`{{#each @items as |item|}}{{yield item}}{{/each}}`),
          templateOnly()
        )
      );

      this.render(
        strip`
      {{#list-items items=this.items as |thing|}}
        |{{thing}}|

        {{#if this.editMode}}
          Remove {{thing}}
        {{/if}}
      {{/list-items}}
    `,
        {
          editMode: false,
          items: ['foo', 'bar', 'qux', 'baz'],
        }
      );

      this.assertText('|foo||bar||qux||baz|');

      this.assertStableRerender();

      runTask(() => set(this.context, 'editMode', true));

      this.assertText('|foo|Remove foo|bar|Remove bar|qux|Remove qux|baz|Remove baz');

      runTask(() => set(this.context, 'editMode', false));

      this.assertText('|foo||bar||qux||baz|');
    }

    ["@test can use `{{this}}` to emit the component's toString value [GH#14581]"]() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this}}'),
          class extends GlimmerComponent {
            toString() {
              return 'special sauce goes here!';
            }
          }
        )
      );

      this.render('{{foo-bar}}');

      this.assertText('special sauce goes here!');
    }

    ['@test can use `{{this` to access paths on current context [GH#14581]']() {
      let instance;
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.foo.bar.baz}}'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);

              instance = this;
            }

            foo = {
              bar: {
                baz: 'huzzah!',
              },
            };
          }
        )
      );

      this.render('{{foo-bar}}');

      this.assertText('huzzah!');

      this.assertStableRerender();

      runTask(() => set(instance, 'foo.bar.baz', 'yippie!'));

      this.assertText('yippie!');

      runTask(() => set(instance, 'foo.bar.baz', 'huzzah!'));

      this.assertText('huzzah!');
    }

    ['@test can use custom element in component layout']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('<blah-zorz>Hi!</blah-zorz>'), templateOnly())
      );

      this.render('{{foo-bar}}');

      this.assertText('Hi!');
    }

    ['@test can use nested custom element in component layout']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<blah-zorz><hows-it-going>Hi!</hows-it-going></blah-zorz>'),
          templateOnly()
        )
      );

      this.render('{{foo-bar}}');

      this.assertText('Hi!');
    }

    ['@test can access properties off of rest style positionalParams array']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{this.things.length}}`),
          class extends ClassicComponent {
            static positionalParams = 'things';
          }
        )
      );

      this.render('{{foo-bar "foo" "bar" "baz"}}');

      this.assertText('3');
    }

    ['@test ensure aliases are watched properly [GH#17243]']() {
      let fooInstance, barInstance;

      let FooComponent = class extends GlimmerComponent {
        source = 'first';

        @alias('source')
        foo;

        constructor(owner, args) {
          super(owner, args);
          fooInstance = this;
        }
      };

      this.owner.register(
        'component:foo',
        setComponentTemplate(precompileTemplate('{{this.foo}}'), FooComponent)
      );

      let BarComponent = class extends GlimmerComponent {
        target = null;

        constructor(owner, args) {
          super(owner, args);
          barInstance = this;
        }

        @computed('target.foo')
        get bar() {
          if (this.target) {
            return this.target.foo.toUpperCase();
          }
          return null;
        }
      };

      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('{{this.bar}}'), BarComponent)
      );

      this.render('[<Foo />][<Bar />]');

      this.assertText('[first][]');

      // addObserver
      runTask(() => set(barInstance, 'target', fooInstance));

      this.assertText('[first][FIRST]');

      runTask(() => set(fooInstance, 'source', 'second'));

      this.assertText('[second][SECOND]');

      // removeObserver
      runTask(() => set(barInstance, 'target', null));

      this.assertText('[second][]');

      runTask(() => set(fooInstance, 'source', 'third'));

      this.assertText('[third][]');
    }

    ['@test it can render a basic component in native ES class syntax'](assert) {
      let testContext = this;
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('hello'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);

              assert.equal(owner, testContext.owner, 'owner was passed as a constructor argument');
            }
          }
        )
      );

      this.render('{{foo-bar}}');

      this.assertHTML('hello');

      runTask(() => this.rerender());

      this.assertHTML('hello');
    }

    ['@test can use `{{@component.foo}}` in a template GH#19313']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{@component.foo}}'), templateOnly())
      );

      this.render('{{foo-bar component=(hash foo="bar")}}');

      this.assertHTML('bar');

      runTask(() => this.rerender());

      this.assertHTML('bar');
    }

    '@test `{{#let blah as |foo|}}` does not affect `<Foo />` resolution'() {
      this.owner.register(
        'component:foo',
        setComponentTemplate(precompileTemplate('foo component'), templateOnly())
      );

      this.render('{{#let "foo block param" as |foo|}}<Foo />{{/let}}');

      this.assertText('foo component');

      runTask(() => this.rerender());

      this.assertText('foo component');
    }

    ['@test class is applied before modifiers are installed'](assert) {
      assert.expect(1);

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div class={{@class}} {{this.inserted}}></div>'),
          class extends GlimmerComponent {
            inserted = defineSimpleModifier((element) => {
              assert.ok(element.classList.contains('foo-bar'), 'the class is on the element');
            });
          }
        )
      );

      this.render('{{foo-bar class="foo-bar"}}');
    }

    ['@test child triggers revalidate during parent destruction (GH#13846)']() {
      this.owner.register(
        'component:x-select',
        setComponentTemplate(
          precompileTemplate('<select>{{yield this}}</select>'),
          class extends GlimmerComponent {
            @tracked value = null;

            options = [];

            updateValue() {
              let last = this.options[this.options.length - 1];

              this.value = last ? last.args.value : null;
            }

            registerOption(option) {
              this.options.push(option);
            }

            unregisterOption(option) {
              this.options.splice(this.options.indexOf(option), 1);

              this.updateValue();
            }
          }
        )
      );

      this.owner.register(
        'component:x-option',
        setComponentTemplate(
          precompileTemplate('<option selected={{this.selected}}>{{yield}}</option>'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);

              this.args.select.registerOption(this);
            }

            get selected() {
              return this.args.value === this.args.select.value;
            }

            willDestroy() {
              super.willDestroy();

              this.args.select.unregisterOption(this);
            }
          }
        )
      );

      this.render(strip`
      {{#x-select as |select|}}
        {{#x-option value="1" select=select}}1{{/x-option}}
        {{#x-option value="2" select=select}}2{{/x-option}}
      {{/x-select}}
    `);

      this.teardown();

      this.assert.ok(true, 'no errors during teardown');
    }

    ['@test setting a tracked property in willDestroy does not assert (GH#14273)'](assert) {
      assert.expect(2);

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{#if this.showFoo}}things{{/if}}`),
          class extends GlimmerComponent {
            @tracked showFoo = true;

            willDestroy() {
              super.willDestroy();

              this.showFoo = false;
              assert.ok(true, 'willDestroy was fired');
            }
          }
        )
      );

      this.render(`{{foo-bar}}`);

      this.assertText('things');
    }
  }
);
