import type { Dict, SimpleElement } from '@glimmer/interfaces';
import type { Count } from '@glimmer-workspace/integration-tests';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

class BaseModifier {
  element?: SimpleElement;
  didInsertElement(_params: unknown[], _hash: Dict): void {}
  willDestroyElement(): void {}
  didUpdate(_params: unknown[], _hash: Dict): void {}
}

abstract class AbstractInsertable extends BaseModifier {
  abstract override didInsertElement(_params: unknown[], _hash: Dict): void;
}

abstract class AbstractDestroyable extends BaseModifier {
  abstract override willDestroyElement(): void;
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
          assert.strictEqual(this.element?.getAttribute('data-ok'), 'true', 'didInsertElement');
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

    this.render('{{#if this.ok}}<div data-ok=true {{foo this.bar}}></div>{{/if}}', {
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

    this.render('{{#if this.ok}}<div {{foo "foo" bar="baz"}}></div>{{/if}}{{this.ok}}', {
      ok: true,
      data: 'ok',
    });
    this.rerender({ data: 'yup' });
    this.rerender({ ok: false });
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

    this.render('{{#if this.nuke}}<div {{foo}} {{bar}}></div>{{/if}}', { nuke: true });
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

    this.render('{{#if this.nuke}}<div {{foo}}><div {{bar}}></div></div>{{/if}}', { nuke: true });
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

    this.render(
      '{{#if this.nuke}}<div {{foo}}><div {{bar}}></div><div {{baz}}></div></div>{{/if}}',
      {
        nuke: true,
      }
    );
    assert.deepEqual(destructionOrder, []);
    this.rerender({ nuke: false });
    assert.deepEqual(destructionOrder, ['bar', 'baz', 'foo']);
  }

  @test
  'with params'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      override didInsertElement([bar]: string[]) {
        count.expect('didInsertElement');
        assert.strictEqual(bar, 'bar');
      }
      override didUpdate([foo]: string[]) {
        count.expect('didUpdate');
        assert.strictEqual(foo, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo this.bar}}></div>', { bar: 'bar' });
    this.rerender({ bar: 'foo' });
  }

  @test
  'with hash'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      override didInsertElement(_params: unknown[], { bar }: Dict<string>) {
        count.expect('didInsertElement');
        assert.strictEqual(bar, 'bar');
      }
      override didUpdate(_params: unknown[], { bar }: Dict<string>) {
        count.expect('didUpdate');
        assert.strictEqual(bar, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo bar=this.bar}}></div>', { bar: 'bar' });
    this.rerender({ bar: 'foo' });
  }

  @test
  'with hash and params'(assert: Assert, count: Count) {
    class Foo extends BaseModifier {
      override didInsertElement([baz]: string[], { bar }: Dict<string>) {
        count.expect('didInsertElement');
        assert.strictEqual(bar, 'bar');
        assert.strictEqual(baz, 'baz');
      }
      override didUpdate([foo]: string[], { bar }: Dict<string>) {
        count.expect('didUpdate');
        assert.strictEqual(bar, 'foo');
        assert.strictEqual(foo, 'foo');
      }
    }
    this.registerModifier('foo', Foo);
    this.render('<div {{foo this.baz bar=this.bar}}></div>', { bar: 'bar', baz: 'baz' });
    this.rerender({ bar: 'foo', baz: 'foo' });
  }
}
jitSuite(ModifierTests);
