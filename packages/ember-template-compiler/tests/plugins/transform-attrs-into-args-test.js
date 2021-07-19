import TransformTestCase from '../utils/transform-test-case';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming attrs into @args',
  class extends TransformTestCase {
    ['@test it transforms attrs into @args']() {
      expectAssertion(() => {
        this.assertTransformed(`{{attrs.foo}}`, `{{@foo}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{attrs.foo.bar}}`, `{{@foo.bar}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{if attrs.foo "foo"}}`, `{{if @foo "foo"}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{#if attrs.foo}}{{/if}}`, `{{#if @foo}}{{/if}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{deeply (nested attrs.foo.bar)}}`, `{{deeply (nested @foo.bar)}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);
    }

    ['@test it transforms this.attrs into @args']() {
      this.assertTransformed(`{{this.attrs.foo}}`, `{{@foo}}`);

      this.assertTransformed(`{{this.attrs.foo.bar}}`, `{{@foo.bar}}`);

      this.assertTransformed(`{{if this.attrs.foo "foo"}}`, `{{if @foo "foo"}}`);

      this.assertTransformed(`{{#if this.attrs.foo}}{{/if}}`, `{{#if @foo}}{{/if}}`);

      this.assertTransformed(
        `{{deeply (nested this.attrs.foo.bar)}}`,
        `{{deeply (nested @foo.bar)}}`
      );
    }
  }
);

moduleFor(
  'ember-template-compiler: not transforming block params named "attrs" into @args',
  class extends RenderingTestCase {
    ["@test it doesn't transform block params"]() {
      this.registerComponent('foo', {
        template: '{{#let "foo" as |attrs|}}{{attrs}}{{/let}}',
      });
      this.render('<Foo />');
      this.assertComponentElement(this.firstChild, { content: 'foo' });
    }

    ["@test it doesn't transform component block params"]() {
      this.registerComponent('foo', {
        template: '{{yield "foo"}}',
      });
      this.render('<Foo as |attrs|>{{attrs}}</Foo>');
      this.assertComponentElement(this.firstChild, { content: 'foo' });
    }

    ["@test it doesn't transform block params with nested keys"]() {
      this.registerComponent('foo', {
        template: '{{yield (hash bar="baz")}}',
      });
      this.render('<Foo as |attrs|>{{attrs.bar}}</Foo>');
      this.assertComponentElement(this.firstChild, { content: 'baz' });
    }
  }
);
