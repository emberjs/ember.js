import GlimmerComponent from '@glimmer/component';
import type { Dict } from '@glimmer/interfaces';
import type { JitRenderDelegate } from '@glimmer-workspace/integration-tests';
import { jitSuite, RenderTest, stripTight, test } from '@glimmer-workspace/integration-tests';

import { assert } from './support';

class DynamicComponentTest extends RenderTest {
  static suiteName = '[components] dynamic components';

  @test
  'initially missing, then present, then missing'() {
    this.registerComponent('Glimmer', 'FooBar', `<p>{{@arg1}}</p>`);

    this.render(
      stripTight`
        <div>
          {{component this.something arg1="hello"}}
        </div>
      `,
      {
        something: undefined,
      }
    );
    this.assertHTML('<div><!----></div>');

    this.rerender({ something: 'FooBar' });
    this.assertHTML('<div><p>hello</p></div>');

    this.rerender({ something: undefined });
    this.assertHTML('<div><!----></div>');
  }
}

class ScopeTest extends RenderTest {
  static suiteName = '[components] scope';

  @test
  'correct scope - accessing local variable in yielded block (glimmer component)'() {
    this.registerComponent(
      'TemplateOnly',
      'FooBar',
      `<div>[Layout: {{this.zomg}}][Layout: {{this.lol}}][Layout: {{@foo}}]{{yield}}</div>`
    );

    this.render(
      stripTight`
        <div>
          [Outside: {{this.zomg}}]
          {{#let this.zomg as |lol|}}
            [Inside: {{this.zomg}}]
            [Inside: {{lol}}]
            <FooBar @foo={{this.zomg}}>
              [Block: {{this.zomg}}]
              [Block: {{lol}}]
            </FooBar>
          {{/let}}
        </div>`,
      { zomg: 'zomg' }
    );

    this.assertHTML(
      stripTight`
        <div>
          [Outside: zomg]
          [Inside: zomg]
          [Inside: zomg]
          <div>
            [Layout: ]
            [Layout: ]
            [Layout: zomg]
            [Block: zomg]
            [Block: zomg]
          </div>
        </div>
      `
    );
  }

  @test
  '`false` class name do not render'() {
    this.render('<div class={{this.isFalse}}>FALSE</div>', { isFalse: false });
    this.assertHTML('<div>FALSE</div>');
  }

  @test
  '`null` class name do not render'() {
    this.render('<div class={{this.isNull}}>NULL</div>', { isNull: null });
    this.assertHTML('<div>NULL</div>');
  }

  @test
  '`undefined` class name do not render'() {
    this.render('<div class={{this.isUndefined}}>UNDEFINED</div>', { isUndefined: undefined });
    this.assertHTML('<div>UNDEFINED</div>');
  }

  @test
  '`0` class names do render'() {
    this.render('<div class={{this.isZero}}>ZERO</div>', { isZero: 0 });
    this.assertHTML('<div class="0">ZERO</div>');
  }

  @test
  'correct scope - simple'() {
    this.registerComponent('TemplateOnly', 'SubItem', `<p>{{@name}}</p>`);

    let subitems = [{ id: 0 }, { id: 1 }, { id: 42 }];

    this.render(
      stripTight`
        <div>
          {{#each this.items key="id" as |item|}}
            <SubItem @name={{item.id}} />
          {{/each}}
        </div>`,
      { items: subitems }
    );

    this.assertHTML('<div><p>0</p><p>1</p><p>42</p></div>');
  }

  @test
  'correct scope - self lookup inside #each'() {
    this.registerComponent('TemplateOnly', 'SubItem', `<p>{{@name}}</p>`);

    let subitems = [{ id: 0 }, { id: 1 }, { id: 42 }];

    this.render(
      stripTight`
        <div>
          {{#each this.items key="id" as |item|}}
            <SubItem @name={{this.id}} />
            <SubItem @name={{this.id}} />
            <SubItem @name={{item.id}} />
          {{/each}}
        </div>`,
      { items: subitems, id: '(self)' }
    );

    this.assertHTML(
      stripTight`
        <div>
          <p>(self)</p><p>(self)</p><p>0</p>
          <p>(self)</p><p>(self)</p><p>1</p>
          <p>(self)</p><p>(self)</p><p>42</p>
        </div>
      `
    );
  }

