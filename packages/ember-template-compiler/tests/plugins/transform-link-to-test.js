import TransformTestCase from '../utils/transform-test-case';
import { compile } from '../../index';
import { moduleFor } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming inline {{link-to}} into the block form',
  class extends TransformTestCase {
    ['@test it transforms an inline {{link-to}} into its block form']() {
      this.assertTransformed(
        `{{link-to 'foo' 'index'}}`,
        `{{#link-to route='index'}}foo{{/link-to}}`
      );
    }

    ['@test bound link title']() {
      this.assertTransformed(
        `{{link-to foo 'index'}}`,
        `{{#link-to route='index'}}{{foo}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to this.foo 'index'}}`,
        `{{#link-to route='index'}}{{this.foo}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to foo.bar.baz 'index'}}`,
        `{{#link-to route='index'}}{{foo.bar.baz}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to @foo 'index'}}`,
        `{{#link-to route='index'}}{{@foo}}{{/link-to}}`
      );
    }

    ['@test sexp link title']() {
      this.assertTransformed(
        `{{link-to (foo) 'index'}}`,
        `{{#link-to route='index'}}{{foo}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to (foo bar) 'index'}}`,
        `{{#link-to route='index'}}{{foo bar}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{link-to (foo bar baz=bat) 'index'}}`,
        `{{#link-to route='index'}}{{foo bar baz=bat}}{{/link-to}}`
      );
    }
  }
);

moduleFor(
  'ember-template-compiler: transforming inline {{{link-to}}} into the block form',
  class extends TransformTestCase {
    ['@test it transforms an inline {{{link-to}}} into its block form']() {
      this.assertTransformed(
        `{{{link-to 'foo' 'index'}}}`,
        `{{#link-to route='index'}}foo{{/link-to}}`
      );
    }

    ['@test bound link title']() {
      this.assertTransformed(
        `{{{link-to foo 'index'}}}`,
        `{{#link-to route='index'}}{{{foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to this.foo 'index'}}}`,
        `{{#link-to route='index'}}{{{this.foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to foo.bar.baz 'index'}}}`,
        `{{#link-to route='index'}}{{{foo.bar.baz}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to @foo 'index'}}}`,
        `{{#link-to route='index'}}{{{@foo}}}{{/link-to}}`
      );
    }

    ['@test sexp link title']() {
      this.assertTransformed(
        `{{{link-to (foo) 'index'}}}`,
        `{{#link-to route='index'}}{{{foo}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to (foo bar) 'index'}}}`,
        `{{#link-to route='index'}}{{{foo bar}}}{{/link-to}}`
      );

      this.assertTransformed(
        `{{{link-to (foo bar baz=bat) 'index'}}}`,
        `{{#link-to route='index'}}{{{foo bar baz=bat}}}{{/link-to}}`
      );
    }
  }
);

