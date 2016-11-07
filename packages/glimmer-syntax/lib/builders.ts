// Statements

function buildMustache(path, params?, hash?, raw?, loc?) {
  return {
    type: "MustacheStatement",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    escaped: !raw,
    loc: buildLoc(loc)
  };
}

function buildBlock(path, params?, hash?, program?, inverse?, loc?) {
  return {
    type: "BlockStatement",
    path: buildPath(path),
    params: params ? params.map(buildPath) : [],
    hash: hash || buildHash([]),
    program: program || null,
    inverse: inverse || null,
    loc: buildLoc(loc)
  };
}

function buildElementModifier(path, params?, hash?, loc?) {
  return {
    type: "ElementModifierStatement",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc)
  };
}

function buildPartial(name, params, hash, indent) {
  return {
    type: "PartialStatement",
    name: name,
    params: params || [],
    hash: hash || buildHash([]),
    indent: indent
  };
}

function buildComment(value, loc?) {
  return {
    type: "CommentStatement",
    value: value,
    loc: buildLoc(loc)
  };
}

function buildMustacheComment(value, loc?) {
  return {
    type: "MustacheCommentStatement",
    value: value,
    loc: buildLoc(loc)
  };
}

function buildConcat(parts) {
  return {
    type: "ConcatStatement",
    parts: parts || []
  };
}

// Nodes

function buildElement(tag, attributes?, modifiers?, children?, loc?) {
  return {
    type: "ElementNode",
    tag: tag || "",
    attributes: attributes || [],
    blockParams: [],
    modifiers: modifiers || [],
    children: children || [],
    loc: buildLoc(loc)
  };
}

function buildAttr(name, value, loc?) {
  return {
    type: "AttrNode",
    name: name,
    value: value,
    loc: buildLoc(loc)
  };
}

function buildText(chars?, loc?) {
  return {
    type: "TextNode",
    chars: chars || "",
    loc: buildLoc(loc)
  };
}

// Expressions

function buildSexpr(path, params?, hash?, loc?) {
  return {
    type: "SubExpression",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc)
  };
}

function buildPath(original, loc?) {
  if (typeof original !== 'string') return original;

  let parts = original.split('.');

  if (parts[0] === 'this') {
    parts[0] = null;
  }

  return {
    type: "PathExpression",
    original,
    parts,
    data: false,
    loc: buildLoc(loc)
  };
}

function buildString(value) {
  return {
    type: "StringLiteral",
    value: value,
    original: value
  };
}

function buildBoolean(value) {
  return {
    type: "BooleanLiteral",
    value: value,
    original: value
  };
}

function buildNumber(value) {
  return {
    type: "NumberLiteral",
    value: value,
    original: value
  };
}

function buildNull() {
  return {
    type: "NullLiteral",
    value: null,
    original: null
  };
}

function buildUndefined() {
  return {
    type: "UndefinedLiteral",
    value: undefined,
    original: undefined
  };
}

// Miscellaneous

function buildHash(pairs?) {
  return {
    type: "Hash",
    pairs: pairs || []
  };
}

function buildPair(key, value) {
  return {
    type: "HashPair",
    key: key,
    value: value
  };
}

function buildProgram(body?, blockParams?, loc?) {
  return {
    type: "Program",
    body: body || [],
    blockParams: blockParams || [],
    loc: buildLoc(loc)
  };
}

function buildSource(source?) {
  return source || null;
}

function buildPosition(line, column) {
  return {
    line: (typeof line === 'number') ? line : null,
    column: (typeof column === 'number') ? column : null
  };
}

function buildLoc(loc: { source: any, start: any, end: any }): { source: any, start: any, end: any };
function buildLoc(startLine, startColumn, endLine?, endColumn?, source?): { source: any, start: any, end: any };

function buildLoc(...args) {
  if (args.length === 1) {
    let loc = args[0];

    if (typeof loc === 'object') {
      return {
        source: buildSource(loc.source),
        start: buildPosition(loc.start.line, loc.start.column),
        end: buildPosition(loc.end.line, loc.end.column)
      };
    } else {
      return null;
    }
  } else {
    let [ startLine, startColumn, endLine, endColumn, source ] = args;
    return {
      source: buildSource(source),
      start: buildPosition(startLine, startColumn),
      end: buildPosition(endLine, endColumn)
    };
  }
}

export default {
  mustache: buildMustache,
  block: buildBlock,
  partial: buildPartial,
  comment: buildComment,
  mustacheComment: buildMustacheComment,
  element: buildElement,
  elementModifier: buildElementModifier,
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
