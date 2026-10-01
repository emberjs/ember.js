import {
  moduleFor,
  RenderingTestCase,
  strip,
  classes,
  runTask,
  runLoopSettled,
  expectDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../../../deprecations';
import { action } from '@ember/object';
import { run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@ember/-internals/metal';
import { on } from '@ember/object/evented';
import { service } from '@ember/service';
import { set, get, computed, observer } from '@ember/object';
import { A as emberA } from '@ember/array';
import { Component } from '../../../utils/helpers';
import { template } from '@ember/template-compiler/runtime';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'Components test: curly components (classic component)',
  class extends RenderingTestCase {
    ['@test it can have a custom id and it is not bound']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.id}} {{this.elementId}}'),
          class extends Component {}
        )
      );

      this.render('{{foo-bar id=this.customId}}', {
        customId: 'bizz',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });

      runTask(() => set(this.context, 'customId', 'bar'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bar bizz',
      });

      runTask(() => set(this.context, 'customId', 'bizz'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });
    }

    ['@test elementId cannot change'](assert) {
      let component;
      let FooBarComponent = class extends Component {
        elementId = 'blahzorz';
        init() {
          super.init(...arguments);
          component = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.elementId}}'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'blahzorz' },
        content: 'blahzorz',
      });

      if (DEBUG) {
        let willThrow = () => run(null, set, component, 'elementId', 'herpyderpy');

        assert.throws(willThrow, /Changing a view's elementId after creation is not allowed/);

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { id: 'blahzorz' },
          content: 'blahzorz',
        });
      }
    }

    ['@test elementId is stable when other values change']() {
      let changingArg = 'arbitrary value';
      let parentInstance;
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{quux-baz elementId="stable-id" changingArg=this.changingArg}}'),
          class extends Component {
            init() {
              super.init(...arguments);
              parentInstance = this;
            }
            changingArg = changingArg;
          }
        )
      );

      this.owner.register(
        'component:quux-baz',
        setComponentTemplate(precompileTemplate('{{this.changingArg}}'), class extends Component {})
      );

      this.render('{{foo-bar}}');
      this.assertComponentElement(this.firstChild.firstChild, {
        attrs: { id: 'stable-id' },
        content: 'arbitrary value',
      });

      changingArg = 'a different value';
      runTask(() => set(parentInstance, 'changingArg', changingArg));
      this.assertComponentElement(this.firstChild.firstChild, {
        attrs: { id: 'stable-id' },
        content: changingArg,
      });
    }

    ['@test can specify template with `layoutName` property']() {
      let FooBarComponent = class extends Component {
        elementId = 'blahzorz';
        layoutName = 'fizz-bar';
        init() {
          super.init(...arguments);
          this.local = 'hey';
        }
      };

      this.registerTemplate('fizz-bar', `FIZZ BAR {{this.local}}`);

      this.owner.register('component:foo-bar', FooBarComponent);

      this.render('{{foo-bar}}');

      this.assertText('FIZZ BAR hey');
    }

    ['@test layout supports computed property']() {
      let FooBarComponent = class extends Component {
        elementId = 'blahzorz';
        @computed
        get layout() {
          return precompileTemplate('so much layout wat {{this.lulz}}');
        }
        init() {
          super.init(...arguments);
          this.lulz = 'heyo';
        }
      };

      this.owner.register('component:foo-bar', FooBarComponent);

      this.render('{{foo-bar}}');

      this.assertText('so much layout wat heyo');
    }

    ['@test passing undefined elementId results in a default elementId'](assert) {
      let FooBarComponent = class extends Component {
        tagName = 'h1';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('something'), FooBarComponent)
      );

      this.render('{{foo-bar id=this.somethingUndefined}}');

      let foundId = this.$('h1').attr('id');
      assert.ok(
        /^ember/.test(foundId),
        'Has a reasonable id attribute (found id=' + foundId + ').'
      );

      runTask(() => this.rerender());

      let newFoundId = this.$('h1').attr('id');
      assert.ok(
        /^ember/.test(newFoundId),
        'Has a reasonable id attribute (found id=' + newFoundId + ').'
      );

      assert.equal(foundId, newFoundId);
    }

    ['@test id is an alias for elementId'](assert) {
      let FooBarComponent = class extends Component {
        tagName = 'h1';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('something'), FooBarComponent)
      );

      this.render('{{foo-bar id="custom-id"}}');

      let foundId = this.$('h1').attr('id');
      assert.equal(foundId, 'custom-id');

      runTask(() => this.rerender());

      let newFoundId = this.$('h1').attr('id');
      assert.equal(newFoundId, 'custom-id');

      assert.equal(foundId, newFoundId);
    }

    ['@test cannot pass both id and elementId at the same time']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate(''), class extends Component {})
      );

      expectAssertion(() => {
        this.render('{{foo-bar id="zomg" elementId="lol"}}');
      }, /You cannot invoke a component with both 'id' and 'elementId' at the same time./);
    }

    ['@test it can have a custom tagName']() {
      let FooBarComponent = class extends Component {
        tagName = 'foo-bar';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });
    }

    ['@test it can have a custom tagName set in the constructor']() {
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          this.tagName = 'foo-bar';
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });
    }

    ['@test it can have a custom tagName from the invocation']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar tagName="foo-bar"}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });
    }

    ['@test tagName can not be a computed property']() {
      let FooBarComponent = class extends Component {
        @computed
        get tagName() {
          return 'foo-bar';
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You cannot use a computed property for the component's `tagName` \(<.+?>\)\./);
    }

    ['@test class is applied before didInsertElement'](assert) {
      let componentClass;
      let FooBarComponent = class extends Component {
        didInsertElement() {
          componentClass = this.element.className;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar class="foo-bar"}}');

      assert.equal(componentClass, 'foo-bar ember-view');
    }

    ['@test it can have custom classNames']() {
      let FooBarComponent = class extends Component {
        classNames = ['foo', 'bar'];
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar') },
        content: 'hello',
      });
    }

    ['@test should not apply falsy class name']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar class=this.somethingFalsy}}', {
        somethingFalsy: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });
    }

    ['@test should update class using inline if, initially false, no alternate']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar class=(if this.predicate "thing") }}', {
        predicate: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', true));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', false));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });
    }

    ['@test should update class using inline if, initially true, no alternate']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar class=(if this.predicate "thing") }}', {
        predicate: true,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', false));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', true));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });
    }

    ['@test class property on components can be dynamic']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar class=(if this.fooBar "foo-bar")}}', {
        fooBar: true,
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });

      runTask(() => set(this.context, 'fooBar', false));

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view') },
      });

      runTask(() => set(this.context, 'fooBar', true));

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });
    }

    ['@test it can have custom classNames from constructor']() {
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          this.classNames = this.classNames.slice();
          this.classNames.push('foo', 'bar', `outside-${this.get('extraClass')}`);
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar extraClass="baz"}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar outside-baz') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar outside-baz') },
        content: 'hello',
      });
    }

    ['@test it can set custom classNames from the invocation']() {
      let FooBarComponent = class extends Component {
        classNames = ['foo'];
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render(strip`
      {{foo-bar class="bar baz"}}
      {{foo-bar classNames="bar baz"}}
      {{foo-bar}}
    `);

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });
    }

    ['@test it has an element']() {
      let instance;

      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          instance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      let element1 = instance.element;

      this.assertComponentElement(element1, { content: 'hello' });

      runTask(() => this.rerender());

      let element2 = instance.element;

      this.assertComponentElement(element2, { content: 'hello' });

      this.assertSameNode(element2, element1);
    }

    ['@test an empty component does not have childNodes'](assert) {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        tagName = 'input';
        init() {
          super.init(...arguments);
          fooBarInstance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate(''), FooBarComponent)
      );

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { tagName: 'input' });

      assert.strictEqual(fooBarInstance.element.childNodes.length, 0);

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { tagName: 'input' });

      assert.strictEqual(fooBarInstance.element.childNodes.length, 0);
    }

    ['@test it has the right parentView and childViews'](assert) {
      let fooBarInstance, fooBarBazInstance;

      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          fooBarInstance = this;
        }
      };

      let FooBarBazComponent = class extends Component {
        init() {
          super.init(...arguments);
          fooBarBazInstance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('foo-bar {{foo-bar-baz}}'), FooBarComponent)
      );
      this.owner.register(
        'component:foo-bar-baz',
        setComponentTemplate(precompileTemplate('foo-bar-baz'), FooBarBazComponent)
      );

      this.render('{{foo-bar}}');
      this.assertText('foo-bar foo-bar-baz');

      assert.equal(fooBarInstance.parentView, this.component);
      assert.equal(fooBarBazInstance.parentView, fooBarInstance);

      assert.deepEqual(this.component.childViews, [fooBarInstance]);
      assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);

      runTask(() => this.rerender());
      this.assertText('foo-bar foo-bar-baz');

      assert.equal(fooBarInstance.parentView, this.component);
      assert.equal(fooBarBazInstance.parentView, fooBarInstance);

      assert.deepEqual(this.component.childViews, [fooBarInstance]);
      assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);
    }

    ['@test it reflects named arguments as properties']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.foo}}'), class extends Component {})
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

    ['@test late bound layouts return the same definition'](assert) {
      let templateIds = [];

      // This is testing the scenario where you import a template and
      // set it to the layout property:
      //
      // import Component from '@ember/component';
      // import layout from './template';
      //
      // export default Component.extend({
      //   layout
      // });
      let hello = precompileTemplate('Hello');
      let bye = precompileTemplate('Bye');

      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          this.layout = this.cond ? hello : bye;
          templateIds.push(this.layout.id);
        }
      };

      this.owner.register('component:foo-bar', FooBarComponent);

      this.render(
        '{{foo-bar cond=true}}{{foo-bar cond=false}}{{foo-bar cond=true}}{{foo-bar cond=false}}'
      );

      let [t1, t2, t3, t4] = templateIds;
      assert.equal(t1, t3);
      assert.equal(t2, t4);
    }

    // Perhaps change this test to `{{this.attrs.someProp.value}}` when removing the deprecation?
    ['@test non-block with properties on this.attrs']() {
      expectDeprecation(() => {
        this.owner.register(
          'component:non-block',
          template('In layout - someProp: {{this.attrs.someProp}}', {
            component: class extends Component {},
            strictMode: false,
          })
        );
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.someProp}} should be updated to {{@someProp}}./);

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

    ['@test non-block with properties overridden in init']() {
      let instance;
      this.owner.register(
        'component:non-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{this.someProp}}'),
          class extends Component {
            init() {
              super.init(...arguments);
              instance = this;
              this.someProp = 'value set in instance';
            }
          }
        )
      );

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something passed when invoked',
      });

      this.assertText('In layout - someProp: value set in instance');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: value set in instance');

      runTask(() => this.context.set('prop', 'updated something passed when invoked'));

      this.assertText('In layout - someProp: updated something passed when invoked');

      runTask(() => instance.set('someProp', 'update value set in instance'));

      this.assertText('In layout - someProp: update value set in instance');

      runTask(() => this.context.set('prop', 'something passed when invoked'));
      runTask(() => instance.set('someProp', 'value set in instance'));

      this.assertText('In layout - someProp: value set in instance');
    }

    ['@test rerendering component with attrs from parent'](assert) {
      let willUpdateCount = 0;
      let didReceiveAttrsCount = 0;

      function expectHooks({ willUpdate, didReceiveAttrs }, callback) {
        willUpdateCount = 0;
        didReceiveAttrsCount = 0;

        callback();

        if (willUpdate) {
          assert.strictEqual(willUpdateCount, 1, 'The willUpdate hook was fired');
        } else {
          assert.strictEqual(willUpdateCount, 0, 'The willUpdate hook was not fired');
        }

        if (didReceiveAttrs) {
          assert.strictEqual(didReceiveAttrsCount, 1, 'The didReceiveAttrs hook was fired');
        } else {
          assert.strictEqual(didReceiveAttrsCount, 0, 'The didReceiveAttrs hook was not fired');
        }
      }

      this.owner.register(
        'component:non-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{this.someProp}}'),
          class extends Component {
            didReceiveAttrs() {
              didReceiveAttrsCount++;
            }

            willUpdate() {
              willUpdateCount++;
            }
          }
        )
      );

      expectHooks({ willUpdate: false, didReceiveAttrs: true }, () => {
        this.render('{{non-block someProp=this.someProp}}', {
          someProp: 'wycats',
        });
      });

      this.assertText('In layout - someProp: wycats');

      // Note: Hooks are not fired in Glimmer for idempotent re-renders
      expectHooks({ willUpdate: false, didReceiveAttrs: false }, () => {
        runTask(() => this.rerender());
      });

      this.assertText('In layout - someProp: wycats');

      expectHooks({ willUpdate: true, didReceiveAttrs: true }, () => {
        runTask(() => this.context.set('someProp', 'tomdale'));
      });

      this.assertText('In layout - someProp: tomdale');

      // Note: Hooks are not fired in Glimmer for idempotent re-renders
      expectHooks({ willUpdate: false, didReceiveAttrs: false }, () => {
        runTask(() => this.rerender());
      });

      this.assertText('In layout - someProp: tomdale');

      expectHooks({ willUpdate: true, didReceiveAttrs: true }, () => {
        runTask(() => this.context.set('someProp', 'wycats'));
      });

      this.assertText('In layout - someProp: wycats');
    }

    ['@test setting a value for a computed property then later getting the value for that property works'](
      assert
    ) {
      let componentInstance = null;

      this.owner.register(
        'component:non-block',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.myClick}}>foobar</button>'),
          class extends Component {
            counter = computed({
              set(key, value) {
                return value;
              },
            });

            init() {
              super.init(...arguments);
              componentInstance = this;
            }

            @action
            myClick() {
              let currentCounter = this.get('counter');

              assert.equal(currentCounter, 0, 'the current `counter` value is correct');

              let newCounter = currentCounter + 1;
              this.set('counter', newCounter);

              assert.equal(
                this.get('counter'),
                newCounter,
                "getting the newly set `counter` property works; it's equal to the value we just set and not `undefined`"
              );
            }
          }
        )
      );

      this.render(`{{non-block counter=this.counter}}`, {
        counter: 0,
      });

      runTask(() => this.$('button').click());

      assert.equal(
        componentInstance.get('counter'),
        1,
        '`counter` incremented on click on the component and is not `undefined`'
      );
    }

    // Perhaps change this test to `{{this.attrs.foo.value}}` when removing the deprecation?
    ['@test this.attrs.foo === @foo === foo']() {
      expectDeprecation(() => {
        this.owner.register(
          'component:foo-bar',
          template(
            strip`
              Args: {{this.attrs.value}} | {{@value}} | {{this.value}}
              {{#each this.attrs.items as |item|}}
                {{item}}
              {{/each}}
              {{#each @items as |item|}}
                {{item}}
              {{/each}}
              {{#each this.items as |item|}}
                {{item}}
              {{/each}}
            `,
            { component: class extends Component {}, strictMode: false }
          )
        );
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs..+}} should be updated to {{@.+}}./);

      this.render('{{foo-bar value=this.model.value items=this.model.items}}', {
        model: {
          value: 'wat',
          items: [1, 2, 3],
        },
      });

      this.assertStableRerender();

      runTask(() => {
        this.context.set('model.value', 'lul');
        this.context.set('model.items', [1]);
      });

      this.assertText(strip`Args: lul | lul | lul111`);

      runTask(() => this.context.set('model', { value: 'wat', items: [1, 2, 3] }));

      this.assertText('Args: wat | wat | wat123123123');
    }

    ['@test non-block with properties on self']() {
      this.owner.register(
        'component:non-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{this.someProp}}'),
          class extends Component {}
        )
      );

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something here',
      });

      this.assertText('In layout - someProp: something here');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here');
    }

    ['@test block with properties on self']() {
      this.owner.register(
        'component:with-block',
        setComponentTemplate(
          precompileTemplate('In layout - someProp: {{this.someProp}} - {{yield}}'),
          class extends Component {}
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

    // Perhaps change this test to `{{this.attrs.someProp.value}}` when removing the deprecation?
    ['@test block with properties on this.attrs']() {
      expectDeprecation(() => {
        this.owner.register(
          'component:with-block',
          template('In layout - someProp: {{this.attrs.someProp}} - {{yield}}', {
            component: class extends Component {},
            strictMode: false,
          })
        );
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.someProp}} should be updated to {{@someProp}}./);

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

    ['@test arbitrary positional parameter conflict with hash parameter is reported']() {
      this.owner.register(
        'component:sample-component',
        template(
          strip`
            {{#each this.names as |name|}}
              {{name}}
            {{/each}}
          `,
          {
            component: class extends Component {
              static positionalParams = 'names';
            },
            strictMode: false,
          }
        )
      );

      expectAssertion(() => {
        this.render(`{{sample-component "Foo" 4 "Bar" names=this.numbers id="args-3"}}`, {
          numbers: [1, 2, 3],
        });
      }, 'You cannot specify positional parameters and the hash argument `names`.');
    }

    ['@test can use hash parameter instead of arbitrary positional param [GH #12444]']() {
      this.owner.register(
        'component:sample-component',
        template(
          strip`
            {{#each this.names as |name|}}
              {{name}}
            {{/each}}
          `,
          {
            component: class extends Component {
              static positionalParams = 'names';
            },
            strictMode: false,
          }
        )
      );

      this.render('{{sample-component names=this.things}}', {
        things: emberA(['Foo', 4, 'Bar']),
      });

      this.assertText('Foo4Bar');

      runTask(() => this.rerender());

      this.assertText('Foo4Bar');

      runTask(() => this.context.get('things').pushObject(5));

      this.assertText('Foo4Bar5');

      runTask(() => this.context.get('things').shiftObject());

      this.assertText('4Bar5');

      runTask(() => this.context.get('things').clear());

      this.assertText('');

      runTask(() => this.context.set('things', emberA(['Foo', 4, 'Bar'])));

      this.assertText('Foo4Bar');
    }

    ['@test can use hash parameter instead of positional param'](assert) {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{this.first}} - {{this.second}}'),
          class extends Component {
            static positionalParams = ['first', 'second'];
          }
        )
      );

      // TODO: Fix when id is implemented
      this.render(strip`
      {{sample-component "one" "two" elementId="two-positional"}}
      {{sample-component "one" second="two" elementId="one-positional"}}
      {{sample-component first="one" second="two" elementId="no-positional"}}`);

      assert.equal(this.$('#two-positional').text(), 'one - two');
      assert.equal(this.$('#one-positional').text(), 'one - two');
      assert.equal(this.$('#no-positional').text(), 'one - two');

      runTask(() => this.rerender());

      assert.equal(this.$('#two-positional').text(), 'one - two');
      assert.equal(this.$('#one-positional').text(), 'one - two');
      assert.equal(this.$('#no-positional').text(), 'one - two');
    }

    ['@test with ariaRole specified']() {
      this.owner.register(
        'component:aria-test',
        setComponentTemplate(precompileTemplate('Here!'), class extends Component {})
      );

      this.render('{{aria-test ariaRole=this.role}}', {
        role: 'main',
      });

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });

      runTask(() => this.context.set('role', 'input'));

      this.assertComponentElement(this.firstChild, {
        attrs: { role: 'input' },
      });

      runTask(() => this.context.set('role', 'main'));

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });
    }

    ['@test with ariaRole defined but initially falsey GH#16379']() {
      this.owner.register(
        'component:aria-test',
        setComponentTemplate(precompileTemplate('Here!'), class extends Component {})
      );

      this.render('{{aria-test ariaRole=this.role}}', {
        role: undefined,
      });

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.context.set('role', 'input'));

      this.assertComponentElement(this.firstChild, {
        attrs: { role: 'input' },
      });

      runTask(() => this.context.set('role', undefined));

      this.assertComponentElement(this.firstChild, { attrs: {} });
    }

    ['@test without ariaRole defined initially']() {
      // we are using the ability to lazily add a role as a sign that we are
      // doing extra work
      let instance;
      this.owner.register(
        'component:aria-test',
        setComponentTemplate(
          precompileTemplate('Here!'),
          class extends Component {
            init() {
              super.init(...arguments);
              instance = this;
            }
          }
        )
      );

      this.render('{{aria-test}}');

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => instance.set('ariaRole', 'input'));

      this.assertComponentElement(this.firstChild, { attrs: {} });
    }

    ['@test `template` specified in component is overridden by block']() {
      this.owner.register(
        'component:with-template',
        setComponentTemplate(
          precompileTemplate('[In layout - {{this.name}}] {{yield}}'),
          class extends Component {
            template = 'Should not be used';
          }
        )
      );

      this.render(
        strip`
      {{#with-template name="with-block"}}
        [In block - {{this.name}}]
      {{/with-template}}
      {{with-template name="without-block"}}`,
        {
          name: 'Whoop, whoop!',
        }
      );

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );

      runTask(() => this.rerender());

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );

      runTask(() => this.context.set('name', 'Ole, ole'));

      this.assertText('[In layout - with-block] [In block - Ole, ole][In layout - without-block] ');

      runTask(() => this.context.set('name', 'Whoop, whoop!'));

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );
    }

    ['@test if a value is passed as a non-positional parameter, it raises an assertion']() {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{this.name}}'),
          class extends Component {
            static positionalParams = ['name'];
          }
        )
      );

      expectAssertion(() => {
        this.render('{{sample-component this.notMyName name=this.myName}}', {
          myName: 'Quint',
          notMyName: 'Sergio',
        });
      }, 'You cannot specify both a positional param (at position 0) and the hash argument `name`.');
    }

    ['@test component in template of a yielding component should have the proper parentView'](
      assert
    ) {
      let outer, innerTemplate, innerLayout;

      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate('{{x-inner-in-layout}}{{yield}}'),
          class extends Component {
            init() {
              super.init(...arguments);
              outer = this;
            }
          }
        )
      );

      this.owner.register(
        'component:x-inner-in-template',
        class extends Component {
          init() {
            super.init(...arguments);
            innerTemplate = this;
          }
        }
      );

      this.owner.register(
        'component:x-inner-in-layout',
        class extends Component {
          init() {
            super.init(...arguments);
            innerLayout = this;
          }
        }
      );

      this.render('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}');

      assert.equal(
        innerTemplate.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );
      assert.equal(
        innerLayout.parentView,
        outer,
        'receives the wrapping component as its parentView in layout'
      );
      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );

      runTask(() => this.rerender());

      assert.equal(
        innerTemplate.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );
      assert.equal(
        innerLayout.parentView,
        outer,
        'receives the wrapping component as its parentView in layout'
      );
      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
    }

    ['@test newly-added sub-components get correct parentView'](assert) {
      let outer, inner;

      this.owner.register(
        'component:x-outer',
        class extends Component {
          init() {
            super.init(...arguments);
            outer = this;
          }
        }
      );

      this.owner.register(
        'component:x-inner',
        class extends Component {
          init() {
            super.init(...arguments);
            inner = this;
          }
        }
      );

      this.render(
        strip`
      {{#x-outer}}
        {{#if this.showInner}}
          {{x-inner}}
        {{/if}}
      {{/x-outer}}`,
        {
          showInner: false,
        }
      );

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );

      runTask(() => this.rerender());

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView (after rerender)'
      );

      runTask(() => this.context.set('showInner', true));

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
      assert.equal(
        inner.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );

      runTask(() => this.context.set('showInner', false));

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
    }

    ['@test specifying classNames results in correct class'](assert) {
      this.owner.register(
        'component:some-clicky-thing',
        class extends Component {
          tagName = 'button';
          classNames = ['foo', 'bar'];
        }
      );

      this.render(strip`
      {{#some-clicky-thing classNames="baz"}}
        Click Me
      {{/some-clicky-thing}}`);

      // TODO: ember-view is no longer viewable in the classNames array. Bug or
      // feature?
      let expectedClassNames = ['ember-view', 'foo', 'bar', 'baz'];

      assert.ok(
        this.$('button').is('.foo.bar.baz.ember-view'),
        `the element has the correct classes: ${this.$('button').attr('class')}`
      );
      // `ember-view` is no longer in classNames.
      // assert.deepEqual(clickyThing.get('classNames'), expectedClassNames, 'classNames are properly combined');
      this.assertComponentElement(this.firstChild, {
        tagName: 'button',
        attrs: { class: classes(expectedClassNames.join(' ')) },
      });

      runTask(() => this.rerender());

      assert.ok(
        this.$('button').is('.foo.bar.baz.ember-view'),
        `the element has the correct classes: ${this.$('button').attr('class')} (rerender)`
      );
      // `ember-view` is no longer in classNames.
      // assert.deepEqual(clickyThing.get('classNames'), expectedClassNames, 'classNames are properly combined (rerender)');
      this.assertComponentElement(this.firstChild, {
        tagName: 'button',
        attrs: { class: classes(expectedClassNames.join(' ')) },
      });
    }

    ['@test specifying custom concatenatedProperties avoids clobbering']() {
      this.owner.register(
        'component:some-clicky-thing',
        template(
          strip`
            {{#each this.blahzz as |p|}}
              {{p}}
            {{/each}}
            - {{yield}}
          `,
          {
            component: class extends Component {
              concatenatedProperties = ['blahzz'];
              blahzz = ['blark', 'pory'];
            },
            strictMode: false,
          }
        )
      );

      this.render(strip`
      {{#some-clicky-thing blahzz="baz"}}
        Click Me
      {{/some-clicky-thing}}`);

      this.assertText('blarkporybaz- Click Me');

      runTask(() => this.rerender());

      this.assertText('blarkporybaz- Click Me');
    }

    ['@test a two way binding flows upstream when consumed in the template']() {
      let component;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          component = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.bar}}'), FooBarComponent)
      );

      this.render('{{this.localBar}} - {{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value - initial value');

      runTask(() => this.rerender());

      this.assertText('initial value - initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value - updated value');

      runTask(() => {
        component.set('bar', undefined);
      });

      this.assertText(' - ');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value - initial value');
    }

    ['@test a two way binding flows upstream through a CP when consumed in the template']() {
      let component;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          component = this;
        }

        @computed
        get bar() {
          return this._bar;
        }
        set bar(value) {
          this._bar = value;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.bar}}'), FooBarComponent)
      );

      this.render('{{this.localBar}} - {{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value - initial value');

      runTask(() => this.rerender());

      this.assertText('initial value - initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value - updated value');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value - initial value');
    }

    ['@test a two way binding flows upstream through a CP without template consumption']() {
      let component;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          component = this;
        }

        @computed
        get bar() {
          return this._bar;
        }

        set bar(value) {
          this._bar = value;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate(''), FooBarComponent)
      );

      this.render('{{this.localBar}}{{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value');

      runTask(() => this.rerender());

      this.assertText('initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value');
    }

    ['@test GH#18417 - a two way binding flows upstream to a parent component through a CP']() {
      let parent, child;
      let ParentComponent = class extends Component {
        init() {
          super.init(...arguments);
          parent = this;
        }

        @tracked string = 'Hello|World';
      };

      this.owner.register(
        'component:parent',
        setComponentTemplate(
          precompileTemplate(
            '{{child value=this.string}}Parent String=<span data-test-parent-value>{{this.string}}</span>'
          ),
          ParentComponent
        )
      );

      let ChildComponent = class extends Component {
        init() {
          super.init(...arguments);
          child = this;
        }

        a = null; // computed based on passed in value of `string`
        b = null; // computed based on passed in value of `string`

        @computed('a', 'b')
        get value() {
          return this.a + '|' + this.b;
        }

        set value(value) {
          let vals = value.split('|');
          this.set('a', vals[0]);
          this.set('b', vals[1]);
        }
      };

      this.owner.register(
        'component:child',
        setComponentTemplate(precompileTemplate('{{this.value}}'), ChildComponent)
      );

      this.render('{{parent}}');

      this.assert.equal(parent.string, 'Hello|World', 'precond - parent value');
      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Hello|World',
        'precond - parent rendered value'
      );

      runTask(() => {
        child.set('a', 'Foo');
      });

      this.assert.equal(parent.string, 'Foo|World', 'parent value updated');

      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Foo|World',
        'parent updated value rendered'
      );

      runTask(() => {
        child.set('a', 'Hello');
      });

      this.assert.equal(parent.string, 'Hello|World', 'parent value reset');
      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Hello|World',
        'parent template reset'
      );
    }

    ['@test injecting an unknown service raises an exception']() {
      this.owner.register(
        'component:foo-bar',
        class extends Component {
          @service
          missingService;
        }
      );

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, "Attempting to inject an unknown injection: 'service:missingService'");
    }

    ['@test throws if `super.init` is not called from `init`']() {
      this.owner.register(
        'component:foo-bar',
        class extends Component {
          init() {}
        }
      );

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You must call `super.init\(...arguments\);` or `this._super\(...arguments\)` when overriding `init` on a framework object. Please update .*/);
    }

    ['@test it can use readDOMAttr to read input value']() {
      let component;
      let assertElement = (expectedValue) => {
        // value is a property, not an attribute
        this.assertHTML(`<input class="ember-view" id="${component.elementId}">`);
        this.assert.equal(this.firstChild.value, expectedValue, 'value property is correct');
        this.assert.equal(
          get(component, 'value'),
          expectedValue,
          'component.get("value") is correct'
        );
      };

      this.owner.register(
        'component:one-way-input',
        class extends Component {
          tagName = 'input';
          attributeBindings = ['value'];

          init() {
            super.init(...arguments);
            component = this;
          }

          change() {
            let value = this.readDOMAttr('value');
            this.set('value', value);
          }
        }
      );

      this.render('{{one-way-input value=this.value}}', {
        value: 'foo',
      });

      assertElement('foo');

      this.assertStableRerender();

      runTask(() => {
        this.firstChild.value = 'bar';
        this.$('input').trigger('change');
      });

      assertElement('bar');

      runTask(() => {
        this.firstChild.value = 'foo';
        this.$('input').trigger('change');
      });

      assertElement('foo');

      runTask(() => {
        set(component, 'value', 'bar');
      });

      assertElement('bar');

      runTask(() => {
        this.firstChild.value = 'foo';
        this.$('input').trigger('change');
      });

      assertElement('foo');
    }

    ['@test child triggers revalidate during parent destruction (GH#13846)']() {
      this.owner.register(
        'component:x-select',
        setComponentTemplate(
          precompileTemplate('{{yield this}}'),
          class extends Component {
            tagName = 'select';

            init() {
              super.init(...arguments);
              this.options = emberA([]);
              this.value = null;
            }

            updateValue() {
              let newValue = this.get('options.lastObject.value');

              this.set('value', newValue);
            }

            registerOption(option) {
              this.get('options').addObject(option);
            }

            unregisterOption(option) {
              this.get('options').removeObject(option);

              this.updateValue();
            }
          }
        )
      );

      this.owner.register(
        'component:x-option',
        class extends Component {
          tagName = 'option';
          attributeBindings = ['selected'];

          didInsertElement() {
            super.didInsertElement(...arguments);

            this.get('select').registerOption(this);
          }

          @computed('select.value')
          get selected() {
            return this.get('value') === this.get('select.value');
          }

          willDestroyElement() {
            super.willDestroyElement(...arguments);
            this.get('select').unregisterOption(this);
          }
        }
      );

      this.render(strip`
      {{#x-select value=this.value as |select|}}
        {{#x-option value="1" select=select}}1{{/x-option}}
        {{#x-option value="2" select=select}}2{{/x-option}}
      {{/x-select}}
    `);

      this.teardown();

      this.assert.ok(true, 'no errors during teardown');
    }

    ['@test setting a property in willDestroyElement does not assert (GH#14273)'](assert) {
      assert.expect(2);

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{#if this.showFoo}}things{{/if}}`),
          class extends Component {
            init() {
              super.init(...arguments);
              this.showFoo = true;
            }

            willDestroyElement() {
              this.set('showFoo', false);
              assert.ok(true, 'willDestroyElement was fired');
              super.willDestroyElement(...arguments);
            }
          }
        )
      );

      this.render(`{{foo-bar}}`);

      this.assertText('things');
    }

    async ['@test didReceiveAttrs fires after .init() but before observers become active'](assert) {
      let barCopyDidChangeCount = 0;

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.bar}}-{{this.barCopy}}'),
          Component.extend({
            init() {
              this._super(...arguments);
              this.didInit = true;
            },

            didReceiveAttrs() {
              assert.ok(this.didInit, 'expected init to have run before didReceiveAttrs');
              this.set('barCopy', this.attrs.bar.value + 1);
            },

            barCopyDidChange: observer('barCopy', () => {
              barCopyDidChangeCount++;
            }),
          })
        )
      );

      await this.render(`{{foo-bar bar=this.bar}}`, { bar: 3 });

      this.assertText('3-4');

      assert.strictEqual(barCopyDidChangeCount, 1, 'expected observer firing for: barCopy');

      set(this.context, 'bar', 7);

      await runLoopSettled();

      this.assertText('7-8');

      assert.strictEqual(barCopyDidChangeCount, 2, 'expected observer firing for: barCopy');
    }

    ['@test overriding didReceiveAttrs does not trigger deprecation'](assert) {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.foo}}-{{this.fooCopy}}-{{this.bar}}-{{this.barCopy}}'),
          class extends Component {
            didReceiveAttrs() {
              assert.equal(1, this.get('foo'), 'expected attrs to have correct value');
            }
          }
        )
      );

      this.render(`{{foo-bar foo=this.foo bar=this.bar}}`, { foo: 1, bar: 3 });
    }

    ['@test overriding didUpdateAttrs does not trigger deprecation'](assert) {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.foo}}-{{this.fooCopy}}-{{this.bar}}-{{this.barCopy}}'),
          class extends Component {
            didUpdateAttrs() {
              assert.equal(5, this.get('foo'), 'expected newAttrs to have new value');
            }
          }
        )
      );

      this.render(`{{foo-bar foo=this.foo bar=this.bar}}`, { foo: 1, bar: 3 });

      runTask(() => set(this.context, 'foo', 5));
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EVENTED.isRemoved)} @test triggering an event only attempts to invoke an identically named method, if it actually is a function (GH#15228)`](
      assert
    ) {
      assert.expect(5);

      let payload = ['arbitrary', 'event', 'data'];

      expectDeprecation(
        () => {
          this.owner.register(
            'component:evented-component',
            Component.extend({
              someTruthyProperty: true,

              init() {
                this._super(...arguments);
                expectDeprecation(
                  () => {
                    this.trigger('someMethod', ...payload);
                    this.trigger('someTruthyProperty', ...payload);
                  },
                  /Evented#trigger` is deprecated/,
                  DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
                );
              },

              someMethod(...data) {
                assert.deepEqual(
                  data,
                  payload,
                  'the method `someMethod` should be called, when `someMethod` is triggered'
                );
              },

              listenerForSomeMethod: on('someMethod', function (...data) {
                assert.deepEqual(
                  data,
                  payload,
                  'the listener `listenerForSomeMethod` should be called, when `someMethod` is triggered'
                );
              }),

              listenerForSomeTruthyProperty: on('someTruthyProperty', function (...data) {
                assert.deepEqual(
                  data,
                  payload,
                  'the listener `listenerForSomeTruthyProperty` should be called, when `someTruthyProperty` is triggered'
                );
              }),
            })
          );
        },
        /`on\(\)` event decorator is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      this.render(`{{evented-component}}`);
    }

    ['@test unimplimented positionalParams do not cause an error GH#14416']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('{{foo-bar this.wat}}');
      this.assertText('hello');
    }

    ['@test using attrs for positional params is asserted against']() {
      let MyComponent = class extends Component {};

      expectAssertion(() => {
        this.owner.register(
          'component:foo-bar',
          template(
            'MyVar1: {{attrs.myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{attrs.myVar2}}',
            {
              component: MyComponent.reopenClass({ positionalParams: ['myVar'] }),
              strictMode: false,
            }
          )
        );
      }, 'Using {{attrs}} to reference named arguments is not supported. {{attrs.myVar}} should be updated to {{@myVar}}. (L1:C10) ');
    }

    // Perhaps change this test to `{{this.attrs.myVar.value}}` when removing the deprecation?
    ['@test using this.attrs for positional params']() {
      let MyComponent = class extends Component {};

      expectDeprecation(() => {
        this.owner.register(
          'component:foo-bar',
          template(
            'MyVar1: {{this.attrs.myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{this.attrs.myVar2}}',
            {
              component: MyComponent.reopenClass({ positionalParams: ['myVar'] }),
              strictMode: false,
            }
          )
        );
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.myVar2?}} should be updated to {{@myVar2?}}./);

      this.render('{{foo-bar 1 myVar2=2}}');

      this.assertText('MyVar1: 1 1 MyVar2: 2 2');
    }

    ['@test using named arguments for positional params']() {
      let MyComponent = class extends Component {};

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(
            'MyVar1: {{@myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{@myVar2}}'
          ),
          MyComponent.reopenClass({
            positionalParams: ['myVar'],
          })
        )
      );

      this.render('{{foo-bar 1 myVar2=2}}');

      this.assertText('MyVar1: 1 1 MyVar2: 2 2');
    }

    ['@test has attrs by didReceiveAttrs with native classes'](assert) {
      class FooBarComponent extends Component {
        constructor(injections) {
          super(injections);
          // analogous to class field defaults
          this.foo = 'bar';
        }

        didReceiveAttrs() {
          assert.equal(this.foo, 'bar', 'received default attrs correctly');
        }
      }

      this.owner.register('component:foo-bar', FooBarComponent);

      this.render('{{foo-bar}}');
    }

    '@test lifecycle hooks are not tracked'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.baz}}'),
          class extends Component {
            @tracked foo;

            willInsertElement() {
              this.foo;
              this.foo = 123;
            }

            willRender() {
              this.foo;
              this.foo = 123;
            }

            didRender() {
              this.foo;
              this.foo = 123;
            }

            didReceiveAttrs() {
              this.foo;
              this.foo = 123;
            }

            didUpdate() {
              this.foo;
              this.foo = 123;
            }

            didUpdateAttrs() {
              this.foo;
              this.foo = 123;
            }

            didInsertElement() {
              this.foo;
              this.foo = 123;
            }

            willClearRender() {
              this.foo;
              this.foo = 123;
            }

            willDestroyElement() {
              this.foo;
              this.foo = 123;
            }

            didDestroyElement() {
              this.foo;
              this.foo = 123;
            }
          }
        )
      );

      this.render('{{#if this.cond}}{{foo-bar baz=this.value}}{{/if}}', {
        cond: true,
        value: 'hello',
      });

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => set(this.context, 'value', 'world'));

      this.assertComponentElement(this.firstChild, { content: 'world' });

      runTask(() => set(this.context, 'cond', false));
    }

    '@test tracked property mutation in init does not error'() {
      // TODO: this should issue a deprecation, but since the curly manager
      // uses an untracked frame for construction we don't (yet)
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{this.itemCount}}`),
          class extends Component {
            @tracked itemCount = 0;

            init() {
              super.init(...arguments);

              // first read the tracked property
              let { itemCount } = this;

              // then attempt to update the tracked property
              this.itemCount = itemCount + 1;
            }
          }
        )
      );

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: '1' });
    }
  }
);