moduleFor(
  'ember-template-compiler: transforming positional arguments into named arguments',
  class extends TransformTestCase {
    ['@test no arguments']() {
      expectAssertion(
        () => compile('{{#link-to}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /You must provide one or more parameters to the `{{link-to}}` component. \('-top-level' @ L1:C0\)/
      );

      expectAssertion(
        () => compile('{{#link-to class="wow"}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /You must provide one or more parameters to the `{{link-to}}` component. \('-top-level' @ L1:C0\)/
      );

      // these are ok

      compile('{{#link-to params=foo}}zomg{{/link-to}}', { moduleName: '-top-level' });
      compile('{{#link-to route=foo}}zomg{{/link-to}}', { moduleName: '-top-level' });
      compile('{{#link-to model=foo}}zomg{{/link-to}}', { moduleName: '-top-level' });
      compile('{{#link-to models=foo}}zomg{{/link-to}}', { moduleName: '-top-level' });
      compile('{{#link-to query=foo}}zomg{{/link-to}}', { moduleName: '-top-level' });
    }

    ['@test mixing positional and named arguments']() {
      expectAssertion(
        () => compile('{{#link-to foo params=bar}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /cannot pass positional parameters and the `params` argument to the `{{link-to}}` component at the same time. \('-top-level' @ L1:C0\)/
      );

      expectAssertion(
        () => compile('{{#link-to foo route=bar}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /cannot pass positional parameters and the `route` argument to the `{{link-to}}` component at the same time. \('-top-level' @ L1:C0\)/
      );

      expectAssertion(
        () => compile('{{#link-to foo model=bar}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /cannot pass positional parameters and the `model` argument to the `{{link-to}}` component at the same time. \('-top-level' @ L1:C0\)/
      );

      expectAssertion(
        () => compile('{{#link-to foo models=bar}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /cannot pass positional parameters and the `models` argument to the `{{link-to}}` component at the same time. \('-top-level' @ L1:C0\)/
      );

      expectAssertion(
        () => compile('{{#link-to foo query=bar}}zomg{{/link-to}}', { moduleName: '-top-level' }),
        /cannot pass positional parameters and the `query` argument to the `{{link-to}}` component at the same time. \('-top-level' @ L1:C0\)/
      );
    }

    ['@test route only']() {
      this.assertTransformed(
        `{{#link-to 'foo'}}Foo{{/link-to}}`,
        `{{#link-to route='foo'}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to foo}}Foo{{/link-to}}`,
        `{{#link-to route=foo}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to this.foo}}Foo{{/link-to}}`,
        `{{#link-to route=this.foo}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to foo.bar.baz}}Foo{{/link-to}}`,
        `{{#link-to route=foo.bar.baz}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to @foo}}Foo{{/link-to}}`,
        `{{#link-to route=@foo}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to @foo}}Foo{{/link-to}}`,
        `{{#link-to route=@foo}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to (foo)}}Foo{{/link-to}}`,
        `{{#link-to route=(foo)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to (foo bar)}}Foo{{/link-to}}`,
        `{{#link-to route=(foo bar)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to (foo bar baz=bat)}}Foo{{/link-to}}`,
        `{{#link-to route=(foo bar baz=bat)}}Foo{{/link-to}}`
      );
    }

    ['@test single model']() {
      this.assertTransformed(
        `{{#link-to 'foo' 'bar'}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model='bar'}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' bar}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=bar}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' this.bar}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=this.bar}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' bar.baz.bat}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=bar.baz.bat}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' @bar}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=@bar}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=(bar)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar baz)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=(bar baz)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar baz bat=wat)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' model=(bar baz bat=wat)}}Foo{{/link-to}}`
      );
    }

    ['@test multi models']() {
      this.assertTransformed(
        `{{#link-to 'foo' 'bar' 'baz' 'bat'}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array 'bar' 'baz' 'bat')}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' bar baz bat}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array bar baz bat)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' this.bar this.baz this.bat}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array this.bar this.baz this.bat)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' bar.baz.bat baz.bat.bar bat.bar.baz}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array bar.baz.bat baz.bat.bar bat.bar.baz)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' @bar @baz @bat}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array @bar @baz @bat)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar) (baz) (bat)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array (bar) (baz) (bat))}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar baz) (baz bat) (bat bar)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array (bar baz) (baz bat) (bat bar))}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (bar baz bat=wat) (baz bat wat=bar) (bat wat bar=baz)}}Foo{{/link-to}}`,
        `{{#link-to route='foo' models=(array (bar baz bat=wat) (baz bat wat=bar) (bat wat bar=baz))}}Foo{{/link-to}}`
      );
    }

    ['@test query params']() {
      QUnit.dump.maxDepth = 100;

      this.assertTransformed(
        `{{#link-to (query-params)}}Foo{{/link-to}}`,
        `{{#link-to query=(-hash)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
        `{{#link-to query=(-hash foo='bar' baz=bat)}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
        `{{#link-to query=(-hash foo='bar' baz=bat) route='foo'}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' 'bar' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
        `{{#link-to query=(-hash foo='bar' baz=bat) route='foo' model='bar'}}Foo{{/link-to}}`
      );

      this.assertTransformed(
        `{{#link-to 'foo' 'bar' 'baz' 'bat' 'wat' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
        `{{#link-to query=(-hash foo='bar' baz=bat) route='foo' models=(array 'bar' 'baz' 'bat' 'wat')}}Foo{{/link-to}}`
      );
    }
  }
);
