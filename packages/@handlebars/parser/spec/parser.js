import { parse, print } from '../dist/esm/index.js';
import { equals, equalsAst, shouldThrow } from './utils.js';

describe('parser', function () {
  function astFor(template) {
    let ast = parse(template);
    return print(ast);
  }

  it('parses simple mustaches', function () {
    equalsAst('{{123}}', '{{ n%123 }}');
    equalsAst('{{"foo"}}', '{{ "foo" }}');
    equalsAst('{{false}}', '{{ b%false }}');
    equalsAst('{{true}}', '{{ b%true }}');
    equalsAst('{{foo}}', '{{ p%foo }}');
    equalsAst('{{foo?}}', '{{ p%foo? }}');
    equalsAst('{{foo_}}', '{{ p%foo_ }}');
    equalsAst('{{foo-}}', '{{ p%foo- }}');
    equalsAst('{{foo:}}', '{{ p%foo: }}');
  });

  it('parses simple mustaches with data', function () {
    equalsAst('{{@foo}}', '{{ p%@foo }}');
  });

  it('parses simple mustaches with data paths', function () {
    equalsAst('{{@../foo}}', '{{ p%@foo }}');
  });

  it('parses mustaches with paths', function () {
    equalsAst('{{foo/bar}}', '{{ p%foo/bar }}');
    equalsAst('{{foo.bar}}', '{{ p%foo/bar }}');
    equalsAst('{{foo.#bar}}', '{{ p%foo/#bar }}');
    equalsAst('{{@foo.#bar}}', '{{ p%@foo/#bar }}');

    equalsAst('{{this/foo}}', '{{ p%foo }}');
    equalsAst('{{this.foo}}', '{{ p%this.foo }}');
    equalsAst('{{this.#foo}}', '{{ p%this.#foo }}');
  });

  it('parses mustaches with - in a path', function () {
    equalsAst('{{foo-bar}}', '{{ p%foo-bar }}');
  });

  it('parses mustaches with escaped [] in a path', function () {
    equalsAst('{{[foo[\\]]}}', '{{ p%foo[] }}');
  });

  it('parses escaped \\\\ in path', function () {
    equalsAst('{{[foo\\\\]}}', '{{ p%foo\\ }}');
  });

  it('parses hash literals', function () {
    equalsAst('{{(foo=bar)}}', '{{ Hash{foo=p%bar} }}');
    equalsAst('{{(foo=bar)}}', '{{ p%@hello }}', {
      options: {
        syntax: {
          hash: (hash, loc, { yy }) => {
            return yy.preparePath(
              true,
              false,
              [{ part: yy.id('hello'), original: 'hello' }],
              loc
            );
          },
        },
      },
    });
  });

  it('parses array literals', function () {
    equalsAst('{{[foo bar]}}', '{{ Array[p%foo, p%bar] }}', {
      options: { syntax: { square: 'node' } },
    });

    equalsAst('{{[foo bar].baz}}', '{{ p%[Array[p%foo, p%bar]]/baz }}', {
      options: { syntax: { square: 'node' } },
    });
  });

  it('parses mustaches that are hash literals', function () {
    equalsAst('{{foo=bar}}', '{{ Hash{foo=p%bar} }}');
    equalsAst('{{foo=bar}}', `{{ "HASH{foo=p%bar}" }}`, {
      options: {
        syntax: {
          hash: (hash, loc) => {
            return {
              type: 'StringLiteral',
              original: print(hash),
              value: print(hash),
              loc,
            };
          },
        },
      },
    });
  });

  it('parses mustaches with parameters', function () {
    equalsAst('{{foo bar}}', '{{ p%foo [p%bar] }}');
    equalsAst('{{this.foo bar}}', '{{ p%this.foo [p%bar] }}');
    equalsAst('{{this.foo this.bar}}', '{{ p%this.foo [p%this.bar] }}');
    equalsAst('{{this.#foo this.#bar}}', '{{ p%this.#foo [p%this.#bar] }}');
    equalsAst('{{foo.#bar foo.#baz}}', '{{ p%foo/#bar [p%foo/#baz] }}');
    equalsAst('{{@foo.#bar @foo.#baz}}', '{{ p%@foo/#bar [p%@foo/#baz] }}');
  });

  it('parses mustaches with string parameters', function () {
    equalsAst('{{foo bar "baz" }}', '{{ p%foo [p%bar, "baz"] }}');
    equalsAst('{{this.foo bar "baz" }}', '{{ p%this.foo [p%bar, "baz"] }}');
    equalsAst('{{this.#foo bar "baz" }}', '{{ p%this.#foo [p%bar, "baz"] }}');
    equalsAst('{{@item.#foo bar "baz" }}', '{{ p%@item/#foo [p%bar, "baz"] }}');
  });

  it('parses mustaches with NUMBER parameters', function () {
    equalsAst('{{foo 1}}', '{{ p%foo [n%1] }}');
    equalsAst('{{this.foo 1}}', '{{ p%this.foo [n%1] }}');
    equalsAst('{{this.#foo 1}}', '{{ p%this.#foo [n%1] }}');
  });

  it('parses mustaches with BOOLEAN parameters', function () {
    equalsAst('{{foo true}}', '{{ p%foo [b%true] }}');
    equalsAst('{{foo false}}', '{{ p%foo [b%false] }}');
  });

  it('parses mustaches with undefined and null paths', function () {
    equalsAst('{{undefined}}', '{{ UNDEFINED }}');
    equalsAst('{{null}}', '{{ NULL }}');
  });

  it('parses mustaches with undefined and null parameters', function () {
    equalsAst('{{foo undefined null}}', '{{ p%foo [UNDEFINED, NULL] }}');
  });

  it('parses mustaches with DATA parameters', function () {
    equalsAst('{{foo @bar}}', '{{ p%foo [p%@bar] }}');
  });

  it('parses mustaches with hash arguments', function () {
    equalsAst('{{foo bar=baz}}', '{{ p%foo HASH{bar=p%baz} }}');
    equalsAst('{{foo bar=1}}', '{{ p%foo HASH{bar=n%1} }}');
    equalsAst('{{foo bar=true}}', '{{ p%foo HASH{bar=b%true} }}');
    equalsAst('{{foo bar=false}}', '{{ p%foo HASH{bar=b%false} }}');
    equalsAst('{{foo bar=@baz}}', '{{ p%foo HASH{bar=p%@baz} }}');

    equalsAst(
      '{{foo bar=baz bat=bam}}',
      '{{ p%foo HASH{bar=p%baz bat=p%bam} }}'
    );
    equalsAst(
      '{{foo bar=baz bat="bam"}}',
      '{{ p%foo HASH{bar=p%baz bat="bam"} }}'
    );

    equalsAst("{{foo bat='bam'}}", '{{ p%foo HASH{bat="bam"} }}');

    equalsAst(
      '{{foo omg bar=baz bat="bam"}}',
      '{{ p%foo [p%omg] HASH{bar=p%baz bat="bam"} }}'
    );
    equalsAst(
      '{{foo omg bar=baz bat="bam" baz=1}}',
      '{{ p%foo [p%omg] HASH{bar=p%baz bat="bam" baz=n%1} }}'
    );
    equalsAst(
      '{{foo omg bar=baz bat="bam" baz=true}}',
      '{{ p%foo [p%omg] HASH{bar=p%baz bat="bam" baz=b%true} }}'
    );
    equalsAst(
      '{{foo omg bar=baz bat="bam" baz=false}}',
      '{{ p%foo [p%omg] HASH{bar=p%baz bat="bam" baz=b%false} }}'
    );
  });

  it('parses contents followed by a mustache', function () {
    equalsAst('foo bar {{baz}}', "CONTENT[ 'foo bar ' ]\n{{ p%baz }}");
  });

  it('parses a partial', function () {
    equalsAst('{{> foo }}', '{{> PARTIAL:foo }}');
    equalsAst('{{> "foo" }}', '{{> PARTIAL:foo }}');
    equalsAst('{{> 1 }}', '{{> PARTIAL:1 }}');
  });

  it('parses a partial with context', function () {
    equalsAst('{{> foo bar}}', '{{> PARTIAL:foo p%bar }}');
  });

  it('parses a partial with hash', function () {
    equalsAst('{{> foo bar=bat}}', '{{> PARTIAL:foo HASH{bar=p%bat} }}');
  });

  it('parses a partial with context and hash', function () {
    equalsAst(
      '{{> foo bar bat=baz}}',
      '{{> PARTIAL:foo p%bar HASH{bat=p%baz} }}'
    );
  });

  it('parses a partial with a complex name', function () {
    equalsAst(
      '{{> shared/partial?.bar}}',
      '{{> PARTIAL:shared/partial?.bar }}'
    );
  });

  it('parsers partial blocks', function () {
    equalsAst(
      '{{#> foo}}bar{{/foo}}',
      "{{> PARTIAL BLOCK:foo PROGRAM:\n  CONTENT[ 'bar' ]\n }}"
    );
  });
  it('should handle parser block mismatch', function () {
    shouldThrow(
      function () {
        astFor('{{#> goodbyes}}{{/hellos}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );
  });
  it('parsers partial blocks with arguments', function () {
    equalsAst(
      '{{#> foo context hash=value}}bar{{/foo}}',
      "{{> PARTIAL BLOCK:foo p%context HASH{hash=p%value} PROGRAM:\n  CONTENT[ 'bar' ]\n }}"
    );
  });

  it('parses a comment', function () {
    equalsAst('{{! this is a comment }}', "{{! ' this is a comment ' }}");
  });

  it('parses a multi-line comment', function () {
    equalsAst(
      '{{!\nthis is a multi-line comment\n}}',
      "{{! '\nthis is a multi-line comment\n' }}"
    );
  });

  it('parses an inverse section', function () {
    equalsAst(
      '{{#foo}} bar {{^}} baz {{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}\n    CONTENT[ ' baz ' ]"
    );
  });

  it('parses an inverse (else-style) section', function () {
    equalsAst(
      '{{#foo}} bar {{else}} baz {{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}\n    CONTENT[ ' baz ' ]"
    );
  });

  it('parses multiple inverse sections', function () {
    equalsAst(
      '{{#foo}} bar {{else if bar}}{{else}} baz {{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}\n    BLOCK:\n      p%if [p%bar]\n      PROGRAM:\n      {{^}}\n        CONTENT[ ' baz ' ]"
    );
  });

  it('parses empty blocks', function () {
    equalsAst('{{#foo}}{{/foo}}', 'BLOCK:\n  p%foo\n  PROGRAM:');
  });

  it('parses empty blocks with empty inverse section', function () {
    equalsAst('{{#foo}}{{^}}{{/foo}}', 'BLOCK:\n  p%foo\n  PROGRAM:\n  {{^}}');
  });

  it('parses empty blocks with empty inverse (else-style) section', function () {
    equalsAst(
      '{{#foo}}{{else}}{{/foo}}',
      'BLOCK:\n  p%foo\n  PROGRAM:\n  {{^}}'
    );
  });

  it('parses non-empty blocks with empty inverse section', function () {
    equalsAst(
      '{{#foo}} bar {{^}}{{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}"
    );
  });

  it('parses non-empty blocks with empty inverse (else-style) section', function () {
    equalsAst(
      '{{#foo}} bar {{else}}{{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}"
    );
  });

  it('parses empty blocks with non-empty inverse section', function () {
    equalsAst(
      '{{#foo}}{{^}} bar {{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n  {{^}}\n    CONTENT[ ' bar ' ]"
    );
  });

  it('parses empty blocks with non-empty inverse (else-style) section', function () {
    equalsAst(
      '{{#foo}}{{else}} bar {{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n  {{^}}\n    CONTENT[ ' bar ' ]"
    );
  });

  it('parses a standalone inverse section', function () {
    equalsAst(
      '{{^foo}}bar{{/foo}}',
      "BLOCK:\n  p%foo\n  {{^}}\n    CONTENT[ 'bar' ]"
    );
  });

  it('throws on old inverse section', function () {
    shouldThrow(function () {
      astFor('{{else foo}}bar{{/foo}}');
    }, Error);
  });

  it('parses block with block params', function () {
    equalsAst(
      '{{#foo as |bar baz|}}content{{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n    BLOCK PARAMS: [ bar baz ]\n    CONTENT[ 'content' ]"
    );
  });

  it('parses mustaches with sub-expressions as the callable', function () {
    equalsAst('{{(my-helper foo)}}', '{{ (p%my-helper [p%foo]) }}');
  });

  it('parses mustaches with sub-expressions as the callable (with args)', function () {
    equalsAst('{{(my-helper foo) bar}}', '{{ (p%my-helper [p%foo]) [p%bar] }}');
  });

  it('parses sub-expressions with a sub-expression as the callable', function () {
    equalsAst('{{((my-helper foo))}}', '{{ ((p%my-helper [p%foo])) }}');
  });

  it('parses sub-expressions with a sub-expression as the callable (with args)', function () {
    equalsAst(
      '{{((my-helper foo) bar)}}',
      '{{ ((p%my-helper [p%foo]) [p%bar]) }}'
    );
  });

  it('parses arguments with a sub-expression as the callable (with args)', function () {
    equalsAst(
      '{{my-helper ((foo) bar) baz=((foo bar))}}',
      '{{ p%my-helper [((p%foo) [p%bar])] HASH{baz=((p%foo [p%bar]))} }}'
    );
  });

  it('parses paths with sub-expressions as the root', function () {
    equalsAst('{{(my-helper foo).bar}}', '{{ p%[(p%my-helper [p%foo])]/bar }}');
  });

  it('parses paths with sub-expressions as the root as a callable', function () {
    equalsAst(
      '{{((my-helper foo).bar baz)}}',
      '{{ (p%[(p%my-helper [p%foo])]/bar [p%baz]) }}'
    );
  });

  it('parses paths with sub-expressions as the root as an argument', function () {
    equalsAst(
      '{{(foo (my-helper bar).baz)}}',
      '{{ (p%foo [p%[(p%my-helper [p%bar])]/baz]) }}'
    );
  });

  it('parses paths with sub-expressions as the root as a named argument', function () {
    equalsAst(
      '{{(foo bar=(my-helper baz).qux)}}',
      '{{ (p%foo HASH{bar=p%[(p%my-helper [p%baz])]/qux}) }}'
    );
  });

  it('parses inverse block with block params', function () {
    equalsAst(
      '{{^foo as |bar baz|}}content{{/foo}}',
      "BLOCK:\n  p%foo\n  {{^}}\n    BLOCK PARAMS: [ bar baz ]\n    CONTENT[ 'content' ]"
    );
  });
  it('parses chained inverse block with block params', function () {
    equalsAst(
      '{{#foo}}{{else foo as |bar baz|}}content{{/foo}}',
      "BLOCK:\n  p%foo\n  PROGRAM:\n  {{^}}\n    BLOCK:\n      p%foo\n      PROGRAM:\n        BLOCK PARAMS: [ bar baz ]\n        CONTENT[ 'content' ]"
    );
  });
  it("raises if there's a Parse error", function () {
    shouldThrow(
      function () {
        astFor('foo{{^}}bar');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function () {
        astFor('{{foo}');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function () {
        astFor('{{foo &}}');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function () {
        astFor('{{#goodbyes}}{{/hellos}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );

    shouldThrow(
      function () {
        astFor('{{{{goodbyes}}}} {{{{/hellos}}}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );
  });

  it('should handle invalid paths', function () {
    shouldThrow(
      function () {
        astFor('{{foo/../bar}}');
      },
      Error,
      /Invalid path: foo\/\.\. - 1:2/
    );
    shouldThrow(
      function () {
        astFor('{{foo/./bar}}');
      },
      Error,
      /Invalid path: foo\/\. - 1:2/
    );
    shouldThrow(
      function () {
        astFor('{{foo/this/bar}}');
      },
      Error,
      /Invalid path: foo\/this - 1:2/
    );
  });

  it('knows how to report the correct line number in errors', function () {
    shouldThrow(
      function () {
        astFor('hello\nmy\n{{foo}');
      },
      Error,
      /Parse error on line 3/
    );
    shouldThrow(
      function () {
        astFor('hello\n\nmy\n\n{{foo}');
      },
      Error,
      /Parse error on line 5/
    );
  });

  it('knows how to report the correct line number in errors when the first character is a newline', function () {
    shouldThrow(
      function () {
        astFor('\n\nhello\n\nmy\n\n{{foo}');
      },
      Error,
      /Parse error on line 7/
    );
  });

  describe('externally compiled AST', function () {
    it('can pass through an already-compiled AST', function () {
      equals(
        astFor({
          type: 'Program',
          body: [{ type: 'ContentStatement', value: 'Hello' }],
        }),
        "CONTENT[ 'Hello' ]\n"
      );
    });
  });

  describe('directives', function () {
    it('should parse block directives', function () {
      equalsAst('{{#* foo}}{{/foo}}', 'DIRECTIVE BLOCK:\n  p%foo\n  PROGRAM:');
    });
    it('should parse directives', function () {
      equalsAst('{{* foo}}', '{{ DIRECTIVE p%foo }}');
    });
    it('should fail if directives have inverse', function () {
      shouldThrow(
        function () {
          astFor('{{#* foo}}{{^}}{{/foo}}');
        },
        Error,
        /Unexpected inverse/
      );
    });
  });

  it('GH1024 - should track program location properly', function () {
    let p = parse(
      '\n' +
        '  {{#if foo}}\n' +
        '    {{bar}}\n' +
        '       {{else}}    {{baz}}\n' +
        '\n' +
        '     {{/if}}\n' +
        '    '
    );

    // We really need a deep equals but for now this should be stable...
    equals(
      JSON.stringify(p.loc),
      JSON.stringify({
        start: { line: 1, column: 0 },
        end: { line: 7, column: 4 },
      })
    );
    equals(
      JSON.stringify(p.body[1].program.loc),
      JSON.stringify({
        start: { line: 2, column: 13 },
        end: { line: 4, column: 7 },
      })
    );
    equals(
      JSON.stringify(p.body[1].inverse.loc),
      JSON.stringify({
        start: { line: 4, column: 15 },
        end: { line: 6, column: 5 },
      })
    );
  });
});
