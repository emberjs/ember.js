import { TextNode, StringNode, HashNode, usesMorph } from "../ast";

// Rewrites an array of AttrNodes into a HashNode.
// MustacheNodes are replaced with their root SexprNode and
// TextNodes are replaced with StringNodes

export function buildHashFromAttributes(attributes) {
  var pairs = [];

  for (var i = 0; i < attributes.length; i++) {
    var attr = attributes[i];
    if (attr.value.type === 'mustache') {
      pairs.push([attr.name, attr.value.sexpr]);
    } else if (attr.value.type === 'text') {
      pairs.push([attr.name, new StringNode(attr.value.chars)]);
    }
  }

  return new HashNode(pairs);
}

// Adds an empty text node at the beginning and end of a program.
// The empty text nodes *between* nodes are handled elsewhere.
// Also processes all whitespace stripping directives.

export function postprocessProgram(program) {
  var statements = program.statements;

  if (statements.length === 0) return;

  if (usesMorph(statements[0])) {
    statements.unshift(new TextNode(''));
  }

  if (usesMorph(statements[statements.length-1])) {
    statements.push(new TextNode(''));
  }

  // Perform any required whitespace stripping
  var l = statements.length;
  for (var i = 0; i < l; i++) {
    var statement = statements[i];

    if (statement.type !== 'text') continue;

    if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
      (i === 0 && program.strip.left)) {
      statement.chars = statement.chars.replace(/^\s+/, '');
    }

    if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
      (i === l-1 && program.strip.right)) {
      statement.chars = statement.chars.replace(/\s+$/, '');
    }

    // Remove unnecessary text nodes
    if (statement.chars.length === 0) {
      if ((i > 0 && statements[i-1].type === 'element') ||
        (i < l-1 && statements[i+1].type === 'element')) {
        statements.splice(i, 1);
        i--;
        l--;
      }
    }
  }
}
