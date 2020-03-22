import { EmberishCurlyComponent, strip, RenderTest, test, jitSuite } from '..';
import { assert } from './support';
import { expect } from '@glimmer/util';

class PartialTest extends RenderTest {
  static suiteName = 'Partials';

  assertInvariants() {
    let result = expect(this.renderResult, 'must render before asserting invariants');

    QUnit.assert.strictEqual(
      result.firstNode(),
      this.element.firstChild,
      "The firstNode of the result is the same as the context.root's firstChild"
    );
    QUnit.assert.strictEqual(
      result.lastNode(),
      this.element.lastChild,
      "The lastNode of the result is the same as the context.root's lastChild"
    );
  }

  @test
  'static partial with static content'() {
    this.registerPartial('test', `<div>Testing</div>`);
    this.render(`Before {{partial 'test'}} After`);

    this.assertHTML(`Before <div>Testing</div> After`);
    this.assertStableRerender();
    this.assertHTML(`Before <div>Testing</div> After`);
  }

  @test
  'static partial with self reference'() {
    this.registerPartial(
      'birdman',
      `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
    );
    this.render(`{{partial 'birdman'}}`, { item: 'name' });

    this.assertStableRerender();

    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
    this.rerender({ item: 'name' });
    this.assertStableNodes();
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
  }

  @test
  'static partial with local reference'() {
    this.registerPartial('test', `You {{quality.value}}`);
    this.render(`{{#each qualities key='id' as |quality|}}{{partial 'test'}}. {{/each}}`, {
      qualities: [
        { id: 1, value: 'smaht' },
        { id: 2, value: 'loyal' },
      ],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. `);
    this.rerender({
      qualities: [
        { id: 1, value: 'smaht' },
        { id: 2, value: 'loyal' },
      ],
    });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. `);
  }

  @test
  'static partial with local reference (unknown)'() {
    this.registerPartial('test', `You {{quality}}`);
    this.render(`{{#each qualities key='@index' as |quality|}}{{partial 'test'}}. {{/each}}`, {
      qualities: ['smaht', 'loyal'],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. `);
    this.rerender({ qualities: ['smaht', 'loyal'] });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. `);
  }

  @test
  'static partial with named arguments'() {
    this.registerComponent('Glimmer', 'FooBar', `<p>{{@foo}}-{{partial 'test'}}</p>`);

    this.registerPartial('test', `{{@foo}}-{{@bar}}`);
    this.render(`<FooBar @foo={{foo}} @bar={{bar}} />`, { foo: 'foo', bar: 'bar' });
    this.assertHTML(`<p>foo-foo-bar</p>`);

    this.assertStableRerender();

    this.rerender({ foo: 'FOO', bar: 'BAR' });
    this.assertStableNodes();
    this.assertHTML(`<p>FOO-FOO-BAR</p>`);

    this.rerender({ foo: 'foo', bar: 'bar' });
    this.assertStableNodes();
    this.assertHTML(`<p>foo-foo-bar</p>`);
  }

  @test
  'static partial with has-block in basic component'() {
    this.registerComponent('Glimmer', 'FooBar', `<p>{{partial 'test'}}</p>`);
    this.registerComponent(
      'Glimmer',
      'FooBarBaz',
      `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`
    );
    this.registerPartial('test', `{{has-block}}-{{has-block 'inverse'}}`);

    this.render(strip`
      <FooBar>a block</FooBar>
      <FooBar />
      <FooBarBaz>a block</FooBarBaz>
      <FooBarBaz />
    `);

    this.assertHTML(
      strip`
        <p>true-false</p>
        <p>false-false</p>
        <p>true-false-true-false</p>
        <p>false-false-false-false</p>
      `
    );

    this.assertStableRerender();
  }

  @test
  'static partial with has-block in curly component'() {
    class TaglessComponent extends EmberishCurlyComponent {
      tagName = '';
    }

    this.registerComponent('Curly', 'foo-bar', `<p>{{partial 'test'}}</p>`, TaglessComponent);
    this.registerComponent(
      'Curly',
      'foo-bar-baz',
      `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`,
      TaglessComponent
    );
    this.registerPartial('test', `{{has-block}}-{{has-block 'inverse'}}`);

    this.render(
      strip`
        {{#foo-bar}}a block{{/foo-bar}}
        {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
        {{foo-bar}}
        {{#foo-bar-baz}}a block{{/foo-bar-baz}}
        {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
        {{foo-bar-baz}}
      `
    );

    this.assertHTML(
      strip`
      <p>true-false</p>
      <p>true-true</p>
      <p>false-false</p>
      <p>true-false-true-false</p>
      <p>true-true-true-true</p>
      <p>false-false-false-false</p>
    `
    );

    this.assertStableRerender();
  }

  @test
  'static partial with has-block-params in basic component'() {
    this.registerComponent('Glimmer', 'FooBar', `<p>{{partial 'test'}}</p>`);
    this.registerComponent(
      'Glimmer',
      'FooBarBaz',
      `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`
    );
    this.registerPartial('test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

    this.render(
      strip`
        <FooBar as |x|>a block</FooBar>
        <FooBar>a block</FooBar>
        <FooBar />
        <FooBarBaz as |x|>a block</FooBarBaz>
        <FooBarBaz>a block</FooBarBaz>
        <FooBarBaz />
      `
    );

    this.assertHTML(
      strip`
      <p>true-false</p>
      <p>false-false</p>
      <p>false-false</p>
      <p>true-false-true-false</p>
      <p>false-false-false-false</p>
      <p>false-false-false-false</p>
    `
    );

    this.assertStableRerender();
  }

  @test
  'static partial with has-block-params in curly component'() {
    class TaglessComponent extends EmberishCurlyComponent {
      tagName = '';
    }

    this.registerComponent('Curly', 'foo-bar', `<p>{{partial 'test'}}</p>`, TaglessComponent);
    this.registerComponent(
      'Curly',
      'foo-bar-baz',
      `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`,
      TaglessComponent
    );
    this.registerPartial('test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

    this.render(
      strip`
        {{#foo-bar as |x|}}a block{{/foo-bar}}
        {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
        {{#foo-bar}}a block{{/foo-bar}}
        {{foo-bar}}
        {{#foo-bar-baz as |x|}}a block{{/foo-bar-baz}}
        {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
        {{#foo-bar-baz}}a block{{/foo-bar-baz}}
        {{foo-bar-baz}}
      `
    );

    this.assertHTML(
      strip`
      <p>true-false</p>
      <p>false-false</p>
      <p>false-false</p>
      <p>false-false</p>
      <p>true-false-true-false</p>
      <p>false-false-false-false</p>
      <p>false-false-false-false</p>
      <p>false-false-false-false</p>
    `
    );

    this.assertStableRerender();
  }

  @test
  'static partial with yield in basic component'() {
    this.registerComponent('Glimmer', 'FooBar', `<p>{{partial 'test'}}</p>`);
    this.registerComponent(
      'Glimmer',
      'FooBarBaz',
      `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`
    );
    this.registerPartial('test', `{{yield "partial"}}-{{yield to='inverse'}}`);

    this.render(
      strip`
        <FooBar as |source|>from {{source}}</FooBar>
        <FooBar />
        <FooBarBaz as |source|>from {{source}}</FooBarBaz>
        <FooBarBaz />
      `
    );

    this.assertHTML(
      strip`
      <p>from partial-</p>
      <p>-</p>
      <p>from partial--from layout-</p>
      <p>---</p>
    `
    );

    this.assertStableRerender();
  }

  @test
  'static partial with yield in curly component'() {
    class TaglessComponent extends EmberishCurlyComponent {
      tagName = '';
    }

    this.registerComponent('Curly', 'foo-bar', `<p>{{partial 'test'}}</p>`, TaglessComponent);
    this.registerComponent(
      'Curly',
      'foo-bar-baz',
      `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`,
      TaglessComponent
    );
    this.registerPartial('test', `{{yield "partial"}}-{{yield to='inverse'}}`);

    this.render(
      strip`
        {{#foo-bar as |source|}}from {{source}}{{/foo-bar}}
        {{#foo-bar as |source|}}from {{source}}{{else}}inverse{{/foo-bar}}
        {{foo-bar}}
        {{#foo-bar-baz as |source|}}from {{source}}{{/foo-bar-baz}}
        {{#foo-bar-baz as |source|}}from {{source}}{{else}}inverse{{/foo-bar-baz}}
        {{foo-bar-baz}}
      `
    );

    this.assertHTML(
      strip`
        <p>from partial-</p>
        <p>from partial-inverse</p>
        <p>-</p>
        <p>from partial--from layout-</p>
        <p>from partial-inverse-from layout-inverse</p>
        <p>---</p>
      `
    );

    this.assertStableRerender();
  }

  @test
  'dynamic partial with static content'() {
    this.registerPartial('test', `<div>Testing</div>`);
    this.render(`Before {{partial name}} After`, { name: 'test' });

    this.assertHTML(`Before <div>Testing</div> After`);
    this.rerender({ name: 'test' });
    this.assertStableNodes();
    this.assertHTML(`Before <div>Testing</div> After`);
  }

  @test
  'nested dynamic partial with dynamic content'() {
    this.registerPartial('test', `<div>Testing {{wat}} {{partial nest}}</div>`);
    this.registerPartial('nested', `<div>Nested {{lol}}</div>`);

    this.render(`Before {{partial name}} After`, {
      name: 'test',
      nest: 'nested',
      wat: 'wat are',
      lol: 'you doing?',
    });

    this.assertHTML(`Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
    this.rerender({ name: 'test', nest: 'nested', wat: 'wat are', lol: 'you doing?' });
    this.assertStableNodes();
    this.assertHTML(`Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
  }

  @test
  'nested partials within nested `{{#with}}` blocks'() {
    this.registerPartial(
      'person2-partial',
      `{{#with 'Ben' as |person2|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person3-partial'}}{{/with}}`
    );
    this.registerPartial(
      'person3-partial',
      `{{#with 'Alex' as |person3|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person4-partial'}}{{/with}}`
    );
    this.registerPartial(
      'person4-partial',
      `{{#with 'Sarah' as |person4|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}.{{/with}}`
    );

    this.render(
      `Hi {{person1}}. {{#with 'Sophie' as |person1|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person2-partial'}}{{/with}}`,
      {
        person1: 'Context1',
        person2: 'Context2',
        person3: 'Context3',
        person4: 'Context4',
        age: 0,
      }
    );

    this.assertHTML(
      `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
    );

    this.rerender({
      person1: 'Context1',
      person2: 'Context2',
      person3: 'Context3',
      person4: 'Context4',
      age: 0,
    });
    this.assertStableNodes();

    this.assertHTML(
      `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
    );

    this.rerender({
      person1: 'UpdatedContext1',
      person2: 'UpdatedContext2',
      person3: 'UpdatedContext3',
      person4: 'UpdatedContext4',
      age: 1,
    });

    this.assertHTML(
      `Hi UpdatedContext1. Hi Sophie (aged 1), UpdatedContext2, UpdatedContext3 and UpdatedContext4. Hi Sophie (aged 1), Ben, UpdatedContext3 and UpdatedContext4. Hi Sophie (aged 1), Ben, Alex and UpdatedContext4. Hi Sophie (aged 1), Ben, Alex and Sarah.`
    );

    this.rerender({
      person1: 'Context1',
      person2: 'Context2',
      person3: 'Context3',
      person4: 'Context4',
      age: 0,
    });

    this.assertHTML(
      `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
    );
  }

  @test
  'dynamic partial with falsy value does not render'() {
    this.render(`Before {{partial name}} After`, { name: false });

    this.assertHTML(`Before <!----> After`);
    this.rerender({ name: false });
    this.assertStableNodes();
    this.assertHTML(`Before <!----> After`);
  }

  @test
  'static partial that does not exist asserts'() {
    assert.throws(() => {
      this.render(`Before {{partial 'test'}} After`);
    }, /Could not find a partial named "test"/);
  }

  @test
  'dynamic partial that does not exist does not render'() {
    assert.throws(() => {
      this.render(`Before {{partial name}} After`, { name: 'illuminati' });
    }, /Could not find a partial named "illuminati"/);
  }

  @test
  'dynamic partial with can change from falsy to real template'() {
    this.registerPartial('test', `<div>Testing</div>`);

    this.render(`Before {{partial name}} After`, { name: false });

    this.assertHTML(`Before <!----> After`);
    this.rerender({ name: false });
    this.assertStableNodes();

    this.rerender({ name: 'test' });
    this.assertHTML(`Before <div>Testing</div> After`);

    this.rerender({ name: false });
    this.assertHTML(`Before <!----> After`);

    this.rerender({ name: 'test' });
    this.assertHTML(`Before <div>Testing</div> After`);

    this.rerender({ name: null });
    this.assertHTML(`Before <!----> After`);

    this.rerender({ name: 'test' });
    this.assertHTML(`Before <div>Testing</div> After`);

    this.rerender({ name: undefined });
    this.assertHTML(`Before <!----> After`);
  }

  @test
  'dynamic partial with self reference'() {
    this.registerPartial('test', `I know {{item}}. I have the best {{item}}s.`);
    this.render(`{{partial name}}`, { name: 'test', item: 'partial' });

    this.assertHTML(`I know partial. I have the best partials.`);
    this.rerender({ name: 'test', item: 'partial' });
    this.assertStableNodes();
    this.assertHTML(`I know partial. I have the best partials.`);
  }

  @test
  'changing dynamic partial with self reference'() {
    this.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
    this.registerPartial(
      'birdman',
      `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
    );
    this.render(`{{partial name}}`, { name: 'weezy', item: 'name' });

    this.assertHTML(`Ain't my birthday but I got my name on the cake.`);
    this.rerender({ name: 'birdman', item: 'name' });
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
    this.rerender({ name: 'birdman', item: 'name' });
    this.assertStableNodes();
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
  }

  @test
  'changing dynamic partial and changing reference values'() {
    this.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
    this.registerPartial(
      'birdman',
      `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
    );
    this.render(`{{partial name}}`, { name: 'weezy', item: 'partial' });

    this.assertHTML(`Ain't my birthday but I got my partial on the cake.`);
    this.rerender({ name: 'birdman', item: 'name' });
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
    this.rerender({ name: 'birdman', item: 'name' });
    this.assertStableNodes();
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
  }

  @test
  'changing dynamic partial and changing references'() {
    this.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
    this.registerPartial(
      'birdman',
      `Respeck my {{noun}}. When my {{noun}} come up put some respeck on it.`
    );
    this.render(`{{partial name}}`, { name: 'weezy', item: 'partial' });

    this.assertHTML(`Ain't my birthday but I got my partial on the cake.`);
    this.rerender({ name: 'birdman', noun: 'name' });
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
    this.rerender({ name: 'birdman', noun: 'name' });
    this.assertStableNodes();
    this.assertHTML(`Respeck my name. When my name come up put some respeck on it.`);
  }

  @test
  'dynamic partial with local reference'() {
    this.registerPartial('test', `You {{quality.value}}`);
    this.render(`{{#each qualities key='id' as |quality|}}{{partial name}}. {{/each}}`, {
      name: 'test',
      qualities: [
        { id: 1, value: 'smaht' },
        { id: 2, value: 'loyal' },
      ],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. `);
    this.rerender({
      name: 'test',
      qualities: [
        { id: 1, value: 'smaht' },
        { id: 2, value: 'loyal' },
      ],
    });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. `);
  }

  @test
  'dynamic partial with local reference (unknown)'() {
    this.registerPartial('test', `You {{quality}}`);
    this.render(`{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`, {
      name: 'test',
      qualities: ['smaht', 'loyal'],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. `);
    this.rerender({ name: 'test', qualities: ['smaht', 'loyal'] });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. `);
  }

  @test
  'partial with if statement on a simple local reference works as expected'() {
    this.registerPartial('test', `{{#if quality}}You {{quality}}{{else}}No quality{{/if}}`);
    this.render(`{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`, {
      name: 'test',
      qualities: ['smaht', 'loyal', undefined],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. No quality. `);
    this.rerender({ name: 'test', qualities: ['smaht', 'loyal', undefined] });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. No quality. `);
  }

  @test
  'partial with if statement on a path local reference works as expected'() {
    this.registerPartial(
      'test',
      `{{#if quality.name}}You {{quality.name}}{{else}}No quality{{/if}}`
    );
    this.render(`{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`, {
      name: 'test',
      qualities: [{ name: 'smaht' }, { name: 'loyal' }, { name: undefined }],
    });

    this.assertStableRerender();

    this.assertHTML(`You smaht. You loyal. No quality. `);
    this.rerender({
      name: 'test',
      qualities: [{ name: 'smaht' }, { name: 'loyal' }, { name: undefined }],
    });
    this.assertStableNodes();
    this.assertHTML(`You smaht. You loyal. No quality. `);
  }

  @test
  'partial without arguments throws'() {
    assert.throws(() => {
      this.render(`Before {{partial}} After`);
    }, strip`Partial found with no arguments. You must specify a template name.`);
  }

  @test
  'partial with more than one argument throws'() {
    assert.throws(() => {
      this.render(`Before {{partial 'turnt' 'up'}} After`);
    }, strip`Partial found with more than one argument. You can only specify a single template.`);
  }
}

jitSuite(PartialTest);
