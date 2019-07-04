import { Option } from '@glimmer/interfaces';
import * as AST from '../types/nodes';
import { voidMap } from '../parser/tokenizer-event-handlers';
import { escapeText, escapeAttrValue } from './util';

function unreachable(): never {
  throw new Error('unreachable');
}

interface PrinterOptions {
  entityEncoding: 'transformed' | 'raw';
}

export default function build(
  ast: AST.Node,
  options: PrinterOptions = { entityEncoding: 'transformed' }
): string {
  if (!ast) {
    return '';
  }

  function buildEach(asts: AST.Node[]): string[] {
    return asts.map(node => build(node, options));
  }

  function pathParams(ast: AST.Node): string {
    let path: string;

    switch (ast.type) {
      case 'MustacheStatement':
      case 'SubExpression':
      case 'ElementModifierStatement':
      case 'BlockStatement':
        path = build(ast.path, options);
        break;
      case 'PartialStatement':
        path = build(ast.name, options);
        break;
      default:
        return unreachable();
    }

    return compactJoin([path, buildEach(ast.params).join(' '), build(ast.hash, options)], ' ');
  }

  function compactJoin(array: Option<string>[], delimiter?: string): string {
    return compact(array).join(delimiter || '');
  }

  function blockParams(block: AST.BlockStatement): Option<string> {
    const params = block.program.blockParams;
    if (params.length) {
      return ` as |${params.join(' ')}|`;
    }

    return null;
  }

  function openBlock(block: AST.BlockStatement): string {
    return compactJoin([
      '{{',
      block.openStrip.open ? '~' : null,
      '#',
      pathParams(block),
      blockParams(block),
      block.openStrip.close ? '~' : null,
      '}}',
    ]);
  }

  function closeBlock(block: AST.BlockStatement): string {
    return compactJoin([
      '{{',
      block.closeStrip.open ? '~' : null,
      '/',
      build(block.path, options),
      block.closeStrip.close ? '~' : null,
      '}}',
    ]);
  }

  const output: string[] = [];

  switch (ast.type) {
    case 'Program':
    case 'Block':
    case 'Template':
      {
        const chainBlock = ast.chained && ast.body[0];
        if (chainBlock) {
          (chainBlock as AST.BlockStatement).chained = true;
        }
        const body = buildEach(ast.body).join('');
        output.push(body);
      }
      break;
    case 'ElementNode':
      output.push('<', ast.tag);
      if (ast.attributes.length) {
        output.push(' ', buildEach(ast.attributes).join(' '));
      }
      if (ast.modifiers.length) {
        output.push(' ', buildEach(ast.modifiers).join(' '));
      }
      if (ast.comments.length) {
        output.push(' ', buildEach(ast.comments).join(' '));
      }

      if (ast.blockParams.length) {
        output.push(' ', 'as', ' ', `|${ast.blockParams.join(' ')}|`);
      }

      if (voidMap[ast.tag]) {
        if (ast.selfClosing) {
          output.push(' /');
        }

        output.push('>');
      } else if (ast.selfClosing) {
        output.push(' />');
      } else {
        output.push('>');
        output.push.apply(output, buildEach(ast.children));
        output.push('</', ast.tag, '>');
      }
      break;
    case 'AttrNode':
      if (ast.value.type === 'TextNode') {
        if (ast.value.chars !== '') {
          output.push(ast.name, '=');
          output.push(
            '"',
            options.entityEncoding === 'raw' ? ast.value.chars : escapeAttrValue(ast.value.chars),
            '"'
          );
        } else {
          output.push(ast.name);
        }
      } else {
        output.push(ast.name, '=');
        // ast.value is mustache or concat
        output.push(build(ast.value, options));
      }
      break;
    case 'ConcatStatement':
      output.push('"');
      ast.parts.forEach((node: AST.TextNode | AST.MustacheStatement) => {
        if (node.type === 'TextNode') {
          output.push(options.entityEncoding === 'raw' ? node.chars : escapeAttrValue(node.chars));
        } else {
          output.push(build(node, options));
        }
      });
      output.push('"');
      break;
    case 'TextNode':
      output.push(options.entityEncoding === 'raw' ? ast.chars : escapeText(ast.chars));
      break;
    case 'MustacheStatement':
      {
        output.push(
          compactJoin([
            ast.escaped ? '{{' : '{{{',
            ast.strip.open ? '~' : null,
            pathParams(ast),
            ast.strip.close ? '~' : null,
            ast.escaped ? '}}' : '}}}',
          ])
        );
      }
      break;
    case 'MustacheCommentStatement':
      {
        output.push(compactJoin(['{{!--', ast.value, '--}}']));
      }
      break;
    case 'ElementModifierStatement':
      {
        output.push(compactJoin(['{{', pathParams(ast), '}}']));
      }
      break;
    case 'PathExpression':
      output.push(ast.original);
      break;
    case 'SubExpression':
      {
        output.push('(', pathParams(ast), ')');
      }
      break;
    case 'BooleanLiteral':
      output.push(ast.value ? 'true' : 'false');
      break;
    case 'BlockStatement':
      {
        const lines: string[] = [];

        if (ast.chained) {
          lines.push(
            compactJoin([
              '{{',
              ast.inverseStrip.open ? '~' : null,
              'else ',
              pathParams(ast),
              ast.inverseStrip.close ? '~' : null,
              '}}',
            ])
          );
        } else {
          lines.push(openBlock(ast));
        }

        lines.push(build(ast.program, options));

        if (ast.inverse) {
          if (!ast.inverse.chained) {
            lines.push(
              compactJoin([
                '{{',
                ast.inverseStrip.open ? '~' : null,
                'else',
                ast.inverseStrip.close ? '~' : null,
                '}}',
              ])
            );
          }
          lines.push(build(ast.inverse, options));
        }

        if (!ast.chained) {
          lines.push(closeBlock(ast));
        }

        output.push(lines.join(''));
      }
      break;
    case 'PartialStatement':
      {
        output.push(compactJoin(['{{>', pathParams(ast), '}}']));
      }
      break;
    case 'CommentStatement':
      {
        output.push(compactJoin(['<!--', ast.value, '-->']));
      }
      break;
    case 'StringLiteral':
      {
        output.push(`"${ast.value}"`);
      }
      break;
    case 'NumberLiteral':
      {
        output.push(String(ast.value));
      }
      break;
    case 'UndefinedLiteral':
      {
        output.push('undefined');
      }
      break;
    case 'NullLiteral':
      {
        output.push('null');
      }
      break;
    case 'Hash':
      {
        output.push(
          ast.pairs
            .map(pair => {
              return build(pair, options);
            })
            .join(' ')
        );
      }
      break;
    case 'HashPair':
      {
        output.push(`${ast.key}=${build(ast.value, options)}`);
      }
      break;
  }
  return output.join('');
}

function compact(array: Option<string>[]): string[] {
  const newArray: any[] = [];
  array.forEach(a => {
    if (typeof a !== 'undefined' && a !== null && a !== '') {
      newArray.push(a);
    }
  });
  return newArray;
}
