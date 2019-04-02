import { RenderTest, jitSuite, test, Count } from '@glimmer/integration-tests';
import { Dict } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';
import { Option } from '@glimmer/interfaces';

class BaseModifier {
  element?: SimpleElement;
  didInsertElement(_params: unknown[], _hash: Dict<unknown>) {}
  willDestroyElement() {}
  didUpdate(_params: unknown[], _hash: Dict<unknown>) {}
}

abstract class AbstractInsertable extends BaseModifier {
  abstract didInsertElement(_params: unknown[], _hash: Dict<unknown>): void;
}

abstract class AbstractDestroyable extends BaseModifier {
  abstract willDestroyElement(): void;
}

class ModifierTests extends RenderTest {
  static suiteName = 'modifiers';

  @test
  'Element modifier with hooks'(assert: Assert, count: Count) {
    this.registerModifier(
      'foo',
      class {
        element?: SimpleElement;
        didInsertElement() {
          count.expect('didInsertElement');
          assert.ok(this.element, 'didInsertElement');
          assert.equal(this.element!.getAttribute('data-ok'), 'true', 'didInsertElement');
        }

        didUpdate() {
          count.expect('didUpdate');
          assert.ok(true, 'didUpdate');
        }

        willDestroyElement() {
          count.expect('willDestroyElement');
          assert.ok(true, 'willDestroyElement');
        }
      }
    );

    this.render('{{#if ok}}<div data-ok=true {{foo bar}}></div>{{/if}}', {
      bar: 'bar',
      ok: true,
    });

    this.rerender({ bar: 'foo' });
    this.rerender({ ok: false });
  }

  @test
  'didUpdate is not called when params are constants'(assert: Assert, count: Count) {
    this.registerModifier(
      'foo',
      class {
        element?: SimpleElement;
        didInsertElement() {
          count.expect('didInsertElement');
          assert.ok(true);
        }
        didUpdate() {
          count.expect('didUpdate', 0);
          assert.ok(false);
        }
        willDestroyElement() {
          count.expect('willDestroyElement');
        }
      }
    );

    this.render('{{#if ok}}<div {{foo "foo" bar="baz"}}></div>{{/if}}{{ok}}', {
      ok: true,
      data: 'ok',
    });
    this.rerender({ data: 'yup' });
    this.rerender({ ok: false });
  }

