import TransformTestCase from '../utils/transform-test-case';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert against attrs',
  class extends TransformTestCase {
    ['@test it asserts against attrs']() {
      expectAssertion(() => {
        this.assertTransformed(`{{attrs.foo}}`, `{{attrs.foo}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{attrs.foo.bar}}`, `{{attrs.foo.bar}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{if attrs.foo "foo"}}`, `{{if attrs.foo "foo"}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(`{{#if attrs.foo}}{{/if}}`, `{{#if attrs.foo}}{{/if}}`);
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo}} should be updated to {{@foo}}./);

      expectAssertion(() => {
        this.assertTransformed(
          `{{deeply (nested attrs.foo.bar)}}`,
          `{{deeply (nested attrs.foo.bar)}}`
        );
      }, /Using {{attrs}} to reference named arguments is not supported. {{attrs.foo.bar}} should be updated to {{@foo.bar}}./);
    }

    // When removing the deprecation, ensure `{{this.attrs.foo}}` isn't rewritten and does NOT trigger any assertions/deprecations
    ['@test this.attrs is deprecated']() {
      expectDeprecation(() => {
        this.assertTransformed(`{{this.attrs.foo}}`, `{{@foo}}`);
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{if this.attrs.foo "foo"}}`, `{{if @foo "foo"}}`);
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(`{{#if this.attrs.foo}}{{/if}}`, `{{#if @foo}}{{/if}}`);
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.foo}} should be updated to {{@foo}}./);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{deeply (nested this.attrs.foo.bar)}}`,
          `{{deeply (nested @foo.bar)}}`
        );
      }, /Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.foo.bar}} should be updated to {{@foo.bar}}./);
    }
  }
);

moduleFor(
  'ember-template-compiler: not asserting against block params named "attrs"',
  class extends RenderingTestCase {
    ["@test it doesn't assert block params"]() {
      this.registerComponent('foo', {
        template: '{{#let "foo" as |attrs|}}{{attrs}}{{/let}}',
      });
      this.render('<Foo />');
      this.assertComponentElement(this.firstChild, { content: 'foo' });
    }

    ["@test it doesn't assert component block params"]() {
      this.registerComponent('foo', {
        template: '{{yield "foo"}}',
      });
      this.render('<Foo as |attrs|>{{attrs}}</Foo>');
      this.assertComponentElement(this.firstChild, { content: 'foo' });
    }

    ["@test it doesn't assert block params with nested keys"]() {
      this.registerComponent('foo', {
        template: '{{yield (hash bar="baz")}}',
      });
      this.render('<Foo as |attrs|>{{attrs.bar}}</Foo>');
      this.assertComponentElement(this.firstChild, { content: 'baz' });
    }
  }
);
