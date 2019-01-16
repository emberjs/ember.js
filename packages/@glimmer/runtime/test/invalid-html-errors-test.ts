import { RenderTest, test, module, preprocess } from '@glimmer/test-helpers';

class CompileErrorTests extends RenderTest {
  @test
  'A helpful error message is provided for unclosed elements'() {
    this.assert.throws(() => {
      preprocess('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n');
    }, /Unclosed element `div` \(on line 2\)\./);

    this.assert.throws(() => {
      preprocess('\n<div class="my-div">\n<span>\n');
    }, /Unclosed element `span` \(on line 3\)\./);
  }

  @test
  'A helpful error message is provided for unmatched end tags'() {
    this.assert.throws(() => {
      preprocess('</p>');
    }, /Closing tag `p` \(on line 1\) without an open tag\./);

    this.assert.throws(() => {
      preprocess('<em>{{ foo }}</em> \n {{ bar }}\n</div>');
    }, /Closing tag `div` \(on line 3\) without an open tag\./);
  }

  @test
  'A helpful error message is provided for end tags for void elements'() {
    this.assert.throws(() => {
      preprocess('<input></input>');
    }, /Invalid end tag `input` \(on line 1\) \(void elements cannot have end tags\)./);

    this.assert.throws(() => {
      preprocess('<div>\n  <input></input>\n</div>');
    }, /Invalid end tag `input` \(on line 2\) \(void elements cannot have end tags\)./);

    this.assert.throws(() => {
      preprocess('\n\n</br>');
    }, /Invalid end tag `br` \(on line 3\) \(void elements cannot have end tags\)./);
  }

  @test
  'A helpful error message is provided for end tags with attributes'() {
    this.assert.throws(() => {
      preprocess('<div>\nSomething\n\n</div foo="bar">');
    }, /Invalid end tag: closing tag must not have attributes, in `div` \(on line 4\)\./);
  }

  @test
  'A helpful error message is provided for mismatched start/end tags'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\nSomething\n\n</div>');
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'error line numbers include comment lines'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\n{{! some comment}}\n\n</div>');
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'error line numbers include mustache only lines'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\n{{someProp}}\n\n</div>');
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'error line numbers include block lines'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>');
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'error line numbers include whitespace control mustaches'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}');
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'error line numbers include multiple mustache lines'() {
    this.assert.throws(() => {
      preprocess('<div>\n<p>\n{{some-comment}}</div>{{some-comment}}');
    }, /Closing tag `div` \(on line 3\) did not match last open tag `p` \(on line 2\)\./);
  }

  @test
  'Unquoted attribute with expression throws an exception'() {
    this.assert.throws(() => preprocess('<img class=foo{{bar}}>'), expectedError(1));
    this.assert.throws(() => preprocess('<img class={{foo}}{{bar}}>'), expectedError(1));
    this.assert.throws(() => preprocess('<img \nclass={{foo}}bar>'), expectedError(2));
    this.assert.throws(
      () => preprocess('<div \nclass\n=\n{{foo}}&amp;bar ></div>'),
      expectedError(4)
    );

    function expectedError(line: number) {
      return new Error(
        `An unquoted attribute value must be a string or a mustache, ` +
          `preceeded by whitespace or a '=' character, and ` +
          `followed by whitespace, a '>' character, or '/>' (on line ${line})`
      );
    }
  }
}

module('Rendering Error Cases', CompileErrorTests);
