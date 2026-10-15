/**
 * Component and helper values in content position (compat, GXT_MODE).
 *
 * Glimmer semantics (@glimmer/runtime's `toDynamicContentType`): a `{{value}}`
 * content mustache whose value is a component definition renders the
 * component, and one whose value is a helper definition renders the value of
 * the helper invoked without arguments. A class is such a definition when a
 * component or helper manager is associated with it; it is never called as a
 * plain function. When the value changes to another definition, the content
 * renders the new one.
 *
 * An error thrown while a content mustache is evaluated is an error of the
 * render.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { setOwner } from '@ember/-internals/owner';
import { helperCapabilities, setComponentTemplate, setHelperManager } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';

// A class-based helper: the manager creates an instance of the class and
// renders what its `value()` returns.
class ValueHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true });
  owner: unknown;

  constructor(owner: unknown) {
    this.owner = owner;
  }

  createHelper(Definition: any) {
    return new Definition(this.owner);
  }

  getValue(instance: ValueHelper) {
    return instance.value();
  }
}

class ValueHelper {
  constructor(owner: any) {
    setOwner(this, owner);
  }

  value(): unknown {
    return undefined;
  }
}

setHelperManager((owner: unknown) => new ValueHelperManager(owner), ValueHelper);

class HelloHelper extends ValueHelper {
  override value() {
    return 'Hello, world!';
  }
}

class GoodbyeHelper extends ValueHelper {
  override value() {
    return 'Goodbye, world!';
  }
}

moduleFor(
  'GXT component and helper values in content position',
  class extends RenderingTestCase {
    ['@test a component class value renders its component']() {
      let Hello = setComponentTemplate(
        this.compile('Hello, world!'),
        class extends GlimmerComponent {}
      );
      let Goodbye = setComponentTemplate(
        this.compile('Goodbye, world!'),
        class extends GlimmerComponent {}
      );

      this.render('[{{this.value}}]', { value: Hello });
      this.assertText('[Hello, world!]');

      runTask(() => set(this.context, 'value', Goodbye));
      this.assertText('[Goodbye, world!]');
    }

    ['@test a helper class value renders the value of the helper']() {
      this.render('[{{this.value}}]', { value: HelloHelper });
      this.assertText('[Hello, world!]');

      runTask(() => set(this.context, 'value', GoodbyeHelper));
      this.assertText('[Goodbye, world!]');
    }

    ['@test a helper class value inside an element renders the value of the helper']() {
      this.render('<p>{{this.value}}</p>', { value: HelloHelper });
      this.assertHTML('<p>Hello, world!</p>');

      runTask(() => set(this.context, 'value', GoodbyeHelper));
      this.assertHTML('<p>Goodbye, world!</p>');
    }

    ['@test an error thrown while content is evaluated is an error of the render']() {
      this.assert.throws(() => {
        this.render('[{{this.explode}}]', {
          explode() {
            throw new Error('the content exploded');
          },
        });
      }, /the content exploded/);
    }
  }
);
