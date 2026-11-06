/**
 * Custom elements (compat, GXT_MODE).
 *
 * Glimmer semantics: a tag is a component invocation only when it starts with
 * an uppercase letter or is a path. A lowercase tag with a dash (`<x-foo>`) is
 * a custom element, even when a component or a helper of that name exists: the
 * template of the component `x-foo` may render `<x-foo>` as its own element
 * (the Ember Islands setup does). The element gets its attributes, modifiers
 * and children like any other element.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { defineSimpleModifier, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { helper } from '@ember/component/helper';
import templateOnly from '@ember/component/template-only';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';

moduleFor(
  'GXT custom elements',
  class extends RenderingTestCase {
    ['@test the template of the component x-foo renders <x-foo> as its element']() {
      let installs = 0;
      this.owner.register(
        'component:x-foo',
        setComponentTemplate(
          precompileTemplate(
            '<x-foo class="a" {{this.inserted}}><h1>X-Foo</h1><p>Hello {{@name}}</p></x-foo>'
          ),
          class extends GlimmerComponent {
            inserted = defineSimpleModifier(() => {
              installs++;
            });
          }
        )
      );

      this.render('<XFoo @name={{this.name}} />', { name: 'Godfrey' });
      const elements = this.element.querySelectorAll('x-foo');
      this.assert.strictEqual(elements.length, 1, 'one x-foo element');
      this.assert.strictEqual(elements[0]!.getAttribute('class'), 'a');
      this.assert.strictEqual(installs, 1, 'its modifier is installed once');
      this.assertText('X-FooHello Godfrey');

      runTask(() => set(this.context, 'name', 'Tom'));
      this.assertText('X-FooHello Tom');
      this.assert.strictEqual(this.element.querySelectorAll('x-foo').length, 1);
      this.assert.strictEqual(installs, 1);
    }

    ['@test a lowercase dashed tag is an element when a helper of that name exists']() {
      this.owner.register(
        'helper:x-bar',
        helper(() => 'helper')
      );
      this.render('<x-bar data-a="1"></x-bar><x-bar><b>b</b></x-bar>');
      const elements = this.element.querySelectorAll('x-bar');
      this.assert.strictEqual(elements.length, 2, 'two x-bar elements');
      this.assert.deepEqual(elements[0]!.getAttributeNames(), ['data-a']);
      this.assert.strictEqual(elements[0]!.childNodes.length, 0);
      this.assert.strictEqual(elements[1]!.innerHTML, '<b>b</b>');
      this.assertText('b');
    }

    ['@test an empty lowercase dashed element renders with no attribute it was not given']() {
      this.render('<x-baz></x-baz><x-baz class={{this.cls}}></x-baz>', { cls: 'c' });
      const elements = this.element.querySelectorAll('x-baz');
      this.assert.strictEqual(elements.length, 2);
      this.assert.deepEqual(elements[0]!.getAttributeNames(), []);
      this.assert.deepEqual(elements[1]!.getAttributeNames(), ['class']);

      runTask(() => set(this.context, 'cls', 'd'));
      this.assert.strictEqual(
        this.element.querySelectorAll('x-baz')[1]!.getAttribute('class'),
        'd'
      );
    }

    ['@test <Foo::Bar> and <XQux> still invoke components']() {
      this.owner.register(
        'component:foo/bar',
        setComponentTemplate(precompileTemplate('[foo/bar {{@x}}]'), templateOnly())
      );
      this.owner.register(
        'component:x-qux',
        setComponentTemplate(precompileTemplate('[x-qux {{yield}}]'), templateOnly())
      );
      this.render('<Foo::Bar @x="1"></Foo::Bar><XQux>b</XQux>');
      this.assertText('[foo/bar 1][x-qux b]');
      this.assert.strictEqual(this.element.querySelectorAll('x-qux').length, 0);
    }
  }
);
