// Statements

export function buildMustache(path, params, hash, raw, loc) {
  return {
    type: "MustacheStatement",
    path: path,
    params: params || [],
    hash: hash || buildHash([]),
    escaped: !raw,
    loc: buildLoc(loc)
  };
}

export function buildBlock(path, params, hash, program, inverse, loc) {
  return {
    type: "BlockStatement",
    path: path,
    params: params || [],
    hash: hash || buildHash([]),
    program: program || null,
    inverse: inverse || null,
    loc: buildLoc(loc)
  };
}

export function buildElementModifier(path, params, hash) {
  return {
    type: "ElementModifierStatement",
    path: path,
    params: params || [],
    hash: hash || buildHash([])
  };
}

export function buildPartial(name, params, hash, indent) {
  return {
    type: "PartialStatement",
    name: name,
    params: params || [],
    hash: hash || buildHash([]),
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

export function buildNull() {
  return {
    type: "NullLiteral",
    value: null,
    original: null
  };
}

export function buildUndefined() {
  return {
    type: "UndefinedLiteral",
    value: undefined,
    original: undefined
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

export function buildProgram(body, blockParams, loc) {
  return {
    type: "Program",
    body: body || [],
    blockParams: blockParams || [],
    loc: buildLoc(loc)
  };
}

function buildPosition(line, column) {
  return {
    line: line,
    column: column
  };
}

function buildLoc(loc) {
  if (loc) {
    return {
      source: loc.source || null,
      start: buildPosition(loc.start.line, loc.start.column),
      end: buildPosition(loc.end.line, loc.end.column)
    };
  } else {
    return null;
  }
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
  undefined: buildUndefined,
  null: buildNull,
  concat: buildConcat,
  hash: buildHash,
  pair: buildPair,
  program: buildProgram,
  loc: buildLoc,
  pos: buildPosition
};
