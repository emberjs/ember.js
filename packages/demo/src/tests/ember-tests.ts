/**
 * Ember Integration Tests for GXT
 *
 * This file imports a subset of the main Ember tests to verify
 * the GXT rendering integration works correctly.
 */

// Import test infrastructure
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

// Import full Ember curly-components tests
import '../../../@ember/-internals/glimmer/tests/integration/components/curly-components-test';
// Import custom helper tests
import '../../../@ember/-internals/glimmer/tests/integration/helpers/custom-helper-test';
// Import helper manager tests
import '../../../@ember/-internals/glimmer/tests/integration/helpers/helper-manager-test';
// Import {{get}} helper tests
import '../../../@ember/-internals/glimmer/tests/integration/helpers/get-test';
// Import Helper Tracked Properties tests
import '../../../@ember/-internals/glimmer/tests/integration/helpers/tracked-test';
// Import {{log}} helper tests
import '../../../@ember/-internals/glimmer/tests/integration/helpers/log-test';
// Import {{input}} tests
import '../../../@ember/-internals/glimmer/tests/integration/components/input-curly-test';
// Import {{textarea}} tests
import '../../../@ember/-internals/glimmer/tests/integration/components/textarea-curly-test';
// Import View tree tests
import '../../../@ember/-internals/glimmer/tests/integration/components/utils-test';
import { set } from '@ember/object';
import Component from '@ember/component';
import { setComponentTemplate } from '@ember/component';

// Declare QUnit
declare const QUnit: any;

/**
 * Local replacement for the removed `RenderingTestCase#registerComponent`
 * helper (commit 176b87e8e4 unified test infrastructure on
 * `precompileTemplate`). These GXT integration tests still use the legacy
 * runtime-compile registration API, so we restore it as a local mixin to
 * avoid rewriting every test body. When no `ComponentClass` is supplied
 * we default to the curly `Component` so the rendered output carries the
 * standard `<div class="ember-view">` wrapper that `assertComponentElement`
 * defaults to expecting (matches the legacy registerComponent behavior).
 */
class RegisterableRenderingTestCase extends RenderingTestCase {
  registerComponent(
    name: string,
    options: { template?: string | null; ComponentClass?: any } = {}
  ): void {
    let { template = null } = options;
    // Default ComponentClass to the curly `Component` so the rendered
    // output gets the standard wrapping `<div class="ember-view">` element
    // that `assertComponentElement` defaults to expecting. Callers that
    // explicitly pass a class get exactly that class.
    let ComponentClass = options.ComponentClass ?? Component;
    let { owner } = this;

    // Avoid re-setting a template on the shared base Component class.
    if (ComponentClass === Component) {
      ComponentClass = class extends Component {};
    }
    owner.register(`component:${name}`, ComponentClass);
    if (typeof template === 'string') {
      setComponentTemplate(this.compile(template), ComponentClass);
    }
  }
}