  @test
  'correct scope - complex'() {
    this.registerComponent('TemplateOnly', 'SubItem', `<p>{{@name}}</p>`);

    this.registerComponent(
      'TemplateOnly',
      'MyItem',
      stripTight`
        <aside>{{@item.id}}:
          {{#if @item.visible}}
            {{#each @item.subitems key="id" as |subitem|}}
               <SubItem @name={{subitem.id}} />
            {{/each}}
          {{/if}}
        </aside>
      `
    );

    let itemId = 0;

    let items = [];

    for (let i = 0; i < 3; i++) {
      let subitems = [];
      let subitemId = 0;

      for (let j = 0; j < 2; j++) {
        subitems.push({
          id: `${itemId}.${subitemId++}`,
        });
      }

      items.push({
        id: String(itemId++),
        visible: i % 2 === 0,
        subitems,
      });
    }

    this.render(
      stripTight`
        <article>{{#each this.items key="id" as |item|}}
          <MyItem @item={{item}} />
        {{/each}}</article>
      `,
      { items }
    );

    this.assertHTML(
      stripTight`
        <article>
          <aside>0:<p>0.0</p><p>0.1</p></aside>
          <aside>1:<!----></aside>
          <aside>2:<p>2.0</p><p>2.1</p></aside>
        </article>
      `
    );
  }
}

class ClosureComponentsTest extends RenderTest {
  static suiteName = '[components] closure components';

  @test
  'component helper can handle aliased block components with args'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'FooBar', 'Hello {{@arg1}} {{yield}}');

    this.render(
      stripTight`
        {{#let (hash comp=(component 'FooBar')) as |my|}}
          {{#component my.comp arg1="World!"}}Test1{{/component}} Test2
        {{/let}}
      `
    );

    this.assertHTML('Hello World! Test1 Test2');
  }

  @test
  'component helper can handle aliased block components without args'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'FooBar', 'Hello {{yield}}');

    this.render(
      stripTight`
        {{#let (hash comp=(component 'FooBar')) as |my|}}
          {{#component my.comp}}World!{{/component}} Test
        {{/let}}
      `
    );

    this.assertHTML('Hello World! Test');
  }

  @test
  'component helper can handle higher order block components with args'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'FooBar', '{{yield (hash comp=(component "BazBar"))}}');
    this.registerComponent('Glimmer', 'BazBar', 'Hello {{@arg1}} {{yield}}');

    this.render(
      stripTight`
        <FooBar as |my|>
          {{#component my.comp arg1="World!"}}Test1{{/component}} Test2
        </FooBar>
      `
    );

    this.assertHTML('Hello World! Test1 Test2');
  }

  @test
  'component helper can handle higher order block components without args'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'FooBar', '{{yield (hash comp=(component "BazBar"))}}');
    this.registerComponent('Glimmer', 'BazBar', 'Hello {{@arg1}} {{yield}}');

    this.render(
      stripTight`
        <FooBar as |my|>
          {{#component my.comp}}World!{{/component}} Test
        </FooBar>
      `
    );

    this.assertHTML('Hello  World! Test');
  }
}

class GlimmerComponentTest extends RenderTest {
  static suiteName = '[components] glimmer components';

  @test
  'NonBlock without attributes replaced with a web component'() {
    this.registerComponent(
      'Glimmer',
      'NonBlock',
      '<not-an-ember-component ...attributes>In layout</not-an-ember-component>'
    );

    this.render('<NonBlock />');

    this.assertHTML('<not-an-ember-component>In layout</not-an-ember-component>');
    this.assertStableRerender();
  }

  @test
  'NonBlock with attributes replaced with a web component'() {
    this.registerComponent(
      'Glimmer',
      'NonBlock',
      '<not-an-ember-component such="{{@stability}}" ...attributes>In layout</not-an-ember-component>'
    );

    this.render('<NonBlock @stability={{this.stability}} />', { stability: 'stability' });
    this.assertHTML('<not-an-ember-component such="stability">In layout</not-an-ember-component>');

    this.rerender({
      stability: 'changed!!!',
    });

    this.assertHTML('<not-an-ember-component such="changed!!!">In layout</not-an-ember-component>');
    this.assertStableNodes();
  }

  @test
  'Custom element with element modifier'() {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    this.registerModifier('foo', class {});

    this.render('<some-custom-element {{foo "foo"}}></some-custom-element>');
    this.assertHTML('<some-custom-element></some-custom-element>');
  }
}

class TeardownTest extends RenderTest {
  static suiteName = '[components] teardown';

