import TransformTestCase from '../utils/transform-test-case';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming attrs into @args',
  class extends TransformTestCase {
    ['@test it transforms attrs into @args']() {
      expectDeprecation(() => {
        this.assertTransformed(`{{attrs.foo}}`, `{{@foo}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{attrs.foo.bar}}`, `{{@foo.bar}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{if attrs.foo "foo"}}`, `{{if @foo "foo"}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{#if attrs.foo}}{{/if}}`, `{{#if @foo}}{{/if}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{deeply (nested attrs.foo.bar)}}`, `{{deeply (nested @foo.bar)}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{this.attrs.foo}}`, `{{@foo}}`);
      }, /Using {{attrs}} to reference named arguments has been deprecated. {{attrs.foo}} should be updated to {{@foo}}./);
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
