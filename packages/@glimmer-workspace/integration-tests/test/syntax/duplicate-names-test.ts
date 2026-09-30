import {
  jitSuite,
  preprocess,
  RenderTest,
  syntaxErrorFor,
  test,
} from '@glimmer-workspace/integration-tests';

const ATTRIBUTE = (name: string) =>
  `Duplicate attribute \`${name}\`. An element can only have one attribute with a given name`;
const ARGUMENT = (name: string) =>
  `Duplicate named argument \`${name}\`. A named argument can only be passed once`;

class DuplicateNamesTest extends RenderTest {
  static suiteName = 'duplicate attributes and named arguments';

  assertError(template: string, message: string, code: string, column: number) {
    this.assert.throws(
      () => preprocess(template, { meta: { moduleName: 'test-module' } }),
      syntaxErrorFor(message, code, 'test-module', 1, column),
      template
    );
  }

  @test
  'a duplicate attribute is a syntax error'() {
    this.assertError('<div title="a" title="b"></div>', ATTRIBUTE('title'), 'title="b"', 15);
    this.assertError(
      '<div class="a" class={{this.b}}></div>',
      ATTRIBUTE('class'),
      'class={{this.b}}',
      15
    );
    this.assertError(
      '<input type="text" type="checkbox">',
      ATTRIBUTE('type'),
      'type="checkbox"',
      19
    );
    this.assertError('<Foo class="a" class="b" />', ATTRIBUTE('class'), 'class="b"', 15);
  }

  @test
  'a duplicate component argument is a syntax error'() {
    this.assertError('<Foo @a={{1}} @a={{2}} />', ARGUMENT('@a'), '@a={{2}}', 14);
  }

  @test
  'a duplicate named argument in a mustache, block, sub-expression or modifier is a syntax error'() {
    this.assertError('{{foo a=1 a=2}}', ARGUMENT('a'), 'a=2', 10);
    this.assertError('{{#foo a=1 a=2}}{{/foo}}', ARGUMENT('a'), 'a=2', 11);
    this.assertError('{{foo (bar a=1 a=2)}}', ARGUMENT('a'), 'a=2', 15);
    this.assertError('<div {{foo a=1 a=2}}></div>', ARGUMENT('a'), 'a=2', 15);
  }

  @test
  'names that differ are not duplicates'() {
    this.registerHelper('h', (_positional, named) => Object.keys(named).join(','));
    this.render('<div title="a" data-title="b" class="c">{{h a=1 b=2}}</div>');
    this.assertHTML('<div title="a" data-title="b" class="c">a,b</div>');
    this.assertStableRerender();
  }
}

jitSuite(DuplicateNamesTest);
