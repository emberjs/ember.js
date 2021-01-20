import TransformTestCase from '../utils/transform-test-case';
import { compile } from '../../index';
import { moduleFor } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming inline {{link-to}} into the block form',
  class extends TransformTestCase {
    ['@test [DEPRECATED] it transforms an inline {{link-to}} into its block form']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to 'foo' 'index'}}`,
          `{{#link-to route='index'}}foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] bound link title']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to foo 'index'}}`,
          `{{#link-to route='index'}}{{foo}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to this.foo 'index'}}`,
          `{{#link-to route='index'}}{{this.foo}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to foo.bar.baz 'index'}}`,
          `{{#link-to route='index'}}{{foo.bar.baz}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to @foo 'index'}}`,
          `{{#link-to route='index'}}{{@foo}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] sexp link title']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to (foo) 'index'}}`,
          `{{#link-to route='index'}}{{foo}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to (foo bar) 'index'}}`,
          `{{#link-to route='index'}}{{foo bar}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{link-to (foo bar baz=bat) 'index'}}`,
          `{{#link-to route='index'}}{{foo bar baz=bat}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }
  }
);

moduleFor(
  'ember-template-compiler: transforming inline {{{link-to}}} into the block form',
  class extends TransformTestCase {
    ['@test [DEPRECATED] it transforms an inline {{{link-to}}} into its block form']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to 'foo' 'index'}}}`,
          `{{#link-to route='index'}}foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] bound link title']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to foo 'index'}}}`,
          `{{#link-to route='index'}}{{{foo}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to this.foo 'index'}}}`,
          `{{#link-to route='index'}}{{{this.foo}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to foo.bar.baz 'index'}}}`,
          `{{#link-to route='index'}}{{{foo.bar.baz}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to @foo 'index'}}}`,
          `{{#link-to route='index'}}{{{@foo}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] sexp link title']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to (foo) 'index'}}}`,
          `{{#link-to route='index'}}{{{foo}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to (foo bar) 'index'}}}`,
          `{{#link-to route='index'}}{{{foo bar}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{{link-to (foo bar baz=bat) 'index'}}}`,
          `{{#link-to route='index'}}{{{foo bar baz=bat}}}{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }
  }
);

moduleFor(
  'ember-template-compiler: transforming positional arguments into named arguments',
  class extends TransformTestCase {
    ['@test [DEPRECATED] no arguments']() {
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

    ['@test [DEPRECATED] mixing positional and named arguments']() {
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

    ['@test [DEPRECATED] route only']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo'}}Foo{{/link-to}}`,
          `{{#link-to route='foo'}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to foo}}Foo{{/link-to}}`,
          `{{#link-to route=foo}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to this.foo}}Foo{{/link-to}}`,
          `{{#link-to route=this.foo}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to foo.bar.baz}}Foo{{/link-to}}`,
          `{{#link-to route=foo.bar.baz}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to @foo}}Foo{{/link-to}}`,
          `{{#link-to route=@foo}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to @foo}}Foo{{/link-to}}`,
          `{{#link-to route=@foo}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to (foo)}}Foo{{/link-to}}`,
          `{{#link-to route=(foo)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to (foo bar)}}Foo{{/link-to}}`,
          `{{#link-to route=(foo bar)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to (foo bar baz=bat)}}Foo{{/link-to}}`,
          `{{#link-to route=(foo bar baz=bat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] single model']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' 'bar'}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model='bar'}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' bar}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=bar}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' this.bar}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=this.bar}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' bar.baz.bat}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=bar.baz.bat}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' @bar}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=@bar}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=(bar)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar baz)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=(bar baz)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar baz bat=wat)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' model=(bar baz bat=wat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] multi models']() {
      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' 'bar' 'baz' 'bat'}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array 'bar' 'baz' 'bat')}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' bar baz bat}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array bar baz bat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' this.bar this.baz this.bat}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array this.bar this.baz this.bat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' bar.baz.bat baz.bat.bar bat.bar.baz}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array bar.baz.bat baz.bat.bar bat.bar.baz)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' @bar @baz @bat}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array @bar @baz @bat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar) (baz) (bat)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array (bar) (baz) (bat))}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar baz) (baz bat) (bat bar)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array (bar baz) (baz bat) (bat bar))}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (bar baz bat=wat) (baz bat wat=bar) (bat wat bar=baz)}}Foo{{/link-to}}`,
          `{{#link-to route='foo' models=(array (bar baz bat=wat) (baz bat wat=bar) (bat wat bar=baz))}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }

    ['@test [DEPRECATED] query params']() {
      QUnit.dump.maxDepth = 100;

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to (query-params)}}Foo{{/link-to}}`,
          `{{#link-to query=(-hash)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
          `{{#link-to query=(-hash foo='bar' baz=bat)}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
          `{{#link-to query=(-hash foo='bar' baz=bat) route='foo'}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' 'bar' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
          `{{#link-to query=(-hash foo='bar' baz=bat) route='foo' model='bar'}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      expectDeprecation(() => {
        this.assertTransformed(
          `{{#link-to 'foo' 'bar' 'baz' 'bat' 'wat' (query-params foo='bar' baz=bat)}}Foo{{/link-to}}`,
          `{{#link-to query=(-hash foo='bar' baz=bat) route='foo' models=(array 'bar' 'baz' 'bat' 'wat')}}Foo{{/link-to}}`
        );
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);
    }
  }
);
