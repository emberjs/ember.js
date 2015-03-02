// Statements

export function buildMustache(sexpr, raw) {
  return {
    type: "MustacheStatement",
    sexpr: sexpr,
    escaped: !raw
  };
}

export function buildBlock(sexpr, program, inverse) {
  return {
    type: "BlockStatement",
    sexpr: sexpr,
    program: program || null,
    inverse: inverse || null
  };
}

export function buildPartial(sexpr, indent) {
  return {
    type: "PartialStatement",
    sexpr: sexpr,
    indent: indent
  };
}

export function buildComment(value) {
  return {
    type: "CommentStatement",
    value: value
  };
}

export function buildConcat(parts) {
  return {
    type: "ConcatStatement",
    parts: parts || []
  };
}

export function buildElementModifier(sexpr) {
  return {
    type: "ElementModifierStatement",
    sexpr: sexpr
  };
}

// Nodes

export function buildElement(tag, attributes, modifiers, children) {
  return {
    type: "ElementNode",
    tag: tag,
    attributes: attributes || [],
    modifiers: modifiers || [],
    children: children || []
  };
}

export function buildComponent(tag, attributes, program) {
  return {
    type: "ComponentNode",
    tag: tag,
    attributes: attributes,
    program: program
  };
}

export function buildAttr(name, value) {
  return {
    type: "AttrNode",
    name: name,
    value: value
  };
}

export function buildText(chars) {
  return {
    type: "TextNode",
    chars: chars
  };
}

// Expressions

export function buildSexpr(path, params, hash) {
  return {
    type: "SubExpression",
    path: path,
    params: params || [],
    hash: hash || buildHash([])
  };
}

export function buildPath(original) {
  return {
    type: "PathExpression",
    original: original,
    parts: original.split('.')
  };
}

export function buildString(value) {
  return {
    type: "StringLiteral",
    value: value,
    original: value
  };
}

export function buildBoolean(value) {
  return {
    type: "BooleanLiteral",
    value: value,
    original: value
  };
}

export function buildNumber(value) {
  return {
    type: "NumberLiteral",
    value: value,
    original: value
  };
}

// Miscellaneous

export function buildHash(pairs) {
  return {
    type: "Hash",
    pairs: pairs || []
  };
}

export function buildPair(key, value) {
  return {
    type: "HashPair",
    key: key,
    value: value
  };
}

export function buildProgram(body, blockParams) {
  return {
    type: "Program",
    body: body || [],
    blockParams: blockParams || []
  };
}

export default {
  mustache: buildMustache,
  block: buildBlock,
  partial: buildPartial,
  comment: buildComment,
  element: buildElement,
  elementModifier: buildElementModifier,
  component: buildComponent,
  attr: buildAttr,
  text: buildText,
  sexpr: buildSexpr,
  path: buildPath,
  string: buildString,
  boolean: buildBoolean,
  number: buildNumber,
  concat: buildConcat,
  hash: buildHash,
  pair: buildPair,
  program: buildProgram
};