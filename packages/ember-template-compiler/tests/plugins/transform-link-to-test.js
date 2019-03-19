import TransformTestCase from '../utils/transform-test-case';
import { moduleFor } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming inline {{link-to}} into the block form',
  class extends TransformTestCase {
    ['@test it transforms an inline {{link-to}} into its block form']() {
      this.assertTransformed(`{{link-to 'foo' 'index'}}`, `{{#link-to 'index'}}foo{{/link-to}}`);
    }

    ['@test bound link title']() {
      this.assertTransformed(`{{link-to foo 'index'}}`, `{{#link-to 'index'}}{{foo}}{{/link-to}}`);

      this.assertTransformed(
        `{{link-to this.foo 'index'}}`,
        `{{#link-to 'index'}}{{this.foo}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to foo.bar.baz 'index'}}`,
        `{{#link-to 'index'}}{{foo.bar.baz}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to @foo 'index'}}`,
        `{{#link-to 'index'}}{{@foo}}{{/link-to}}`
      );
    }

    ['@test sexp link title']() {
      this.assertTransformed(
        `{{link-to (foo) 'index'}}`,
        `{{#link-to 'index'}}{{foo}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to (foo bar) 'index'}}`,
        `{{#link-to 'index'}}{{foo bar}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to (foo bar baz=bat) 'index'}}`,
        `{{#link-to 'index'}}{{foo bar baz=bat}}{{/link-to}}`
      );
    }
  }
);

moduleFor(
  'ember-template-compiler: transforming inline {{{link-to}}} into the block form',
  class extends TransformTestCase {
    ['@test it transforms an inline {{{link-to}}} into its block form']() {
      this.assertTransformed(`{{{link-to 'foo' 'index'}}}`, `{{#link-to 'index'}}foo{{/link-to}}`);
    }

    ['@test bound link title']() {
      this.assertTransformed(
        `{{{link-to foo 'index'}}}`,
        `{{#link-to 'index'}}{{{foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to this.foo 'index'}}}`,
        `{{#link-to 'index'}}{{{this.foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to foo.bar.baz 'index'}}}`,
        `{{#link-to 'index'}}{{{foo.bar.baz}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to @foo 'index'}}}`,
        `{{#link-to 'index'}}{{{@foo}}}{{/link-to}}`
      );
    }

    ['@test sexp link title']() {
      this.assertTransformed(
        `{{{link-to (foo) 'index'}}}`,
        `{{#link-to 'index'}}{{{foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to (foo bar) 'index'}}}`,
        `{{#link-to 'index'}}{{{foo bar}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to (foo bar baz=bat) 'index'}}}`,
        `{{#link-to 'index'}}{{{foo bar baz=bat}}}{{/link-to}}`
      );
    }
  }
);
