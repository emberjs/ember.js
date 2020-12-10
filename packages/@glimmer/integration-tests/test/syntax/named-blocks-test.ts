import { RenderTest, jitSuite, test, preprocess, syntaxErrorFor } from '../..';

class NamedBlocksSyntaxErrors extends RenderTest {
  static suiteName = 'named blocks syntax errors';

  @test
  'Defining block params on a component which has named blocks'() {
    this.assert.throws(() => {
      preprocess('<Foo as |bar|><:foo></:foo></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected block params list on <Foo> component invocation: when passing named blocks, the invocation tag cannot take block params', '<Foo as |bar|><:foo></:foo></Foo>', 'test-module', 1, 0));
  }

  @test
  'Defining named blocks on a plain element is not allowed'() {
    this.assert.throws(() => {
      preprocess('<div><:foo></:foo></div>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected named block <:foo> inside <div> HTML element', '<div><:foo></:foo></div>', 'test-module', 1, 0));
  }

  @test
  'Defining top level named blocks is not allowed'() {
    this.assert.throws(() => {
      preprocess('<:foo></:foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected named block at the top-level of a template', '<:foo></:foo>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('{{#if}}<:foo></:foo>{{/if}}', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected named block nested in a normal block', '<:foo></:foo>', 'test-module', 1, 7));
  }

  @test
  'Passing multiple of the same named block throws an error'() {
    this.assert.throws(() => {
      preprocess('<Foo><:foo></:foo><:foo></:foo></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Component had two named blocks with the same name, `<:foo>`. Only one block with a given name may be passed', '<Foo><:foo></:foo><:foo></:foo></Foo>', 'test-module', 1, 0));
  }

  @test
  'Throws an error if there is content outside of the blocks'() {
    this.assert.throws(() => {
      preprocess('<Foo>Hello!<:foo></:foo></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected content inside <Foo> component invocation: when using named blocks, the tag cannot contain other content', '<Foo>Hello!<:foo></:foo></Foo>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<Foo><:foo></:foo>Hello!</Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Unexpected content inside <Foo> component invocation: when using named blocks, the tag cannot contain other content', '<Foo><:foo></:foo>Hello!</Foo>', 'test-module', 1, 0));
  }

  @test
  'Cannot pass self closing named block'() {
    this.assert.throws(() => {
      preprocess('<Foo><:foo/></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('<:foo/> is not a valid named block: named blocks cannot be self-closing', '<:foo/>', 'test-module', 1, 5));
  }

  @test
  'Named blocks must start with a lower case letter'() {
    this.assert.throws(() => {
      preprocess('<Foo><:Bar></:Bar></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('<:Bar> is not a valid named block, and named blocks must begin with a lowercase letter', '<:Bar></:Bar>', 'test-module', 1, 5));

    this.assert.throws(() => {
      preprocess('<Foo><:1bar><:/1bar></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter', '<:/1bar>', 'test-module', 1, 12));
  }

  @test
  'Named blocks cannot have arguments, attributes, or modifiers'() {
    this.assert.throws(() => {
      preprocess('<Foo><:bar attr="baz"></:bar></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('named block <:bar> cannot have attributes, arguments, or modifiers', '<:bar attr="baz"></:bar>', 'test-module', 1, 5));

    this.assert.throws(() => {
      preprocess('<Foo><:bar @arg="baz"></:bar></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('named block <:bar> cannot have attributes, arguments, or modifiers', '<:bar @arg="baz"></:bar>', 'test-module', 1, 5));

    this.assert.throws(() => {
      preprocess('<Foo><:bar {{modifier}}></:bar></Foo>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('named block <:bar> cannot have attributes, arguments, or modifiers', '<:bar {{modifier}}></:bar>', 'test-module', 1, 5));
  }
}

jitSuite(NamedBlocksSyntaxErrors);