  @test
  'components inside a list are destroyed'() {
    let destroyed: unknown[] = [];

    class DestroyMeComponent extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(this.args['item']);
      }
    }

    this.registerComponent('Glimmer', 'DestroyMe', '<div>destroy me!</div>', DestroyMeComponent);

    this.render(`{{#each this.list as |item|}}<DestroyMe @item={{item}} />{{/each}}`, {
      list: [1, 2, 3, 4, 5],
    });

    assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

    this.rerender({ list: [1, 2, 3] });

    assert.deepEqual(destroyed, [4, 5], 'destroy should be called exactly twice');

    this.rerender({ list: [3, 2, 1] });

    assert.deepEqual(destroyed, [4, 5], 'destroy should be called exactly twice');

    this.rerender({ list: [] });

    assert.deepEqual(destroyed, [4, 5, 1, 2, 3], 'destroy should be called for each item');
  }

  @test
  'components inside a list are destroyed (when key is @identity)'() {
    let destroyed: unknown[] = [];

    class DestroyMeComponent extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(this.args['item']);
      }
    }

    this.registerComponent('Glimmer', 'DestroyMe', '<div>destroy me!</div>', DestroyMeComponent);

    let val1 = { val: 1 };
    let val2 = { val: 2 };
    let val3 = { val: 3 };
    let val4 = { val: 4 };
    let val5 = { val: 5 };

    this.render(
      `{{#each this.list key='@identity' as |item|}}<DestroyMe @item={{item}} />{{/each}}`,
      {
        list: [val1, val2, val3, val4, val5],
      }
    );

    assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

    this.rerender({ list: [val1, val2, val3] });

    assert.deepEqual(destroyed, [val4, val5], 'destroy should be called exactly twice');

    this.rerender({ list: [val3, val2, val1] });

    assert.deepEqual(destroyed, [val4, val5], 'destroy should be called exactly twice');

    this.rerender({ list: [] });

    assert.deepEqual(
      destroyed,
      [val4, val5, val1, val2, val3],
      'destroy should be called for each item'
    );
  }

  @test
  'components that are "destroyed twice" are destroyed once'() {
    let destroyed: string[] = [];

    class DestroyMeComponent extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(this.args['from'] as string);
      }
    }

    class DestroyMe2Component extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(this.args['from'] as string);
      }
    }

    this.registerComponent(
      'Glimmer',
      'DestroyMe',
      '{{#if @cond}}<DestroyMeInner @from="inner" />{{/if}}',
      DestroyMeComponent
    );
    this.registerComponent('Glimmer', 'DestroyMeInner', 'inner', DestroyMe2Component);

    this.render(`{{#if this.cond}}<DestroyMe @from="root" @cond={{this.child.cond}} />{{/if}}`, {
      cond: true,
      child: { cond: true },
    });

    assert.deepEqual(destroyed, [], 'destroy should not be called');

    this.rerender({ cond: false, child: { cond: false } });

    assert.deepEqual(
      destroyed,
      ['root', 'inner'],
      'destroy should be called exactly once per component'
    );
  }

  @test
  'deeply nested destructions'() {
    let destroyed: string[] = [];

    class DestroyMe1Component extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(`destroy-me1: ${this.args['item'] as string}`);
      }
    }

    class DestroyMe2Component extends GlimmerComponent<Dict> {
      override willDestroy() {
        super.willDestroy();
        destroyed.push(
          `destroy-me2: ${this.args['from'] as string} - ${this.args['item'] as string}`
        );
      }
    }

    this.registerComponent(
      'Glimmer',
      'DestroyMe1',
      '<div><DestroyMe2 @item={{@item}} @from="destroy-me1">{{yield}}</DestroyMe2></div>',
      DestroyMe1Component
    );
    this.registerComponent('Glimmer', 'DestroyMe2', 'Destroy me! {{yield}}', DestroyMe2Component);

    this.render(
      `{{#each this.list key='@identity' as |item|}}<DestroyMe1 @item={{item}}><DestroyMe2 @from="root" @item={{item}}></DestroyMe2></DestroyMe1>{{/each}}`,
      { list: [1, 2, 3, 4, 5] }
    );

    assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

    this.rerender({ list: [1, 2, 3] });

    assert.deepEqual(
      destroyed,
      [
        'destroy-me1: 4',
        'destroy-me2: destroy-me1 - 4',
        'destroy-me2: root - 4',
        'destroy-me1: 5',
        'destroy-me2: destroy-me1 - 5',
        'destroy-me2: root - 5',
      ],
      'destroy should be called exactly twice'
    );

    destroyed = [];

    this.rerender({ list: [3, 2, 1] });

    assert.deepEqual(destroyed, [], 'destroy should be called exactly twice');

    this.rerender({ list: [] });

    assert.deepEqual(
      destroyed,
      [
        'destroy-me1: 1',
        'destroy-me2: destroy-me1 - 1',
        'destroy-me2: root - 1',
        'destroy-me1: 2',
        'destroy-me2: destroy-me1 - 2',
        'destroy-me2: root - 2',
        'destroy-me1: 3',
        'destroy-me2: destroy-me1 - 3',
        'destroy-me2: root - 3',
      ],
      'destroy should be called for each item'
    );
  }

  @test
  'components inside the root are destroyed when the render result is destroyed'() {
    let destroyed: string[] = [];

    class DestroyMe1Component extends GlimmerComponent {
      override willDestroy(this: GlimmerComponent) {
        super.willDestroy();
        destroyed.push('destroy-me1');
      }
    }

    class DestroyMe2Component extends GlimmerComponent {
      override willDestroy(this: GlimmerComponent) {
        super.willDestroy();
        destroyed.push('destroy-me2');
      }
    }

    this.registerComponent('Glimmer', 'DestroyMe1', '<div>Destry me!</div>', DestroyMe1Component);
    this.registerComponent(
      'Glimmer',
      'DestroyMe2',
      '<div>Destroy me too!</div>',
      DestroyMe2Component
    );

    this.render(`<DestroyMe1 id="destroy-me1"/><DestroyMe2 id="destroy-me2"/>`);

    assert.deepEqual(destroyed, [], 'neither component should be destroyed');

    this.destroy();

    assert.deepEqual(
      destroyed.sort(),
      ['destroy-me1', 'destroy-me2'],
      'both components had their destroy hook called'
    );

    assert.strictEqual(
      document.querySelectorAll('#destroy-me1').length,
      0,
      'component DOM node was removed from DOM'
    );
    assert.strictEqual(
      document.querySelectorAll('#destroy-me2').length,
      0,
      'component DOM node was removed from DOM'
    );

    assert.strictEqual(
      document.querySelector('#qunit-fixture')!.childElementCount,
      0,
      'root view was removed from DOM'
    );
  }
}

