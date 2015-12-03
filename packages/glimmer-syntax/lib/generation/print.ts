export default function build(ast) {
  if(!ast) {
    return '';
  }
  const output = [];

  switch(ast.type) {
    case 'Program': {
      const chainBlock = ast.chained && ast.body[0];
      if(chainBlock) {
        chainBlock.chained = true;
      }
      const body = buildEach(ast.body).join('');
      output.push(body);
    }
    break;
    case 'ElementNode':
      output.push('<', ast.tag);
      if(ast.attributes.length) {
        output.push(' ', buildEach(ast.attributes).join(' '));
      }
      if(ast.modifiers.length) {
        output.push(' ', buildEach(ast.modifiers).join(' '));
      }
      output.push('>');
      output.push.apply(output, buildEach(ast.children));
      output.push('</', ast.tag, '>');
    break;
    case 'AttrNode':
      output.push(ast.name, '=');
      const value = build(ast.value);
      if(ast.value.type === 'TextNode') {
        output.push('"', value, '"');
      } else {
        output.push(value);
      }
    break;
    case 'ConcatStatement':
      output.push('"');
      ast.parts.forEach(function(node) {
        if(node.type === 'StringLiteral') {
          output.push(node.original);
        } else {
          output.push(build(node));
        }
      });
      output.push('"');
    break;
    case 'TextNode':
      output.push(ast.chars);
    break;
    case 'MustacheStatement': {
      output.push(compactJoin(['{{', pathParams(ast), '}}']));
    }
    break;
    case 'ElementModifierStatement': {
      output.push(compactJoin(['{{', pathParams(ast), '}}']));
    }
    break;
    case 'PathExpression':
      output.push(ast.original);
    break;
    case 'SubExpression': {
      output.push('(', pathParams(ast), ')');
    }
    break;
    case 'BooleanLiteral':
      output.push(ast.value ? 'true' : false);
    break;
    case 'BlockStatement': {
      const lines = [];

      if(ast.chained){
        lines.push(['{{else ', pathParams(ast), '}}'].join(''));
      }else{
        lines.push(openBlock(ast));
      }

      lines.push(build(ast.program));

      if(ast.inverse) {
        if(!ast.inverse.chained){
          lines.push('{{else}}');
        }
        lines.push(build(ast.inverse));
      }

      if(!ast.chained){
        lines.push(closeBlock(ast));
      }

      output.push(lines.join(''));
    }
    break;
    case 'PartialStatement': {
      output.push(compactJoin(['{{>', pathParams(ast), '}}']));
    }
    break;
    case 'CommentStatement': {
      output.push(compactJoin(['<!--', ast.value, '-->']));
    }
    break;
    case 'StringLiteral': {
      output.push(`"${ast.value}"`);
    }
    break;
    case 'NumberLiteral': {
      output.push(ast.value);
    }
    break;
    case 'UndefinedLiteral': {
      output.push('undefined');
    }
    break;
    case 'NullLiteral': {
      output.push('null');
    }
    break;
    case 'Hash': {
      output.push(ast.pairs.map(function(pair) {
        return build(pair);
      }).join(' '));
    }
    break;
    case 'HashPair': {
      output.push(`${ast.key}=${build(ast.value)}`);
    }
    break;
  }
  return output.join('');
}

function compact(array) {
  const newArray = [];
  array.forEach(function(a) {
    if(typeof(a) !== 'undefined' && a !== null && a !== '') {
      newArray.push(a);
    }
  });
  return newArray;
}

function buildEach(asts) {
  const output = [];
  asts.forEach(function(node) {
    output.push(build(node));
  });
  return output;
}

function pathParams(ast) {
  const name = build(ast.name);
  const path = build(ast.path);
  const params = buildEach(ast.params).join(' ');
  const hash = build(ast.hash);
  return compactJoin([name, path, params, hash], ' ');
}

function compactJoin(array, delimiter?) {
  return compact(array).join(delimiter || '');
}

function blockParams(block) {
  const params = block.program.blockParams;
  if(params.length) {
    return ` as |${params.join(',')}|`;
  }
}

function openBlock(block) {
  return ['{{#', pathParams(block), blockParams(block), '}}'].join('');
}

function closeBlock(block) {
  return ['{{/', build(block.path), '}}'].join('');
}
