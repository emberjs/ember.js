import { RenderTest, module, test, Count } from '@glimmer/test-helpers';
import { Opaque, Dict } from '../../util';

class BaseModifier {
  element?: Element;
  didInsertElement(_params: Opaque[], _hash: Dict<Opaque>) {}
  willDestroyElement() {}
  didUpdate(_params: Opaque[], _hash: Dict<Opaque>) {}
}

abstract class AbstractInsertable extends BaseModifier {
  abstract didInsertElement(_params: Opaque[], _hash: Dict<Opaque>): void;
}

abstract class AbstractDestroyable extends BaseModifier {
  abstract willDestroyElement(): void;
}

class ModifierTests extends RenderTest {
  @test
  'Element modifier with hooks'(assert: Assert, count: Count) {
    this.registerModifier(
      'foo',
      class {
        element?: Element;
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
        element?: Element;
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
  'do not work on component invocations'(assert: Assert) {
    this.registerComponent('Glimmer', 'Foo', '<div ...attributes>Foo</div>');
    this.registerModifier('bar', BaseModifier);
    assert.throws(() => {
      this.render('<Foo {{bar foo="foo"}} />');
    }, 'Compile Error: Element modifiers are not allowed in components');

    assert.throws(() => {
      this.render('<Foo (bar foo="foo") />');
    }, 'Compile Error: Element modifiers are not allowed in components');
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
      didInsertElement(_params: Opaque[], { bar }: Dict<string>) {
        count.expect('didInsertElement');
        assert.equal(bar, 'bar');
      }
      didUpdate(_params: Opaque[], { bar }: Dict<string>) {
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
module('Modifiers', ModifierTests);
