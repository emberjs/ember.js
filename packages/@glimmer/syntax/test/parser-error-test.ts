import { preprocess as parse } from '@glimmer/syntax';

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
