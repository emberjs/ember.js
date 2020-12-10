import { RenderTest, jitSuite, test, preprocess, syntaxErrorFor } from '../..';

class NamedBlocksSyntaxErrors extends RenderTest {
  static suiteName = 'yield keywords syntax errors';

  @test
  'yield throws if receiving any named args besides `to`'() {
    this.assert.throws(() => {
      preprocess('{{yield foo="bar"}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("yield only takes a single named argument: 'to'", 'foo="bar"', 'test-module', 1, 8));
  }

  @test
  'you can only yield to a literal string value'() {
    this.assert.throws(() => {
      preprocess('{{yield to=this.bar}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('you can only yield to a literal string value', 'this.bar', 'test-module', 1, 11));
  }

  @test
  'has-block throws if receiving any named args'() {
    this.assert.throws(() => {
      preprocess('{{has-block foo="bar"}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block) does not take any named arguments', '{{has-block foo="bar"}}', 'test-module', 1, 0));
  }

  @test
  'has-block throws if receiving multiple positional'() {
    this.assert.throws(() => {
      preprocess('{{has-block "foo" "bar"}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block) only takes a single positional argument', '{{has-block "foo" "bar"}}', 'test-module', 1, 0));
  }

  @test
  'has-block throws if receiving a value besides a string'() {
    this.assert.throws(() => {
      preprocess('{{has-block this.bar}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block) can only receive a string literal as its first argument', '{{has-block this.bar}}', 'test-module', 1, 0));
  }

  @test
  'has-block-params throws if receiving any named args'() {
    this.assert.throws(() => {
      preprocess('{{has-block-params foo="bar"}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block-params) does not take any named arguments', '{{has-block-params foo="bar"}}', 'test-module', 1, 0));
  }

  @test
  'has-block-params throws if receiving multiple positional'() {
    this.assert.throws(() => {
      preprocess('{{has-block-params "foo" "bar"}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block-params) only takes a single positional argument', '{{has-block-params "foo" "bar"}}', 'test-module', 1, 0));
  }

  @test
  'has-block-params throws if receiving a value besides a string'() {
    this.assert.throws(() => {
      preprocess('{{has-block-params this.bar}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('(has-block-params) can only receive a string literal as its first argument', '{{has-block-params this.bar}}', 'test-module', 1, 0));
  }
}

jitSuite(NamedBlocksSyntaxErrors);
