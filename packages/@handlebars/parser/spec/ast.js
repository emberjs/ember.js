import { parse, parseWithoutProcessing } from '../dist/esm/index.js';
import { equals } from './utils.js';

describe('ast', function () {
  describe('whitespace control', function () {
    describe('parse', function () {
      it('mustache', function () {
        let ast = parse('  {{~comment~}} ');

        equals(ast.body[0].value, '');
        equals(ast.body[2].value, '');
      });

      it('block statements', function () {
        let ast = parse(' {{# comment~}} \nfoo\n {{~/comment}}');

        equals(ast.body[0].value, '');
        equals(ast.body[1].program.body[0].value, 'foo');
      });
    });

    describe('parseWithoutProcessing', function () {
      it('mustache', function () {
        let ast = parseWithoutProcessing('  {{~comment~}} ');

        equals(ast.body[0].value, '  ');
        equals(ast.body[2].value, ' ');
      });

      it('block statements', function () {
        let ast = parseWithoutProcessing(
          ' {{# comment~}} \nfoo\n {{~/comment}}'
        );

        equals(ast.body[0].value, ' ');
        equals(ast.body[1].program.body[0].value, ' \nfoo\n ');
      });
    });
  });

  describe('node details', function () {
    describe('paths', function () {
      it('{{this}}', function () {
        let path = parse('{{this}}').body[0].path;
        equals(path.original, 'this');
        equals(path.head, undefined);
        equals(path.tail.length, 0);
        equals(path.parts.length, 0);
      });

      it('{{this.bar}}', function () {
        let path = parse('{{this.bar}}').body[0].path;
        equals(path.original, 'this.bar');
        equals(path.head, 'bar');
        equals(path.tail.length, 0);
        equals(path.parts.length, 1);
        equals(path.parts[0], 'bar');
      });

      it('{{this.#bar}}', function () {
        let path = parse('{{this.#bar}}').body[0].path;
        equals(path.original, 'this.#bar');
        equals(path.head, '#bar');
        equals(path.tail.length, 0);
        equals(path.parts.length, 1);
        equals(path.parts[0], '#bar');
      });

      it('{{foo.bar}}', function () {
        let path = parse('{{foo.bar}}').body[0].path;
        equals(path.original, 'foo.bar');
        equals(path.head, 'foo');
        equals(path.tail.length, 1);
        equals(path.tail[0], 'bar');
        equals(path.parts.length, 2);
        equals(path.parts[0], 'foo');
        equals(path.parts[1], 'bar');
      });

      it('{{foo.#bar}}', function () {
        let path = parse('{{foo.#bar}}').body[0].path;
        equals(path.original, 'foo.#bar');
        equals(path.head, 'foo');
        equals(path.tail.length, 1);
        equals(path.tail[0], '#bar');
        equals(path.parts.length, 2);
        equals(path.parts[0], 'foo');
        equals(path.parts[1], '#bar');
      });
    });
  });

  describe('standalone flags', function () {
    describe('mustache', function () {
      it('does not mark mustaches as standalone', function () {
        let ast = parse('  {{comment}} ');
        equals(!!ast.body[0].value, true);
        equals(!!ast.body[2].value, true);
      });
    });
    describe('blocks - parseWithoutProcessing', function () {
      it('block mustaches', function () {
        let ast = parseWithoutProcessing(
            ' {{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} '
          ),
          block = ast.body[1];

        equals(ast.body[0].value, ' ');

        equals(block.program.body[0].value, ' \nfoo\n ');
        equals(block.inverse.body[0].value, ' \n  bar \n  ');

        equals(ast.body[2].value, ' ');
      });
      it('initial block mustaches', function () {
        let ast = parseWithoutProcessing('{{# comment}} \nfoo\n {{/comment}}'),
          block = ast.body[0];

        equals(block.program.body[0].value, ' \nfoo\n ');
      });
      it('mustaches with children', function () {
        let ast = parseWithoutProcessing(
            '{{# comment}} \n{{foo}}\n {{/comment}}'
          ),
          block = ast.body[0];

        equals(block.program.body[0].value, ' \n');
        equals(block.program.body[1].path.original, 'foo');
        equals(block.program.body[2].value, '\n ');
      });
      it('nested block mustaches', function () {
        let ast = parseWithoutProcessing(
            '{{#foo}} \n{{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} \n{{/foo}}'
          ),
          body = ast.body[0].program.body,
          block = body[1];

        equals(body[0].value, ' \n');

        equals(block.program.body[0].value, ' \nfoo\n ');
        equals(block.inverse.body[0].value, ' \n  bar \n  ');
      });
      it('column 0 block mustaches', function () {
        let ast = parseWithoutProcessing(
            'test\n{{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} '
          ),
          block = ast.body[1];

        equals(ast.body[0].omit, undefined);

        equals(block.program.body[0].value, ' \nfoo\n ');
        equals(block.inverse.body[0].value, ' \n  bar \n  ');

        equals(ast.body[2].value, ' ');
      });
    });
    describe('blocks', function () {
      it('marks block mustaches as standalone', function () {
        let ast = parse(
            ' {{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} '
          ),
          block = ast.body[1];

        equals(ast.body[0].value, '');

        equals(block.program.body[0].value, 'foo\n');
        equals(block.inverse.body[0].value, '  bar \n');

        equals(ast.body[2].value, '');
      });
      it('marks initial block mustaches as standalone', function () {
        let ast = parse('{{# comment}} \nfoo\n {{/comment}}'),
          block = ast.body[0];

        equals(block.program.body[0].value, 'foo\n');
      });
      it('marks mustaches with children as standalone', function () {
        let ast = parse('{{# comment}} \n{{foo}}\n {{/comment}}'),
          block = ast.body[0];

        equals(block.program.body[0].value, '');
        equals(block.program.body[1].path.original, 'foo');
        equals(block.program.body[2].value, '\n');
      });
      it('marks nested block mustaches as standalone', function () {
        let ast = parse(
            '{{#foo}} \n{{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} \n{{/foo}}'
          ),
          body = ast.body[0].program.body,
          block = body[1];

        equals(body[0].value, '');

        equals(block.program.body[0].value, 'foo\n');
        equals(block.inverse.body[0].value, '  bar \n');

        equals(body[0].value, '');
      });
      it('does not mark nested block mustaches as standalone', function () {
        let ast = parse(
            '{{#foo}} {{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} {{/foo}}'
          ),
          body = ast.body[0].program.body,
          block = body[1];

        equals(body[0].omit, undefined);

        equals(block.program.body[0].value, ' \nfoo\n');
        equals(block.inverse.body[0].value, '  bar \n  ');

        equals(body[0].omit, undefined);
      });
      it('does not mark nested initial block mustaches as standalone', function () {
        let ast = parse(
            '{{#foo}}{{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}}{{/foo}}'
          ),
          body = ast.body[0].program.body,
          block = body[0];

        equals(block.program.body[0].value, ' \nfoo\n');
        equals(block.inverse.body[0].value, '  bar \n  ');

        equals(body[0].omit, undefined);
      });

      it('marks column 0 block mustaches as standalone', function () {
        let ast = parse(
            'test\n{{# comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} '
          ),
          block = ast.body[1];

        equals(ast.body[0].omit, undefined);

        equals(block.program.body[0].value, 'foo\n');
        equals(block.inverse.body[0].value, '  bar \n');

        equals(ast.body[2].value, '');
      });
    });
    describe('partials - parseWithoutProcessing', function () {
      it('simple partial', function () {
        let ast = parseWithoutProcessing('{{> partial }} ');
        equals(ast.body[1].value, ' ');
      });
      it('indented partial', function () {
        let ast = parseWithoutProcessing('  {{> partial }} ');
        equals(ast.body[0].value, '  ');
        equals(ast.body[1].indent, '');
        equals(ast.body[2].value, ' ');
      });
    });
    describe('partials', function () {
      it('marks partial as standalone', function () {
        let ast = parse('{{> partial }} ');
        equals(ast.body[1].value, '');
      });
      it('marks indented partial as standalone', function () {
        let ast = parse('  {{> partial }} ');
        equals(ast.body[0].value, '');
        equals(ast.body[1].indent, '  ');
        equals(ast.body[2].value, '');
      });
      it('marks those around content as not standalone', function () {
        let ast = parse('a{{> partial }}');
        equals(ast.body[0].omit, undefined);

        ast = parse('{{> partial }}a');
        equals(ast.body[1].omit, undefined);
      });
    });
    describe('comments - parseWithoutProcessing', function () {
      it('simple comment', function () {
        let ast = parseWithoutProcessing('{{! comment }} ');
        equals(ast.body[1].value, ' ');
      });
      it('indented comment', function () {
        let ast = parseWithoutProcessing('  {{! comment }} ');
        equals(ast.body[0].value, '  ');
        equals(ast.body[2].value, ' ');
      });
    });
    describe('comments', function () {
      it('marks comment as standalone', function () {
        let ast = parse('{{! comment }} ');
        equals(ast.body[1].value, '');
      });
      it('marks indented comment as standalone', function () {
        let ast = parse('  {{! comment }} ');
        equals(ast.body[0].value, '');
        equals(ast.body[2].value, '');
      });
      it('marks those around content as not standalone', function () {
        let ast = parse('a{{! comment }}');
        equals(ast.body[0].omit, undefined);

        ast = parse('{{! comment }}a');
        equals(ast.body[1].omit, undefined);
      });
    });
  });
});