class AppendableTest extends RenderTest {
  static suiteName = '[components] appendable components';

  declare delegate: JitRenderDelegate;

  @test
  'it does not work on optimized appends'() {
    this.registerComponent('Glimmer', 'FooBar', 'foo bar');

    let definition = this.delegate.createCurriedComponent('FooBar');

    this.render('{{this.foo}}', { foo: definition });
    this.assertHTML('foo bar');
    this.assertStableRerender();

    this.rerender({ foo: 'foo' });
    this.assertHTML('foo');

    this.rerender({ foo: definition });
    this.assertHTML('foo bar');
  }

  @test
  'it works on unoptimized appends (dot paths)'() {
    this.registerComponent('Glimmer', 'FooBar', 'foo bar');

    let definition = this.delegate.createCurriedComponent('FooBar');

    this.render('{{this.foo.bar}}', { foo: { bar: definition } });
    this.assertHTML('foo bar');
    this.assertStableRerender();

    this.rerender({ foo: { bar: 'lol' } });
    this.assertHTML('lol');
    this.assertStableRerender();

    this.rerender({ foo: { bar: 'omg' } });
    this.assertHTML('omg');

    this.rerender({ foo: { bar: definition } });
    this.assertHTML('foo bar');
  }

  @test
  'it works on unoptimized appends (this paths)'() {
    this.registerComponent('Glimmer', 'FooBar', 'foo bar');

    let definition = this.delegate.createCurriedComponent('FooBar');

    this.render('{{this.foo}}', { foo: definition });
    this.assertHTML('foo bar');
    this.assertStableRerender();

    this.rerender({ foo: 'lol' });
    this.assertHTML('lol');
    this.assertStableRerender();

    this.rerender({ foo: 'omg' });
    this.assertHTML('omg');

    this.rerender({ foo: definition });
    this.assertHTML('foo bar');
  }

  @test
  'it works on unoptimized appends when initially not a component (dot paths)'() {
    this.registerComponent('Glimmer', 'FooBar', 'foo bar');

    let definition = this.delegate.createCurriedComponent('FooBar');

    this.render('{{this.foo.bar}}', { foo: { bar: 'lol' } });
    this.assertHTML('lol');
    this.assertStableRerender();

    this.rerender({ foo: { bar: definition } });
    this.assertHTML('foo bar');
    this.assertStableRerender();

    this.rerender({ foo: { bar: 'lol' } });
    this.assertHTML('lol');
  }

  @test
  'it works on unoptimized appends when initially not a component (this paths)'() {
    this.registerComponent('Glimmer', 'FooBar', 'foo bar');

    let definition = this.delegate.createCurriedComponent('FooBar');

    this.render('{{this.foo}}', { foo: 'lol' });
    this.assertHTML('lol');
    this.assertStableRerender();

    this.rerender({ foo: definition });
    this.assertHTML('foo bar');
    this.assertStableRerender();

    this.rerender({ foo: 'lol' });
    this.assertHTML('lol');
  }
}

jitSuite(DynamicComponentTest);
jitSuite(ScopeTest);
jitSuite(ClosureComponentsTest);
jitSuite(GlimmerComponentTest);
jitSuite(TeardownTest);
jitSuite(AppendableTest);
