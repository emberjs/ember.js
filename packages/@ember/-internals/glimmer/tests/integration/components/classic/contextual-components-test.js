import {
  moduleFor,
  RenderingTestCase,
  applyMixins,
  strip,
  runTask,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { action } from '@ember/object';
import { A as emberA } from '@ember/array';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { Component as EmberComponent } from '../../../utils/helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Components test: contextual components (classic component)',
    class extends RenderingTestCase {
      ['@test conflicting positional and hash parameters does not raise an assertion if rerendered']() {
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        expectClassicComponentDeprecation();

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
        [`@test parameters in a contextual component are mutable when value is a ${title}`](
          assert
        ) {
          expectClassicComponentDeprecation();

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
          this.owner.register(
            'component:my-comp',
            setComponentTemplate(
              precompileTemplate('{{component this.components.comp}}'),
              class extends EmberComponent {
                static positionalParams = ['components'];
              }
            )
          );

          this.render('{{my-comp (hash comp=(component "change-button" this.model.val2))}}');
        },
      },
    ])
  );

  moduleFor(
    'Components test: contextual components -- mutable params (classic component)',
    ContextualComponentMutableParamsTest
  );
}