  @test
  'modifiers on components are forwarded to a single element receiving the splattributes'(
    assert: Assert
  ) {
    let modifierParams: Option<unknown[]> = null;
    let modifierNamedArgs: Option<Dict<unknown>> = null;
    let modifiedElement: SimpleElement | undefined;
    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
    }
    this.registerComponent('Glimmer', 'TheFoo', '<div id="inner-div" ...attributes>Foo</div>');
    this.registerModifier('bar', Bar);
    this.render('<TheFoo {{bar "something" foo="else"}}/>');
    assert.deepEqual(modifierParams, ['something']);
    assert.deepEqual(modifierNamedArgs, { foo: 'else' });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
  }

  @test
  'modifiers on components are forwarded to all the elements receiving the splattributes'(
    assert: Assert
  ) {
    let elementIds: Option<string>[] = [];
    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        assert.deepEqual(params, ['something']);
        assert.deepEqual(namedArgs, { foo: 'else' });
        if (this.element) {
          elementIds.push(this.element.getAttribute('id'));
        }
      }
    }
    this.registerComponent(
      'Glimmer',
      'TheFoo',
      '<div id="inner-one" ...attributes>Foo</div><div id="inner-two" ...attributes>Bar</div>'
    );
    this.registerModifier('bar', Bar);
    this.render('<TheFoo {{bar "something" foo="else"}}/>');
    assert.deepEqual(
      elementIds,
      ['inner-one', 'inner-two'],
      'The modifier has been instantiated twice, once for each element with splattributes'
    );
  }

  @test
  'modifiers on components accept bound arguments and track changes on them'(assert: Assert) {
    let modifierParams: Option<unknown[]> = null;
    let modifierNamedArgs: Option<Dict<unknown>> = null;
    let modifiedElement: SimpleElement | undefined;
    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
      didUpdate(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
    }
    this.registerComponent('Glimmer', 'TheFoo', '<div id="inner-div" ...attributes>Foo</div>');
    this.registerModifier('bar', Bar);
    this.render('<TheFoo {{bar this.something foo=this.foo}}/>', {
      something: 'something',
      foo: 'else',
    });
    assert.deepEqual(modifierParams, ['something']);
    assert.deepEqual(modifierNamedArgs, { foo: 'else' });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
    this.rerender({ something: 'another', foo: 'thingy' });
    assert.deepEqual(modifierParams, ['another']);
    assert.deepEqual(modifierNamedArgs, { foo: 'thingy' });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
  }

  @test
  'modifiers on components accept `this` in both positional params and named arguments, and updates when it changes'(
    assert: Assert
  ) {
    let modifierParams: Option<unknown[]> = null;
    let modifierNamedArgs: Option<Dict<unknown>> = null;
    let modifiedElement: SimpleElement | undefined;
    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
      didUpdate(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
    }
    let context = { id: 1 };
    let context2 = { id: 2 };
    this.registerComponent('Glimmer', 'TheFoo', '<div id="inner-div" ...attributes>Foo</div>');
    this.registerModifier('bar', Bar);
    this.render('<TheFoo {{bar "name" this foo=this}}/>', context);
    assert.deepEqual(modifierParams, ['name', context]);
    assert.deepEqual(modifierNamedArgs, { foo: context });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
    this.rerender(context2);
    assert.deepEqual(modifierParams, ['name', context2]);
    assert.deepEqual(modifierNamedArgs, { foo: context2 });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
  }

  @test
  'modifiers on components accept local variables in both positional params and named arguments, and updates when they change'(
    assert: Assert
  ) {
    let modifierParams: Option<unknown[]> = null;
    let modifierNamedArgs: Option<Dict<unknown>> = null;
    let modifiedElement: SimpleElement | undefined;
    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
      didUpdate(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        modifiedElement = this.element;
      }
    }
    this.registerComponent('Glimmer', 'TheFoo', '<div id="inner-div" ...attributes>Foo</div>');
    this.registerModifier('bar', Bar);
    this.render(
      `
      {{#let this.foo as |v|}}
        <TheFoo {{bar v foo=v}}/>
      {{/let}}
    `,
      { foo: 'bar' }
    );
    assert.deepEqual(modifierParams, ['bar']);
    assert.deepEqual(modifierNamedArgs, { foo: 'bar' });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
    this.rerender({ foo: 'qux' });
    assert.deepEqual(modifierParams, ['qux']);
    assert.deepEqual(modifierNamedArgs, { foo: 'qux' });
    assert.equal(
      modifiedElement && modifiedElement.getAttribute('id'),
      'inner-div',
      'Modifier is called on the element receiving the splattributes'
    );
  }

  @test
  'modifiers on components can be received and forwarded to inner components'(assert: Assert) {
    let modifierParams: Option<unknown[]> = null;
    let modifierNamedArgs: Option<Dict<unknown>> = null;
    let elementIds: Option<string>[] = [];

    class Bar extends AbstractInsertable {
      didInsertElement(params: unknown[], namedArgs: Dict<unknown>) {
        modifierParams = params;
        modifierNamedArgs = namedArgs;
        if (this.element) {
          elementIds.push(this.element.getAttribute('id'));
        }
      }
    }
    this.registerComponent(
      'Glimmer',
      'TheInner',
      '<div id="inner-div" ...attributes>{{yield}}</div>'
    );
    this.registerComponent(
      'Glimmer',
      'TheFoo',
      '<div id="outer-div" ...attributes>Outer</div><TheInner ...attributes>Hello</TheInner>'
    );
    this.registerModifier('bar', Bar);
    this.render(
      `
      {{#let this.foo as |v|}}
        <TheFoo {{bar v foo=v}}/>
      {{/let}}
    `,
      { foo: 'bar' }
    );
    assert.deepEqual(modifierParams, ['bar']);
    assert.deepEqual(modifierNamedArgs, { foo: 'bar' });
    assert.deepEqual(elementIds, ['outer-div', 'inner-div'], 'Modifiers are called on all levels');
  }

  @test
  'same element insertion order'(assert: Assert) {
    let insertionOrder: string[] = [];

    class Foo extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('foo');
      }
    }

    class Bar extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('bar');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);

    this.render('<div {{foo}} {{bar}}></div>');
    assert.deepEqual(insertionOrder, ['foo', 'bar']);
  }

  @test
  'same element destruction order'(assert: Assert) {
    let destructionOrder: string[] = [];

    class Foo extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('foo');
      }
    }

    class Bar extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('bar');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);

    this.render('{{#if nuke}}<div {{foo}} {{bar}}></div>{{/if}}', { nuke: true });
    assert.deepEqual(destructionOrder, []);
    this.rerender({ nuke: false });
    assert.deepEqual(destructionOrder, ['foo', 'bar']);
  }

  @test
  'parent -> child insertion order'(assert: Assert) {
    let insertionOrder: string[] = [];

    class Foo extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('foo');
      }
    }

    class Bar extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('bar');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);

    this.render('<div {{foo}}><div {{bar}}></div></div>');
    assert.deepEqual(insertionOrder, ['bar', 'foo']);
  }

  @test
  'parent -> child destruction order'(assert: Assert) {
    let destructionOrder: string[] = [];

    class Foo extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('foo');
      }
    }

    class Bar extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('bar');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);

    this.render('{{#if nuke}}<div {{foo}}><div {{bar}}></div></div>{{/if}}', { nuke: true });
    assert.deepEqual(destructionOrder, []);
    this.rerender({ nuke: false });
    assert.deepEqual(destructionOrder, ['bar', 'foo']);
  }

  @test
  'sibling insertion order'(assert: Assert) {
    let insertionOrder: string[] = [];

    class Foo extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('foo');
      }
    }

    class Bar extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('bar');
      }
    }

    class Baz extends AbstractInsertable {
      didInsertElement() {
        insertionOrder.push('baz');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);
    this.registerModifier('baz', Baz);

    this.render('<div {{foo}}><div {{bar}}></div><div {{baz}}></div></div>');
    assert.deepEqual(insertionOrder, ['bar', 'baz', 'foo']);
  }

  @test
  'sibling destruction order'(assert: Assert) {
    let destructionOrder: string[] = [];

    class Foo extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('foo');
      }
    }

    class Bar extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('bar');
      }
    }

    class Baz extends AbstractDestroyable {
      willDestroyElement() {
        destructionOrder.push('baz');
      }
    }
    this.registerModifier('bar', Bar);
    this.registerModifier('foo', Foo);
    this.registerModifier('baz', Baz);

    this.render('{{#if nuke}}<div {{foo}}><div {{bar}}></div><div {{baz}}></div></div>{{/if}}', {
      nuke: true,
    });
    assert.deepEqual(destructionOrder, []);
    this.rerender({ nuke: false });
    assert.deepEqual(destructionOrder, ['bar', 'baz', 'foo']);
  }

  @test
  'with params'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      didInsertElement([bar]: string[]) {
        count.expect('didInsertElement');
        assert.equal(bar, 'bar');
      }
      didUpdate([foo]: string[]) {
        count.expect('didUpdate');
        assert.equal(foo, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo bar}}></div>', { bar: 'bar' });
    this.rerender({ bar: 'foo' });
  }

  @test
  'with hash'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      didInsertElement(_params: unknown[], { bar }: Dict<string>) {
        count.expect('didInsertElement');
        assert.equal(bar, 'bar');
      }
      didUpdate(_params: unknown[], { bar }: Dict<string>) {
        count.expect('didUpdate');
        assert.equal(bar, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo bar=bar}}></div>', { bar: 'bar' });
    this.rerender({ bar: 'foo' });
  }

  @test
  'with hash and params'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      didInsertElement([baz]: string[], { bar }: Dict<string>) {
        count.expect('didInsertElement');
        assert.equal(bar, 'bar');
        assert.equal(baz, 'baz');
      }
      didUpdate([foo]: string[], { bar }: Dict<string>) {
        count.expect('didUpdate');
        assert.equal(bar, 'foo');
        assert.equal(foo, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo baz bar=bar}}></div>', { bar: 'bar', baz: 'baz' });
    this.rerender({ bar: 'foo', baz: 'foo' });
  }
}
jitSuite(ModifierTests);
