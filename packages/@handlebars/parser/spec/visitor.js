import { Visitor, parse, print, Exception } from '../dist/esm/index.js';
import { equals, shouldThrow } from './utils.js';

describe('Visitor', function () {
  it('should provide coverage', function () {
    // Simply run the thing and make sure it does not fail and that all of the
    // stub methods are executed
    let visitor = new Visitor();
    visitor.accept(
      parse(
        '{{foo}}{{#foo (bar 1 "1" true undefined null) foo=@data}}{{!comment}}{{> bar }} {{/foo}}'
      )
    );
    visitor.accept(parse('{{#> bar }} {{/bar}}'));
    visitor.accept(parse('{{#* bar }} {{/bar}}'));
    visitor.accept(parse('{{* bar }}'));
  });

  it('should traverse to stubs', function () {
    let visitor = new Visitor();

    visitor.StringLiteral = function (string) {
      equals(string.value, '2');
    };
    visitor.NumberLiteral = function (number) {
      equals(number.value, 1);
    };
    visitor.BooleanLiteral = function (bool) {
      equals(bool.value, true);

      equals(this.parents.length, 3);
      equals(this.parents[0].type, 'SubExpression');
      equals(this.parents[1].type, 'BlockStatement');
      equals(this.parents[2].type, 'Program');
    };
    visitor.PathExpression = function (id) {
      equals(/(foo\.)?bar$/.test(id.original), true);
    };
    visitor.ContentStatement = function (content) {
      equals(content.value, ' ');
    };
    visitor.CommentStatement = function (comment) {
      equals(comment.value, 'comment');
    };

    visitor.accept(
      parse(
        '{{#foo.bar (foo.bar 1 "2" true) foo=@foo.bar}}{{!comment}}{{> bar }} {{/foo.bar}}'
      )
    );
  });

  describe('mutating', function () {
    describe('fields', function () {
      it('should replace value', function () {
        let visitor = new Visitor();

        visitor.mutating = true;
        visitor.StringLiteral = function (string) {
          return { type: 'NumberLiteral', value: 42, loc: string.loc };
        };

        let ast = parse('{{foo foo="foo"}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo HASH{foo=n%42} }}\n');
      });
      it('should treat undefined resonse as identity', function () {
        let visitor = new Visitor();
        visitor.mutating = true;

        let ast = parse('{{foo foo=42}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo HASH{foo=n%42} }}\n');
      });
      it('should remove false responses', function () {
        let visitor = new Visitor();

        visitor.mutating = true;
        visitor.Hash = function () {
          return false;
        };

        let ast = parse('{{foo foo=42}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo }}\n');
      });
      it('should throw when removing required values', function () {
        shouldThrow(
          function () {
            let visitor = new Visitor();

            visitor.mutating = true;
            visitor.PathExpression = function () {
              return false;
            };

            let ast = parse('{{foo 42}}');
            visitor.accept(ast);
          },
          Exception,
          'MustacheStatement requires path'
        );
      });
      it('should throw when returning non-node responses', function () {
        shouldThrow(
          function () {
            let visitor = new Visitor();

            visitor.mutating = true;
            visitor.PathExpression = function () {
              return {};
            };

            let ast = parse('{{foo 42}}');
            visitor.accept(ast);
          },
          Exception,
          'Unexpected node type "undefined" found when accepting path on MustacheStatement'
        );
      });
    });
    describe('arrays', function () {
      it('should replace value', function () {
        let visitor = new Visitor();

        visitor.mutating = true;
        visitor.StringLiteral = function (string) {
          return { type: 'NumberLiteral', value: 42, loc: string.locInfo };
        };

        let ast = parse('{{foo "foo"}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo [n%42] }}\n');
      });
      it('should treat undefined resonse as identity', function () {
        let visitor = new Visitor();
        visitor.mutating = true;

        let ast = parse('{{foo 42}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo [n%42] }}\n');
      });
      it('should remove false responses', function () {
        let visitor = new Visitor();

        visitor.mutating = true;
        visitor.NumberLiteral = function () {
          return false;
        };

        let ast = parse('{{foo 42}}');
        visitor.accept(ast);
        equals(print(ast), '{{ p%foo }}\n');
      });
    });
  });
});
