import { preprocess as parse } from '@glimmer/syntax';
import { syntaxErrorFor } from '@glimmer-workspace/test-utils';

const { module, test } = QUnit;

module('[glimmer-syntax] Parser - parse error regression fixtures', function () {
  // prettier tests/format/handlebars/_errors_/invalid-3.hbs
  test('empty mustache {{}} is a parse error (invalid-3.hbs)', (assert) => {
    assert.throws(
      () => {
        parse('<a>\n\n{{}}\n');
      },
      /./u,
      'empty mustache should throw a parse error'
    );
  });

  // prettier tests/format/handlebars/_errors_/invalid.hbs
  test('unclosed mustache {{@name} is a parse error (invalid.hbs)', (assert) => {
    assert.throws(
      () => {
        parse('<A >\nx, {{@name}\n');
      },
      /./u,
      'unclosed mustache should throw a parse error'
    );
  });

  // prettier tests/format/handlebars/_errors_/tilde-comments-1.hbs
  test('bare tilde mustache {{~}} is a parse error (tilde-comments-1.hbs)', (assert) => {
    assert.throws(
      () => {
        parse('{{~}}\n');
      },
      /./u,
      'bare tilde mustache should throw a parse error'
    );
  });

  // prettier tests/format/handlebars/_errors_/tilde-comments-2.hbs
  test('double tilde mustache {{~~}} is a parse error (tilde-comments-2.hbs)', (assert) => {
    assert.throws(
      () => {
        parse('{{~~}}\n');
      },
      /./u,
      'double tilde mustache should throw a parse error'
    );
  });

  // assert-reserved-named-arguments-test: '@' alone is reserved / parse error
  test('mustache with bare @ is a parse error ({{@}})', (assert) => {
    assert.throws(
      () => {
        parse('{{@}}');
      },
      /./u,
      'mustache with bare @ should throw a parse error'
    );
  });

  // assert-reserved-named-arguments-test: '@0' is not a valid path
  test('mustache with @<digit> is a parse error ({{@0}})', (assert) => {
    assert.throws(
      () => {
        parse('{{@0}}');
      },
      /./u,
      '@<digit> is not a valid identifier'
    );
  });

  // assert-reserved-named-arguments-test: '@@', '@=', '@!' etc.
  test('mustache with @<non-id-char> is a parse error ({{@@}}, {{@=}}, {{@!}})', (assert) => {
    for (const input of ['{{@@}}', '{{@=}}', '{{@!}}']) {
      assert.throws(
        () => {
          parse(input);
        },
        /./u,
        `${input} should throw a parse error`
      );
    }
  });
});

module(
  '[glimmer-syntax] Parser - unsupported syntax is a syntax error, not a TypeError',
  function () {
    function assertSyntaxError(
      assert: Assert,
      template: string,
      message: string,
      code: string,
      line: number,
      column: number
    ) {
      assert.throws(
        () => {
          parse(template, { meta: { moduleName: 'test-module' } });
        },
        syntaxErrorFor(message, code, 'test-module', line, column),
        `${template} throws a syntax error`
      );
    }

    const HASH_LITERAL =
      'Hash literals are not supported. Use named arguments (`{{helper foo=bar}}`) or the `hash` helper (`(hash foo=bar)`) instead';

    test('inverse sections without {{else}}', (assert) => {
      assertSyntaxError(
        assert,
        '{{^foo}}x{{/foo}}',
        'Inverse sections (`{{^foo}}...{{/foo}}`) are not supported. Use `{{#unless foo}}...{{/unless}}` instead',
        '{{^foo}}x{{/foo}}',
        1,
        0
      );
    });

    test('hash literals', (assert) => {
      assertSyntaxError(assert, '{{foo=bar}}', HASH_LITERAL, '{{foo=bar}}', 1, 0);
      assertSyntaxError(assert, '{{foo =bar}}', HASH_LITERAL, '{{foo =bar}}', 1, 0);
      assertSyntaxError(assert, '{{(foo=bar)}}', HASH_LITERAL, '(foo=bar)', 1, 2);
      assertSyntaxError(assert, '{{foo (a=b)}}', HASH_LITERAL, '(a=b)', 1, 6);
      assertSyntaxError(assert, '{{foo x=(a=b)}}', HASH_LITERAL, '(a=b)', 1, 8);
    });

    test('paths rooted in a sub-expression', (assert) => {
      const message =
        'A path cannot start with a sub-expression. Use the `get` helper (`(get (foo) "bar")`) instead';
      assertSyntaxError(assert, '{{(foo).bar}}', message, '(foo).bar', 1, 2);
      assertSyntaxError(assert, '{{foo (bar).baz}}', message, '(bar).baz', 1, 6);
    });

    test('mustaches and comments inside an end tag', (assert) => {
      const mustache = 'Invalid end tag: closing tag must not contain mustaches';
      assertSyntaxError(assert, '<div></div {{x}}>', mustache, '{{x}}', 1, 11);
      assertSyntaxError(assert, '<div></div foo{{x}}>', mustache, '{{x}}', 1, 14);
      assertSyntaxError(assert, '<div></div/{{x}}>', mustache, '{{x}}', 1, 11);
      assertSyntaxError(
        assert,
        '<div></div {{! x}}>',
        'Invalid end tag: closing tag must not contain Handlebars comments',
        '{{! x}}',
        1,
        11
      );

      const tagName = 'Cannot use mustaches in an elements tagname';
      assertSyntaxError(assert, '<div></div{{x}}>', tagName, '{{x}}', 1, 10);
      assertSyntaxError(assert, '<div></{{x}}>', tagName, '{{x}}', 1, 7);
    });

    test('mustaches in markup declarations', (assert) => {
      assertSyntaxError(
        assert,
        '<!-{{x}}-->',
        'Using a Handlebars mustache when in the `markupDeclarationOpen` state is not supported',
        '{{x}}',
        1,
        3
      );
      assertSyntaxError(
        assert,
        '<!DOCTYPE {{x}}>',
        'Using a Handlebars mustache when in the `beforeDoctypeName` state is not supported',
        '{{x}}',
        1,
        10
      );
    });
  }
);