// Basic angle-bracket invocation tests
moduleFor(
  'GXT Integration - AngleBracket Invocation',
  class extends RegisterableRenderingTestCase {
    '@test it can resolve <XBlah /> to x-blah'() {
      this.registerComponent('x-blah', { template: 'hello' });

      this.render('<XBlah />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic template only component'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic component with template and javascript'() {
      this.registerComponent('foo-bar', {
        template: 'FIZZ BAR {{this.local}}',
        ComponentClass: class extends Component {
          local = 'hey';
        },
      });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'FIZZ BAR hey' });
    }

    '@test it can render a single word component name'() {
      this.registerComponent('foo', { template: 'hello' });

      this.render('<Foo />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can have a custom id and it is not bound'() {
      this.registerComponent('foo-bar', { template: '{{this.id}} {{this.localId}}' });

      this.render('<FooBar @localId={{this.id}} id="bizz" />', { id: 'bar' });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bar',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bar',
      });

      runTask(() => set(this.context, 'id', 'qux'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz qux',
      });
    }

    '@test it can render a self-closing component'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a component with block content'() {
      this.registerComponent('foo-bar', { template: '{{yield}}' });

      this.render('<FooBar>block content</FooBar>');

      this.assertComponentElement(this.firstChild, { content: 'block content' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'block content' });
    }

    '@test it can yield values from template'() {
      this.registerComponent('foo-bar', { template: '{{yield "hello"}}' });

      this.render('<FooBar as |value|>{{value}}</FooBar>');

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can yield multiple values'() {
      this.registerComponent('foo-bar', { template: '{{yield "hello" "world"}}' });

      this.render('<FooBar as |greeting name|>{{greeting}} {{name}}</FooBar>');

      this.assertComponentElement(this.firstChild, { content: 'hello world' });
    }

    '@test it renders named blocks'() {
      this.registerComponent('foo-bar', {
        template: '<header>{{yield to="header"}}</header><main>{{yield}}</main>',
      });

      this.render(`
        <FooBar>
          <:header>Header Content</:header>
          <:default>Main Content</:default>
        </FooBar>
      `);

      this.assertText('Header ContentMain Content');
    }

    '@test it can use hasBlock'() {
      this.registerComponent('foo-bar', {
        template: '{{#if (has-block)}}has block{{else}}no block{{/if}}',
      });

      this.render('<FooBar>content</FooBar>');
      this.assertText('has block');

      // Note: Can't easily test without block in same test
    }

    '@test it can render curly component invocation in template'() {
      // Test that {{foo-bar-baz}} curly syntax gets transformed to <foo-bar-baz />
      this.registerComponent('foo-bar', { template: 'outer {{foo-bar-baz}}' });
      this.registerComponent('foo-bar-baz', { template: 'inner' });

      this.render('<FooBar />');

      this.assertText('outer inner');
    }

    '@test it can render nested curly components'() {
      // Test nested curly component invocations
      this.registerComponent('parent-comp', { template: 'parent: {{child-comp}}' });
      this.registerComponent('child-comp', { template: 'child: {{grandchild-comp}}' });
      this.registerComponent('grandchild-comp', { template: 'grandchild' });

      this.render('<ParentComp />');

      this.assertText('parent: child: grandchild');
    }
  }
);

// Component with args tests
moduleFor(
  'GXT Integration - Component Args',
  class extends RegisterableRenderingTestCase {
    '@test it can pass args to component'() {
      this.registerComponent('foo-bar', { template: '{{@greeting}} {{@name}}' });

      this.render('<FooBar @greeting="Hello" @name="World" />');

      this.assertComponentElement(this.firstChild, { content: 'Hello World' });
    }

    '@test args are reactive'() {
      this.registerComponent('foo-bar', { template: '{{@value}}' });

      this.render('<FooBar @value={{this.value}} />', { value: 'initial' });

      this.assertComponentElement(this.firstChild, { content: 'initial' });

      runTask(() => set(this.context, 'value', 'updated'));

      this.assertComponentElement(this.firstChild, { content: 'updated' });
    }

    '@test it supports splattributes'() {
      this.registerComponent('foo-bar', { template: '<div ...attributes>content</div>' });

      this.render('<FooBar class="custom" data-test="value" />');

      const element = this.firstChild.firstChild;
      this.assert.equal(element.className, 'custom');
      this.assert.equal(element.getAttribute('data-test'), 'value');
    }
  }
);

// Nested components tests
moduleFor(
  'GXT Integration - Nested Components',
  class extends RegisterableRenderingTestCase {
    '@test it can render nested components'() {
      this.registerComponent('outer', { template: '<div class="outer">{{yield}}</div>' });
      this.registerComponent('inner', { template: '<span class="inner">inner content</span>' });

      this.render('<Outer><Inner /></Outer>');

      this.assertText('inner content');
    }

    '@test it can pass data through nested components'() {
      this.registerComponent('outer', { template: '{{yield "from outer"}}' });
      this.registerComponent('inner', { template: '{{@message}}' });

      this.render('<Outer as |msg|><Inner @message={{msg}} /></Outer>');

      this.assertText('from outer');
    }
  }
);
