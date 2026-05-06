import {
  jitSuite,
  parseErrorFor,
  preprocess,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class CompileErrorTests extends RenderTest {
  static suiteName = 'compile errors';

  @test
  'A helpful error message is provided for unclosed elements'() {
    this.assert.throws(
      () => {
        preprocess('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Unclosed element `div`',
        '\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n',
        'test-module',
        2,
        0,
        20
      )
    );

    this.assert.throws(
      () => {
        preprocess('\n<div class="my-div">\n<span>\n', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Unclosed element `span`',
        '\n<div class="my-div">\n<span>\n',
        'test-module',
        3,
        0,
        6
      )
    );
  }

  @test
  'A helpful error message is provided for unmatched end tags'() {
    this.assert.throws(
      () => {
        preprocess('</p>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor('Closing tag </p> without an open tag', '</p>', 'test-module', 1, 0, 4)
    );

    this.assert.throws(
      () => {
        preprocess('<em>{{ foo }}</em> \n {{ bar }}\n</div>', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Closing tag </div> without an open tag',
        '<em>{{ foo }}</em> \n {{ bar }}\n</div>',
        'test-module',
        3,
        0,
        6
      )
    );
  }

  @test
  'A helpful error message is provided for end tags for void elements'() {
    this.assert.throws(
      () => {
        preprocess('<input></input>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        '<input> elements do not need end tags. You should remove it',
        '<input></input>',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<div>\n  <input></input>\n</div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        '<input> elements do not need end tags. You should remove it',
        '<div>\n  <input></input>\n</div>',
        'test-module',
        2,
        9,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('\n\n</br>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        '<br> elements do not need end tags. You should remove it',
        '\n\n</br>',
        'test-module',
        3,
        0,
        5
      )
    );
  }

  @test
  'A helpful error message is provided for end tags with attributes'() {
    this.assert.throws(
      () => {
        preprocess('<div>\nSomething\n\n</div foo="bar">', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid end tag: closing tag must not have attributes',
        '<div>\nSomething\n\n</div foo="bar">',
        'test-module',
        4,
        0,
        15
      )
    );
  }

  @test
  'A helpful error message is provided for mismatched start/end tags'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\nSomething\n\n</div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\nSomething\n\n</div>',
        'test-module',
        5,
        0,
        6
      )
    );
  }

  @test
  'error line numbers include comment lines'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\n{{! some comment}}\n\n</div>', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\n{{! some comment}}\n\n</div>',
        'test-module',
        5,
        0,
        6
      )
    );
  }

  @test
  'error line numbers include mustache only lines'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\n{{someProp}}\n\n</div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\n{{someProp}}\n\n</div>',
        'test-module',
        5,
        0,
        6
      )
    );
  }

  @test
  'error line numbers include block lines'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>',
        'test-module',
        5,
        0,
        6
      )
    );
  }

  @test
  'error line numbers include whitespace control mustaches'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}',
        'test-module',
        5,
        0,
        6
      )
    );
  }

  @test
  'error line numbers include multiple mustache lines'() {
    this.assert.throws(
      () => {
        preprocess('<div>\n<p>\n{{some-comment}}</div>{{some-comment}}', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Closing tag </div> did not match last open tag <p> (on line 2)',
        '<div>\n<p>\n{{some-comment}}</div>{{some-comment}}',
        'test-module',
        3,
        16,
        1
      )
    );
  }

  @test
  'Unquoted attribute with expression throws an exception'() {
    this.assert.throws(
      () => preprocess('<img class=foo{{bar}}>', { meta: { moduleName: 'test-module' } }),
      expectedError('<img class=foo{{bar}}>', 1, 5, 1)
    );
    this.assert.throws(
      () => preprocess('<img class={{foo}}{{bar}}>', { meta: { moduleName: 'test-module' } }),
      expectedError('<img class={{foo}}{{bar}}>', 1, 5, 1)
    );
    this.assert.throws(
      () => preprocess('<img \nclass={{foo}}bar>', { meta: { moduleName: 'test-module' } }),
      expectedError('<img \nclass={{foo}}bar>', 2, 0, 16)
    );
    this.assert.throws(
      () =>
        preprocess('<div \nclass\n=\n{{foo}}&amp;bar ></div>', {
          meta: { moduleName: 'test-module' },
        }),
      expectedError('<div \nclass\n=\n{{foo}}&amp;bar ></div>', 2, 0, 5)
    );

    function expectedError(source: string, line: number, column: number, spanLength: number) {
      return parseErrorFor(
        `An unquoted attribute value must be a string or a mustache, preceded by whitespace or a '=' character, and followed by whitespace, a '>' character, or '/>'`,
        source,
        'test-module',
        line,
        column,
        spanLength
      );
    }
  }
}

jitSuite(CompileErrorTests);
