// Peggy grammar for full Glimmer template parsing (HTML + Handlebars).
//
// This grammar parses a complete Glimmer template and produces ASTv1-shaped
// plain objects directly. It handles:
//   - HTML elements (open/close, self-closing, void)
//   - Attributes (static, dynamic, concat)
//   - Handlebars mustaches, blocks, comments
//   - Element modifiers
//   - Text content
//   - HTML comments
//
// Generate with:
//   npx peggy --format es hbs.peggy -o parser.js

{
// ============================================================================
// Void elements set
// ============================================================================
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Raw content tags (content is not parsed as HTML)
const RAW_TAGS = new Set(['script', 'style', 'textarea', 'title']);

// ============================================================================
// Helper: build a PathExpression AST node from parsed segments.
// ============================================================================
function buildPath(data, segments, loc) {
  let original = data ? '@' : '';
  let tail = [];
  let isThis = false;
  let hasDot = false;
  let hasSlash = false;
  let headName = undefined;
  let headLoc = undefined;

  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    let part = seg.part;
    let isLiteral = seg.original !== part;
    let separator = seg.separator || '';
    let partPrefix = separator === '.#' ? '#' : '';

    if (separator === '.' || separator === '.#') hasDot = true;
    if (separator === '/') hasSlash = true;

    original += separator + seg.original;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (tail.length > 0) {
        error('Invalid path: ' + original);
      } else if (part === 'this') {
        isThis = true;
      }
    } else {
      if (headName === undefined && !isThis) {
        headName = partPrefix + part;
        headLoc = seg.loc;
      } else {
        tail.push(partPrefix + part);
      }
    }
  }

  // Glimmer-specific path restrictions
  if (hasSlash) {
    if (original.startsWith('./')) {
      error('Using "./" is not supported in Glimmer and unnecessary');
    }
    if (original.startsWith('../')) {
      error('Changing context using "../" is not supported in Glimmer');
    }
    if (hasDot) {
      error("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths");
    }
    // Slash-only paths (e.g. fizz-bar/baz-bar) are treated as a single name
    // for Ember component resolution — merge head + tail into one head.
    if (!hasDot && headName !== undefined) {
      let fullName = original;
      if (data) fullName = original.slice(1); // strip leading @
      headName = fullName;
      tail = [];
    }
  }

  if (original === '.') {
    error("'.' is not a supported path in Glimmer; check for a path with a trailing '.'");
  }

  // Build the structured head object with `original` alias (required by ASTv1)
  let head;
  if (isThis) {
    head = { type: 'ThisHead', original: 'this', loc: { start: loc.start, end: { offset: loc.start.offset + 4, line: loc.start.line, column: loc.start.column + 4 } } };
  } else if (data) {
    if (headName === undefined) {
      error("Attempted to parse a path expression, but it was not valid. Paths beginning with @ must start with a-z");
    }
    let atName = '@' + headName;
    head = { type: 'AtHead', name: atName, original: atName, loc: headLoc ? { start: loc.start, end: { offset: loc.start.offset + headName.length + 1, line: loc.start.line, column: loc.start.column + headName.length + 1 } } : loc };
  } else {
    if (headName === undefined) {
      error("Paths must start with a-z or A-Z");
    }
    head = { type: 'VarHead', name: headName, original: headName, loc: headLoc || loc };
  }

  return {
    type: 'PathExpression',
    head: head,
    tail: tail,
    original: original,
    loc: loc,
  };
}

// Strip brackets from [foo] segments.
function idFromBracket(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substring(1, token.length - 1);
  }
  return token;
}

// Build an element path from a tag name string
function buildElementPath(tagName, loc) {
  let parts = tagName.split('.');
  let headStr = parts[0];
  let tail = parts.slice(1);

  // Compute head location: starts at loc.start, ends at loc.start + headStr.length
  let headLoc;
  if (tail.length > 0) {
    headLoc = {
      start: loc.start,
      end: { offset: loc.start.offset + headStr.length, line: loc.start.line, column: loc.start.column + headStr.length },
    };
  } else {
    headLoc = loc;
  }

  let head;
  if (headStr === 'this') {
    head = { type: 'ThisHead', original: 'this', loc: headLoc };
  } else if (headStr.startsWith('@')) {
    head = { type: 'AtHead', name: headStr, original: headStr, loc: headLoc };
  } else {
    head = { type: 'VarHead', name: headStr, original: headStr, loc: headLoc };
  }

  return {
    type: 'PathExpression',
    head: head,
    tail: tail,
    original: tagName,
    loc: loc,
  };
}

// Build a default empty Hash node
function emptyHash(loc) {
  return {
    type: 'Hash',
    pairs: [],
    loc: loc,
  };
}

// Build a default strip flags object
function noStrip() {
  return { open: false, close: false };
}

// Merge consecutive TextNode chars into fewer nodes.
// TextNodes marked with _backslashGroup start a new text group and are NOT
// merged with the preceding TextNode. When a non-flagged TextNode follows a
// flagged one, it merges with it and CLEARS the flag (so that subsequent
// _backslashGroup nodes start a new group again).
function mergeTextNodes(nodes) {
  let result = [];
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let prev = result.length > 0 ? result[result.length - 1] : null;
    let merge = node.type === 'TextNode' && prev && prev.type === 'TextNode';
    if (merge && node._backslashGroup) {
      // Escape-derived node never merges with any preceding text node.
      merge = false;
    }
    if (merge && node._fromBackslashBoundary && prev._backslashGroup) {
      // n-bs literal backslashes must not cross an escape boundary.
      merge = false;
    }
    if (merge) {
      prev.chars += node.chars;
      prev.loc = { start: prev.loc.start, end: node.loc.end };
      // Preserve prev's _backslashGroup so subsequent n-bs still sees the
      // escape boundary.
    } else {
      result.push(node);
    }
  }
  for (let node of result) {
    if (node.type === 'TextNode') {
      delete node._backslashGroup;
      delete node._fromBackslashBoundary;
    }
  }
  return result;
}
}

// ============================================================================
// FULL TEMPLATE RULES
// ============================================================================

// The top-level rule: parse a full template.
Template
  = body:TopLevelStatements {
      return {
        type: 'Template',
        body: body,
        blockParams: [],
        loc: location(),
      };
    }

TopLevelStatements
  = stmts:TopLevelStatement* {
      return mergeTextNodes(stmts.flat());
    }

TopLevelStatement
  = HtmlComment
  / MustacheCommentStmt
  / BlockStmt
  / MustacheStmt
  / EscapedMustache
  / ClosingTagError
  / ElementNode
  / TextContent

// ============================================================================
// TEXT CONTENT — anything that isn't a tag or mustache
// ============================================================================

TextContent
  = chars:TextChar+ {
      return {
        type: 'TextNode',
        chars: chars.join(''),
        loc: location(),
      };
    }

TextChar
  = !("<" / "{{" / [\\]+ "{{") ch:. { return ch; }

// ============================================================================
// ESCAPED MUSTACHE: \{{ ... }} and backslash sequences before {{
// ============================================================================

// Matches one or more backslashes followed by "{{".
// - Odd count: the last backslash escapes "{{", preceding pairs are literal "\"
//   e.g. \{{ → text "{{", \\\{{ → text "\{{"
// - Even count: all backslashes pair up into literal "\" chars, and "{{" is NOT
//   consumed (it will be parsed as a mustache).
//   e.g. \\{{ → text "\" (then {{ parsed as mustache)
// Matches backslash(es) before "{{". Two cases:
// 1. Exactly one backslash + "{{…}}" → escaped mustache → TextNode "{{…}}"
// 2. Two or more backslashes before "{{" → strip one backslash (leaving n-1),
//    do NOT consume the "{{" (it becomes a real MustacheStmt)
EscapedMustache
  = MultipleBackslashesBeforeMustache
  / SingleBackslashEscapedMustache

// 2+ backslashes before "{{" — emit (n-1) backslashes as text, leave "{{" alone.
// Marked with _fromBackslashBoundary so it merges with plain preceding text but
// stays separate from an escape-derived text (which carries _backslashGroup).
MultipleBackslashesBeforeMustache
  = slashes:$([\\]+) &"{{" &{ return slashes.length >= 2; } {
      return {
        type: 'TextNode',
        chars: '\\'.repeat(slashes.length - 1),
        _fromBackslashBoundary: true,
        loc: location(),
      };
    }

// Exactly one backslash + "{{…}}" — escaped mustache.
// With matching "}}", the full "{{…}}" is literal text.
// Without "}}", just the "{{" is literal text.
SingleBackslashEscapedMustache
  = SingleBackslashEscapedMustacheWithBody
  / SingleBackslashEscapedMustacheWithoutBody

SingleBackslashEscapedMustacheWithBody
  = "\\" "{{" chars:$([^}] / "}" [^}])* "}}" {
      return {
        type: 'TextNode',
        chars: '{{' + chars + '}}',
        _backslashGroup: true,
        loc: location(),
      };
    }

SingleBackslashEscapedMustacheWithoutBody
  = [\\] braces:$("\x7B\x7B") {
      return {
        type: 'TextNode',
        chars: braces,
        _backslashGroup: true,
        loc: location(),
      };
    }

// ============================================================================
// HTML COMMENTS: <!-- ... -->
// ============================================================================

HtmlComment
  = "<!--" value:$(!"-->" .)* "-->" {
      return {
        type: 'CommentStatement',
        value: value,
        loc: location(),
      };
    }

// ============================================================================
// MUSTACHE COMMENTS: {{! ... }} or {{!-- ... --}}
// ============================================================================

MustacheCommentStmt
  = "{{" openStrip:StripFlag "!--" value:$(!("--" "~"? "}}") .)* "--" closeStrip:StripFlag "}}" {
      return {
        type: 'MustacheCommentStatement',
        value: value,
        strip: { open: openStrip, close: closeStrip },
        loc: location(),
      };
    }
  / "{{" openStrip:StripFlag "!" rawValue:$([^}] / "}" [^}])* "}}" {
      // Short-form comment: strip trailing ~ (strip flag) then strip leading/trailing dashes
      let v = rawValue;
      let closeStrip = false;
      if (v.endsWith('~')) {
        v = v.slice(0, -1);
        closeStrip = true;
      }
      v = v.replace(/^-+/, '').replace(/-+$/, '');
      return {
        type: 'MustacheCommentStatement',
        value: v,
        strip: { open: openStrip, close: closeStrip },
        loc: location(),
      };
    }

// ============================================================================
// MUSTACHE STATEMENTS: {{ expr }}, {{{ expr }}}
// ============================================================================

MustacheStmt
  = PartialStmt
  / PartialBlockStmt
  / DecoratorBlockStmt
  / DecoratorStmt
  / SplatMustacheStmt
  / TripleMustache
  / EmptyMustacheError
  / DoubleMustache
  / InvalidMustacheCloseError

// Error: empty mustache or tilde-only — no expression inside
// errPos marks the start of the close braces; +1 for 1-based Peggy columns.
// The span must be non-empty so that generateSyntaxError includes a code block,
// which Prettier's getErrorMessage uses to strip the (error occurred ...) suffix.
EmptyMustacheError
  = startPos:Pos "{{" StripFlag errPos:Pos "~"* "}}" endPos:Pos {
      let errStart = { line: errPos.start.line, column: errPos.start.column };
      let errEnd = { line: endPos.start.line, column: endPos.start.column };
      error("Expecting 'OPEN_SEXPR', 'ID', 'OPEN_ARRAY', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'CLOSE'", { start: errStart, end: errEnd });
    }

// Error: mustache with expression but invalid close (single brace instead of double)
InvalidMustacheCloseError
  = startPos:Pos "{{" StripFlag _ Expression Params HashOpt _ errPos:Pos "}" endPos:Pos !"}" {
      let errStart = { line: errPos.start.line, column: errPos.start.column };
      let errEnd = { line: endPos.start.line, column: endPos.start.column };
      error("Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_ARRAY', 'CLOSE_ARRAY', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', 'PRIVATE_SEP', got 'INVALID'", { start: errStart, end: errEnd });
    }

// Partials: {{> foo}} — not supported in Glimmer
PartialStmt
  = "{{" _ ">" _ $([^}]+ / "}" [^}])* "}}" {
      error("Handlebars partials are not supported");
    }

// Partial blocks: {{#> foo}}...{{/foo}} — not supported
PartialBlockStmt
  = "{{" _ "#>" _ $([^}]+ / "}" [^}])* "}}" {
      error("Handlebars partial blocks are not supported");
    }

// Decorator blocks: {{#* foo}}...{{/foo}} — not supported
DecoratorBlockStmt
  = "{{" _ "#*" _ $([^}]+ / "}" [^}])* "}}" {
      error("Handlebars decorator blocks are not supported");
    }

// Decorators: {{* foo}} — not supported
DecoratorStmt
  = "{{" _ "*" _ $([^}]+ / "}" [^}])* "}}" {
      error("Handlebars decorators are not supported");
    }

// {{...attributes}} outside of element space is illegal
SplatMustacheStmt
  = "{{" _ "...attributes" _ "}}" {
      error("Illegal use of ...attributes");
    }

TripleMustache
  = "{{{" openStrip:StripFlag _ expr:Expression params:Params hash:HashOpt _ closeStrip:StripFlag "}}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      return {
        type: 'MustacheStatement',
        path: expr,
        params: params,
        hash: h,
        trusting: true,
        strip: { open: openStrip, close: closeStrip },
        loc: loc,
      };
    }

DoubleMustache
  = "{{" openStrip:StripFlag _ expr:Expression params:Params hash:HashOpt _ closeStrip:StripFlag "}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      return {
        type: 'MustacheStatement',
        path: expr,
        params: params,
        hash: h,
        trusting: false,
        strip: { open: openStrip, close: closeStrip },
        loc: loc,
      };
    }

StripFlag
  = "~" { return true; }
  / "" { return false; }

// ============================================================================
// BLOCK STATEMENTS: {{#if}}...{{else}}...{{/if}}
// ============================================================================

BlockStmt
  = "{{" openStripL:StripFlag "#" _ expr:Expression params:Params hash:HashOpt blockParams:BlockParamsOpt _ openStripR:StripFlag "}}"
    programResult:BlockBody
    inverse:InverseChain?
    "{{" closeStripL:StripFlag "/" _ closeTag:Expression _ closeStripR:StripFlag "}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      let bp = blockParams || [];

      let programBlock = {
        type: 'Block',
        body: programResult.body,
        params: bp.map(function(p) { let n = typeof p === 'string' ? p : p.name; let l = typeof p === 'string' ? loc : p.loc; return { type: 'VarHead', name: n, original: n, loc: l }; }),
        blockParams: bp.map(function(p) { return typeof p === 'string' ? p : p.name; }),
        chained: false,
        loc: programResult.loc,
      };

      return {
        type: 'BlockStatement',
        path: expr,
        params: params,
        hash: h,
        program: programBlock,
        inverse: inverse ? inverse.block : null,
        openStrip: { open: openStripL, close: openStripR },
        inverseStrip: inverse ? inverse.strip : noStrip(),
        closeStrip: { open: closeStripL, close: closeStripR },
        loc: loc,
      };
    }

InverseChain
  = ElseBlock
  / ElseIfChain

ElseIfChain
  = inverseStart:Pos "{{" stripL:StripFlag "else" __ expr:Expression params:Params hash:HashOpt blockParams:BlockParamsOpt _ stripR:StripFlag "}}" bodyStart:Pos
    programResult:BlockBody
    inverse:InverseChain? {
      let loc = location();
      let h = hash || emptyHash(loc);
      let bp = blockParams || [];

      let programBlock = {
        type: 'Block',
        body: programResult.body,
        params: bp.map(function(p) { let n = typeof p === 'string' ? p : p.name; let l = typeof p === 'string' ? loc : p.loc; return { type: 'VarHead', name: n, original: n, loc: l }; }),
        blockParams: bp.map(function(p) { return typeof p === 'string' ? p : p.name; }),
        chained: false,
        loc: programResult.loc,
      };

      let chainedBlock = {
        type: 'BlockStatement',
        path: expr,
        params: params,
        hash: h,
        program: programBlock,
        inverse: inverse ? inverse.block : null,
        openStrip: { open: stripL, close: stripR },
        inverseStrip: inverse ? inverse.strip : noStrip(),
        closeStrip: noStrip(),
        loc: loc,
      };

      // The wrapped block location starts after the {{else if ...}} tag
      // and ends at the start of the next inverse (if any), or the end of the match
      let wrappedEnd = inverse ? inverse.inverseStart : loc.end;
      let wrappedLoc = { start: bodyStart.start, end: wrappedEnd };

      let wrappedBlock = {
        type: 'Block',
        body: [chainedBlock],
        params: [],
        blockParams: [],
        chained: true,
        loc: wrappedLoc,
      };

      return {
        strip: { open: stripL, close: stripR },
        block: wrappedBlock,
        inverseStart: inverseStart.start,
      };
    }

ElseBlock
  = inverseStart:Pos "{{" stripL:StripFlag "else" _ stripR:StripFlag "}}" bodyStart:Pos bodyResult:BlockBody {
      let loc = location();
      return {
        strip: { open: stripL, close: stripR },
        block: {
          type: 'Block',
          body: bodyResult.body,
          params: [],
          blockParams: [],
          chained: false,
          loc: { start: bodyStart.start, end: loc.end },
        },
        inverseStart: inverseStart.start,
      };
    }

BlockBody
  = stmts:BlockBodyStatement* {
      let body = mergeTextNodes(stmts.flat());
      return { body: body, loc: location() };
    }

BlockBodyStatement
  = !BlockBoundary node:(
      HtmlComment
    / MustacheCommentStmt
    / BlockStmt
    / MustacheStmt
    / EscapedMustache
    / ClosingTagError
    / ElementNode
    / BlockTextContent
  ) { return node; }

// Lookahead: detect block boundaries ({{else...}}, {{^...}}, {{/...}})
BlockBoundary
  = "{{" "~"? _ "else" (__ / "~"? "}}")
  / "{{" "~"? _ "/"
  / "{{" "~"? _ "^" _ "~"? "}}"

// Text inside a block body - stop at block boundaries too
BlockTextContent
  = chars:BlockTextChar+ {
      return {
        type: 'TextNode',
        chars: chars.join(''),
        loc: location(),
      };
    }

BlockTextChar
  = !("<" / "{{" / [\\]+ "{{") ch:. { return ch; }


// ============================================================================
// ERROR RULES: Unmatched closing tags, void element close tags, etc.
// ============================================================================

// Closing tag for a void element: </input>, </br> etc.
// Only match lowercase names (uppercase like </Input> is a component close tag, not void)
VoidCloseTagError
  = startPos:Pos "</" name:TagName _ ">" endPos:Pos &{ return VOID_TAGS.has(name) && name[0] === name[0].toLowerCase(); } {
      error('<' + name + '> elements do not need end tags. You should remove it', { start: startPos.start, end: endPos.start });
    }

// Closing tag with attributes: </div foo="bar">
CloseTagWithAttrsError
  = startPos:Pos "</" name:TagName __ $([^>]*) endPos:Pos ">" {
      error('Invalid end tag: closing tag must not have attributes', { start: startPos.start, end: endPos.start });
    }

// Generic unmatched closing tag: </p> at top level
ClosingTagError
  = VoidCloseTagError
  / CloseTagWithAttrsError
  / startPos:Pos "</" name:TagName _ ">" endPos:Pos {
      error('Closing tag </' + name + '> without an open tag', { start: startPos.start, end: endPos.start });
    }

// Mustache in tag name space: <{{foo}}> or <input{{bar}}>
MustacheInTagNameError
  = "<" startPos:Pos "{{" content:$(!"}}".)*  "}}" endPos:Pos {
      error('Cannot use mustaches in an elements tagname', { start: startPos.start, end: endPos.start });
    }
  / "<" TagName startPos:Pos "{{" content:$(!"}}".)*  "}}" endPos:Pos {
      error('Cannot use mustaches in an elements tagname', { start: startPos.start, end: endPos.start });
    }

// ============================================================================
// HTML ELEMENTS
// ============================================================================

ElementNode
  = MustacheInTagNameError
  / InvalidNamedBlockOpenError
  / SelfClosingElement
  / VoidElement
  / NormalElement
  / InvalidBraceElementError
  / UnclosedElement

// Error: <{ starts an element with a brace — parse the content as a pseudo tag name
InvalidBraceElementError
  = openStart:Pos "<" "\x7B" tagName:$([^>]*) ">" openEnd:Pos .* {
      let re = new RegExp('[' + String.fromCharCode(123) + String.fromCharCode(125) + ']', 'g');
      let name = tagName.replace(re, '').trim() || String.fromCharCode(123);
      error('Unclosed element `' + name + '`', { start: openStart.start, end: openEnd.start });
    }

// Invalid named block open tag: <:1bar>, <:Foo>
InvalidNamedBlockOpenError
  = startPos:Pos "<" ":" name:$([A-Z] [a-zA-Z0-9-]*) attrs:ElementContent* _ ">" children:(!("</" ":" [A-Z] [a-zA-Z0-9-]* _ ">") .)* "</" ":" [A-Z] [a-zA-Z0-9-]* _ ">" endPos:Pos .* {
      error('<:' + name + '> is not a valid named block, and named blocks must begin with a lowercase letter', { start: startPos.start, end: endPos.start });
    }
  / "<" ":" $([^a-zA-Z \t\n\r/>] [^ \t\n\r/>]*) [^>]* ">"
    (!("</" ":" / "<:" "/") .)*
    closeStart:Pos ("</" ":" / "<:" "/") $([^ \t\n\r>]*) _ ">" closeEnd:Pos .* {
      error('Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter', { start: closeStart.start, end: closeEnd.start });
    }

SelfClosingElement
  = "<" tagNameStart:Pos tagName:TagName tagNameEnd:Pos attrs:ElementContent* _ "/" ">" {
      let loc = location();
      let attributes = [];
      let modifiers = [];
      let comments = [];
      let blockParamsList = [];

      for (let i = 0; i < attrs.length; i++) {
        let item = attrs[i];
        if (item.type === 'AttrNode') attributes.push(item);
        else if (item.type === 'ElementModifierStatement') modifiers.push(item);
        else if (item.type === 'MustacheCommentStatement') comments.push(item);
        else if (item.type === 'BlockParams') blockParamsList = item.params;
      }

      let tagNameLoc = { start: tagNameStart.start, end: tagNameEnd.start };
      let path = buildElementPath(tagName, tagNameLoc);

      return {
        type: 'ElementNode',
        path: path,
        attributes: attributes,
        modifiers: modifiers,
        params: blockParamsList,
        comments: comments,
        children: [],
        tag: tagName,
        blockParams: blockParamsList.map(function(p) { return p.name || p; }),
        selfClosing: true,
        openTag: loc,
        closeTag: undefined,
        loc: loc,
      };
    }

VoidElement
  = "<" tagNameStart:Pos tagName:VoidTagName tagNameEnd:Pos attrs:ElementContent* _ ">" {
      let loc = location();
      let attributes = [];
      let modifiers = [];
      let comments = [];
      let blockParamsList = [];

      for (let i = 0; i < attrs.length; i++) {
        let item = attrs[i];
        if (item.type === 'AttrNode') attributes.push(item);
        else if (item.type === 'ElementModifierStatement') modifiers.push(item);
        else if (item.type === 'MustacheCommentStatement') comments.push(item);
        else if (item.type === 'BlockParams') blockParamsList = item.params;
      }

      let tagNameLoc = { start: tagNameStart.start, end: tagNameEnd.start };
      let path = buildElementPath(tagName, tagNameLoc);

      return {
        type: 'ElementNode',
        path: path,
        attributes: attributes,
        modifiers: modifiers,
        params: blockParamsList,
        comments: comments,
        children: [],
        tag: tagName,
        blockParams: blockParamsList.map(function(p) { return p.name || p; }),
        selfClosing: false,
        openTag: loc,
        closeTag: undefined,
        loc: loc,
      };
    }

NormalElement
  = RawContentElement
  / GenericNormalElement

RawContentElement
  = openStart:Pos "<" tagNameStart:Pos tagName:RawTagName tagNameEnd:Pos attrs:ElementContent* _ ">" openEnd:Pos
    children:RawContentChildren
    closeStart:Pos "</" closeTagName:RawCloseTagName _ ">" closeEnd:Pos {
      if (tagName.toLowerCase() !== closeTagName.toLowerCase()) {
        error('Closing tag </' + closeTagName + '> did not match last open tag <' + tagName + '> (on line ' + openStart.start.line + ')', { start: closeStart.start, end: closeEnd.start });
      }

      let loc = location();
      let attributes = [];
      let modifiers = [];
      let comments = [];
      let blockParamsList = [];

      for (let i = 0; i < attrs.length; i++) {
        let item = attrs[i];
        if (item.type === 'AttrNode') attributes.push(item);
        else if (item.type === 'ElementModifierStatement') modifiers.push(item);
        else if (item.type === 'MustacheCommentStatement') comments.push(item);
        else if (item.type === 'BlockParams') blockParamsList = item.params;
      }

      let tagNameLoc = { start: tagNameStart.start, end: tagNameEnd.start };
      let path = buildElementPath(tagName, tagNameLoc);

      return {
        type: 'ElementNode',
        path: path,
        attributes: attributes,
        modifiers: modifiers,
        params: blockParamsList,
        comments: comments,
        children: children,
        tag: tagName,
        blockParams: blockParamsList.map(function(p) { return p.name || p; }),
        selfClosing: false,
        openTag: { start: openStart.start, end: openEnd.start },
        closeTag: { start: closeStart.start, end: closeEnd.start },
        loc: loc,
      };
    }

RawContentChildren
  = stmts:RawContentChildStatement* {
      return mergeTextNodes(stmts.flat());
    }

RawContentChildStatement
  = MustacheCommentStmt
  / BlockStmt
  / MustacheStmt
  / EscapedMustache
  / RawTextContent

RawTextContent
  = chars:RawTextChar+ {
      return {
        type: 'TextNode',
        chars: chars.join(''),
        loc: location(),
      };
    }

RawTextChar
  = !("{{" / [\\]+ "{{" / RawCloseTagLookahead) ch:. { return ch; }

RawCloseTagLookahead
  = "</" name:TagName &{ return RAW_TAGS.has(name.toLowerCase()); }

RawTagName
  = name:TagName &{ return RAW_TAGS.has(name.toLowerCase()); } { return name; }

RawCloseTag
  = "</" name:TagName _ ">" &{ return RAW_TAGS.has(name.toLowerCase()); } { return name; }

RawCloseTagName
  = name:TagName &{ return RAW_TAGS.has(name.toLowerCase()); } { return name; }

GenericNormalElement
  = openStart:Pos "<" tagNameStart:Pos tagName:TagName tagNameEnd:Pos attrs:ElementContent* _ ">" openEnd:Pos
    children:ElementChildren
    closeStart:Pos "</" closeTagName:TagName _ ">" closeEnd:Pos {
      // Validate named block names
      if (tagName.startsWith(':') && tagName.length > 1) {
        let nameAfterColon = tagName.slice(1);
        if (/^[A-Z]/.test(nameAfterColon)) {
          error('<' + tagName + '> is not a valid named block, and named blocks must begin with a lowercase letter', { start: openStart.start, end: closeEnd.start });
        }
      }
      if (closeTagName.startsWith(':') && closeTagName.length > 1) {
        let nameAfterColon = closeTagName.slice(1);
        if (/^[^a-z]/.test(nameAfterColon)) {
          if (/^[0-9]/.test(nameAfterColon) || nameAfterColon.startsWith('/')) {
            error('Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter', { start: closeStart.start, end: closeEnd.start });
          } else {
            error('<' + closeTagName + '> is not a valid named block, and named blocks must begin with a lowercase letter', { start: closeStart.start, end: closeEnd.start });
          }
        }
      }
      if (tagName !== closeTagName) {
        error('Closing tag </' + closeTagName + '> did not match last open tag <' + tagName + '> (on line ' + openStart.start.line + ')', { start: closeStart.start, end: closeEnd.start });
      }

      let loc = location();
      let attributes = [];
      let modifiers = [];
      let comments = [];
      let blockParamsList = [];

      for (let i = 0; i < attrs.length; i++) {
        let item = attrs[i];
        if (item.type === 'AttrNode') attributes.push(item);
        else if (item.type === 'ElementModifierStatement') modifiers.push(item);
        else if (item.type === 'MustacheCommentStatement') comments.push(item);
        else if (item.type === 'BlockParams') blockParamsList = item.params;
      }

      let tagNameLoc = { start: tagNameStart.start, end: tagNameEnd.start };
      let path = buildElementPath(tagName, tagNameLoc);

      return {
        type: 'ElementNode',
        path: path,
        attributes: attributes,
        modifiers: modifiers,
        params: blockParamsList,
        comments: comments,
        children: children,
        tag: tagName,
        blockParams: blockParamsList.map(function(p) { return p.name || p; }),
        selfClosing: false,
        openTag: { start: openStart.start, end: openEnd.start },
        closeTag: { start: closeStart.start, end: closeEnd.start },
        loc: loc,
      };
    }

// An element that is opened but never closed — produces an error.
// This must be AFTER NormalElement so it's only tried when normal parsing fails.
UnclosedElement
  = openStart:Pos "<" tagName:TagName attrs:ElementContent* _ ">" openEnd:Pos .* {
      error('Unclosed element `' + tagName + '`', { start: openStart.start, end: openEnd.start });
    }

ElementChildren
  = stmts:ElementChildStatement* {
      return mergeTextNodes(stmts.flat());
    }

ElementChildStatement
  = HtmlComment
  / MustacheCommentStmt
  / BlockStmt
  / MustacheStmt
  / EscapedMustache
  / VoidCloseTagError
  / CloseTagWithAttrsError
  / InvalidNamedBlockCloseError
  / ElementNode
  / ElementTextContent

// Invalid named block close tag: <:/1bar> or any close for named block with invalid name
InvalidNamedBlockCloseError
  = startPos:Pos "</" ":" content:$([^ \t\n\r>]+) _ ">" endPos:Pos &{
      // Match close tags for named blocks with non-lowercase first char
      return content.length > 0 && !/^[a-z]/.test(content);
    } {
      error('Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter', { start: startPos.start, end: endPos.start });
    }

ElementTextContent
  = chars:ElementTextChar+ {
      return {
        type: 'TextNode',
        chars: chars.join(''),
        loc: location(),
      };
    }

ElementTextChar
  = !("<" / "{{" / [\\]+ "{{") ch:. { return ch; }


// ============================================================================
// TAG NAMES
// ============================================================================

// A void tag name (case-sensitive matching against void tag set).
// Only exact lowercase tag names match as void elements.
// Mixed case like <imG> or <lINk> are treated as regular elements (components).
VoidTagName
  = name:TagName &{ return VOID_TAGS.has(name); } { return name; }

// A tag name: div, MyComponent, my-thing, Foo.Bar, Foo::Bar, :named, @foo, this, this.foo
TagName
  = name:$(":" [a-zA-Z] [a-zA-Z0-9-]*)  { return name; }
  / name:$("@" [a-zA-Z] [a-zA-Z0-9-]* (("." / "::") [a-zA-Z][a-zA-Z0-9-]*)*)  { return name; }
  / name:$("this" (("." / "::") [a-zA-Z][a-zA-Z0-9-]*)*)  { return name; }
  / name:$([a-zA-Z] [a-zA-Z0-9-]* (("." / "::") [a-zA-Z][a-zA-Z0-9-]*)*)  { return name; }


// ============================================================================
// ELEMENT CONTENT (attributes, modifiers, comments inside open tag)
// ============================================================================

ElementContent
  = _ item:MustacheElementContentItem { return item; }
  / _ !(">" / "/>") item:NonMustacheElementContentItem { return item; }
  / _ "\"" { error('" is not a valid character within attribute names'); }
  / _ !(">" / "/>") "=" { error('attribute name cannot start with equals sign'); }

MustacheElementContentItem
  = ElementModifier
  / MustacheCommentInElement

NonMustacheElementContentItem
  = ElementBlockParams
  / Splattributes
  / PipeWithoutAsError
  / CommentAfterEqualsError
  / CommentAfterAttrNameError
  / Attribute

// Error: attr_name{{! comment }} (comment immediately touching attribute name, no space)
CommentAfterAttrNameError
  = name:AttributeName startPos:Pos "{{" "!" $([^}] / "}" [^}])* "}}" {
      error('Using a Handlebars comment when in the `attributeName` state is not supported', { start: startPos.start, end: location().end });
    }

// Error: attr_name={{! comment }} (comment after = sign)
CommentAfterEqualsError
  = name:AttributeName _ "=" _ startPos:Pos "{{" "!" $([^}] / "}" [^}])* "}}" {
      error('Using a Handlebars comment when in the `beforeAttributeValue` state is not supported', { start: startPos.start, end: location().end });
    }

// ============================================================================
// SPLATTRIBUTES: ...attributes
// ============================================================================

Splattributes
  = name:$("..." ("attributes" / "arguments")) endPos:Pos {
      return {
        type: 'AttrNode',
        name: name,
        value: { type: 'TextNode', chars: '', loc: { start: endPos.start, end: endPos.start } },
        loc: location(),
      };
    }

// ============================================================================
// ELEMENT MODIFIERS: {{on "click" this.handler}}
// ============================================================================

ElementModifier
  = "{{" _ "...attributes" _ "}}" {
      error("Illegal use of ...attributes");
    }
  / "{{" _ expr:Expression params:Params hash:HashOpt _ "}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      return {
        type: 'ElementModifierStatement',
        path: expr,
        params: params,
        hash: h,
        loc: loc,
      };
    }

// ============================================================================
// MUSTACHE COMMENTS IN ELEMENT: {{! comment }}
// ============================================================================

MustacheCommentInElement
  = "{{" openStrip:StripFlag "!--" value:$(!("--" "~"? "}}") .)* "--" closeStrip:StripFlag "}}" {
      return {
        type: 'MustacheCommentStatement',
        value: value,
        strip: { open: openStrip, close: closeStrip },
        loc: location(),
      };
    }
  / "{{" openStrip:StripFlag "!" rawValue:$([^}] / "}" [^}])* "}}" {
      let v = rawValue;
      let closeStrip = false;
      if (v.endsWith('~')) {
        v = v.slice(0, -1);
        closeStrip = true;
      }
      v = v.replace(/^-+/, '').replace(/-+$/, '');
      return {
        type: 'MustacheCommentStatement',
        value: v,
        strip: { open: openStrip, close: closeStrip },
        loc: location(),
      };
    }

// ============================================================================
// Error: |x| without "as" keyword
// ============================================================================

PipeWithoutAsError
  = startPos:Pos "|" [^|]* "|" {
      error('Invalid block parameters syntax: block parameters must be preceded by the `as` keyword', { start: startPos.start, end: location().end });
    }

// ============================================================================
// ELEMENT BLOCK PARAMS: as |foo bar|
// ============================================================================

ElementBlockParams
  = "as" __ "|" names:ElementBlockParamNamesWithLoc "|" _ &(">" / "/>") {
      return {
        type: 'BlockParams',
        params: names.map(function(p) {
          return { type: 'VarHead', name: p.name, original: p.name, loc: p.loc };
        }),
      };
    }
  // Error: as |foo| {{bar}} (modifier after params)
  / "as" __ "|" names:ElementBlockParamNamesWithLoc "|" _ modStart:Pos "{{" content:$(!"}}".)*  "}}" {
      error('Invalid block parameters syntax: modifiers cannot follow parameters list', { start: modStart.start, end: location().end });
    }
  // Error: as |foo bar| followed by non-closing content (like "wat" or "y|")
  / "as" __ "|" names:ElementBlockParamNamesWithLoc "|" _ contentStart:Pos content:$([^>/ \t\n\r] [^>]*) {
      error('Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list', { start: contentStart.start, end: location().end });
    }
  // Error: as |...> (missing closing pipe, tag closes with >)
  / asStart:Pos "as" __ "|" _ ids:$([^|>{}\n]* ) (">" / "/>") {
      error('Invalid block parameters syntax: expecting "|" but the tag was closed prematurely', { start: asStart.start, end: location().end });
    }
  // Error: as |{{foo}}| or as |foo{{bar}}| (mustaches in block params)
  / "as" __ "|" _ $([^|>{}\n]*) asStart:Pos "{{" content:$(!"}}".)*  "}}" {
      error('Invalid block parameters syntax: mustaches cannot be used inside parameters list', { start: asStart.start, end: location().end });
    }
  // Error: as || (empty params)
  / asStart:Pos "as" __ "|" _ "|" {
      error('Invalid block parameters syntax: empty parameters list, expecting at least one identifier', { start: asStart.start, end: location().end });
    }
  // Error: as | followed by EOF or unclosed
  / asStart:Pos "as" __ "|" [^|]* "|"? {
      error('Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list', { start: asStart.start, end: location().end });
    }
  // Error: as| (no space between as and pipe)
  / asStart:Pos "as" "|" {
      error('Invalid block parameters syntax: expecting at least one space character between "as" and "|"', { start: asStart.start, end: location().end });
    }

ElementBlockParamNamesWithLoc
  = _ first:ElementBlockParamNameWithLoc rest:(_ p:ElementBlockParamNameWithLoc { return p; })* _ { return [first, ...rest]; }

ElementBlockParamNameWithLoc
  = InvalidBlockParamIdentifier
  / id:IDNonDigitStart { return { name: id, loc: location() }; }

// Catch invalid identifiers in block params like foo.bar, "foo", foo[bar]
InvalidBlockParamIdentifier
  = id:$([a-zA-Z_$\-:?] [^ \t\n\r|]*) &{ return /[."\[\]]/.test(id); } {
      error('Invalid block parameters syntax: invalid identifier name `' + id + '`');
    }
  / id:$("\"" [^"]*  "\"") {
      error('Invalid block parameters syntax: invalid identifier name `' + id + '`');
    }

// ============================================================================
// ATTRIBUTES
// ============================================================================

Attribute
  = UnquotedAttrValueErrorCheck
  / name:AttributeName _ "=" _ value:AttributeValue {
      return {
        type: 'AttrNode',
        name: name,
        value: value,
        loc: location(),
      };
    }
  / name:AttributeName endPos:Pos [ \t\n\r]* !"=" {
      // For valueless attributes (e.g. `disabled`), the value's loc must be
      // zero-width so that consumers (e.g. Prettier) can distinguish it from
      // an explicit empty value like `disabled=""`.
      return {
        type: 'AttrNode',
        name: name,
        value: { type: 'TextNode', chars: '', loc: { start: endPos.start, end: endPos.start } },
        loc: location(),
      };
    }

AttributeName
  = $([a-zA-Z_@:] [a-zA-Z0-9_:@.-]*)

AttributeValue
  = DoubleQuotedAttrValue
  / SingleQuotedAttrValue
  / UnquotedAttrValue

DoubleQuotedAttrValue
  = '"' parts:DoubleQuotedAttrPart* '"' {
      let loc = location();
      // Merge consecutive TextNodes (e.g. from escaped mustaches)
      let merged = mergeTextNodes(parts);
      if (merged.length === 0) {
        return { type: 'TextNode', chars: '', loc: loc };
      }
      if (merged.length === 1 && merged[0].type === 'TextNode') {
        // Use the outer loc (including quotes) for the TextNode
        merged[0].loc = loc;
        return merged[0];
      }
      // Quoted attributes with any mustache content produce ConcatStatement,
      // even if the mustache is the only part. This matches the old pipeline.
      return {
        type: 'ConcatStatement',
        parts: merged,
        loc: loc,
      };
    }

SingleQuotedAttrValue
  = "'" parts:SingleQuotedAttrPart* "'" {
      let loc = location();
      // Merge consecutive TextNodes (e.g. from escaped mustaches)
      let merged = mergeTextNodes(parts);
      if (merged.length === 0) {
        return { type: 'TextNode', chars: '', loc: loc };
      }
      if (merged.length === 1 && merged[0].type === 'TextNode') {
        // Use the outer loc (including quotes) for the TextNode
        merged[0].loc = loc;
        return merged[0];
      }
      return {
        type: 'ConcatStatement',
        parts: merged,
        loc: loc,
      };
    }

UnquotedAttrValue
  = "{{" _ "...attributes" _ "}}" {
      error("Illegal use of ...attributes");
    }
  / mustache:AttrTripleMustache { return mustache; }
  / mustache:DoubleMustache { return mustache; }
  / chars:$([^ \t\n\r"'=<>`/{}]+) {
      return { type: 'TextNode', chars: chars, loc: location() };
    }

// This rule is used to detect unquoted attributes that mix text and mustaches
UnquotedAttrValueErrorCheck
  = name:AttributeName _ "=" _ value:UnquotedAttrMixedValue {
      error("An unquoted attribute value must be a string or a mustache, preceded by whitespace or a '=' character, and followed by whitespace, a '>' character, or '/>'");
    }

// Matches mixed unquoted values like: foo{{bar}}, {{foo}}bar, foo{{bar}}baz, {{foo}}{{bar}}
UnquotedAttrMixedValue
  = UnquotedMixedPart UnquotedMixedPart+ {
      return true;
    }

UnquotedMixedPart
  = "{{" (!"}}".)*  "}}"
  / [^ \t\n\r"'=<>`/{}]+

DoubleQuotedAttrPart
  = AttrTripleMustache
  / DoubleQuotedAttrCommentError
  / AttrEscapedMustache
  / AttrMustache
  / chars:$([^"{}\\]+ / "{" [^{] / "}" [^}] / "\\" [^{])+ {
      return { type: 'TextNode', chars: chars, loc: location() };
    }

DoubleQuotedAttrCommentError
  = startPos:Pos "{{" "!--" $(!("--" "~"? "}}") .)* "--" "~"? "}}" {
      error('Using a Handlebars comment when in the `attributeValueDoubleQuoted` state is not supported', { start: startPos.start, end: location().end });
    }
  / startPos:Pos "{{" "!" $([^}] / "}" [^}])* "}}" {
      error('Using a Handlebars comment when in the `attributeValueDoubleQuoted` state is not supported', { start: startPos.start, end: location().end });
    }

SingleQuotedAttrPart
  = AttrTripleMustache
  / SingleQuotedAttrCommentError
  / AttrEscapedMustache
  / AttrMustache
  / chars:$([^'{}\\]+ / "{" [^{] / "}" [^}] / "\\" [^{])+ {
      return { type: 'TextNode', chars: chars, loc: location() };
    }

SingleQuotedAttrCommentError
  = startPos:Pos "{{" "!--" $(!("--" "~"? "}}") .)* "--" "~"? "}}" {
      error('Using a Handlebars comment when in the `attributeValueSingleQuoted` state is not supported', { start: startPos.start, end: location().end });
    }
  / startPos:Pos "{{" "!" $([^}] / "}" [^}])* "}}" {
      error('Using a Handlebars comment when in the `attributeValueSingleQuoted` state is not supported', { start: startPos.start, end: location().end });
    }

AttrTripleMustache
  = "{{{" _ expr:Expression params:Params hash:HashOpt _ "}}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      return {
        type: 'MustacheStatement',
        path: expr,
        params: params,
        hash: h,
        trusting: true,
        strip: noStrip(),
        loc: loc,
      };
    }

// Escaped mustache inside attribute values: \{{
// The backslash escapes the mustache notation, producing literal text "{{"
AttrEscapedMustache
  = "\\" braces:$("\x7B\x7B") {
      return { type: 'TextNode', chars: braces, loc: location() };
    }

AttrMustache
  = "{{" _ "...attributes" _ "}}" {
      error("Illegal use of ...attributes");
    }
  / "{{" _ expr:Expression params:Params hash:HashOpt _ "}}" {
      let loc = location();
      let h = hash || emptyHash(loc);
      return {
        type: 'MustacheStatement',
        path: expr,
        params: params,
        hash: h,
        trusting: false,
        strip: noStrip(),
        loc: loc,
      };
    }

// ============================================================================
// EXPRESSION-ONLY ENTRY POINT (used by the scanner for backward compat)
// ============================================================================

// An expression with optional params, hash, and block params.
// This is what the scanner calls for the content inside {{ ... }}.
ExpressionWithParamsAndHash
  = _ expr:Expression params:Params hash:HashOpt blockParams:BlockParamsOpt _ {
      return { expr, params, hash, blockParams };
    }

// Parse just params + hash (for when the scanner has already parsed the head).
// Not used directly by the scanner, but useful for sub-expression internals.
Params
  = ps:(_ !HashPairLookahead !BlockParamsLookahead p:Expression { return p; })* { return ps; }

HashOpt
  = _ h:Hash { return h; }
  / _ { return emptyHash(location()); }

BlockParamsOpt
  = _ bp:BlockParams { return bp; }
  / _ { return undefined; }

// A single expression: sub-expression, literal, data path, or regular path.
Expression
  = SubExpression
  / StringLiteral
  / NumberLiteral
  / BooleanLiteral
  / UndefinedLiteral
  / NullLiteral
  / DataName
  / Path

// ============================================================================
// Sub-expression: (helper param1 param2 key=value)
// ============================================================================

SubExpression
  = "(" _ expr:Expression params:SexprParams hash:HashOpt _ ")" {
      // Literals cannot be called as sub-expressions
      let literalTypes = ['StringLiteral', 'BooleanLiteral', 'UndefinedLiteral', 'NullLiteral', 'NumberLiteral'];
      if (literalTypes.indexOf(expr.type) !== -1) {
        let rawVal = expr.type === 'UndefinedLiteral' ? 'undefined' : expr.type === 'NullLiteral' ? 'null' : String(expr.value);
        let quotedVal = '"' + rawVal + '"';
        let replaceVal = expr.type === 'StringLiteral' ? '"' + rawVal + '"' : rawVal;
        let msg = expr.type + ' ' + quotedVal + ' cannot be called as a sub-expression, replace (' + replaceVal + ') with ' + replaceVal;
        // Use the literal's own location for the error
        error(msg, expr.loc);
      }
      return {
        type: 'SubExpression',
        path: expr,
        params: params,
        hash: hash,
        loc: location(),
      };
    }

SexprParams
  = ps:(_ !HashPairLookahead p:Expression { return p; })* { return ps; }

// ============================================================================
// Hash: key=value key2=value2
// ============================================================================

Hash
  = &HashPairLookahead pairs:HashPairList {
      return {
        type: 'Hash',
        pairs: pairs,
        loc: location(),
      };
    }

HashPairList
  = first:HashPair rest:(_ hp:HashPair { return hp; })* {
      return [first, ...rest];
    }

HashPair
  = key:HashKey _ "=" _ value:Expression {
      return {
        type: 'HashPair',
        key: idFromBracket(key),
        value: value,
        loc: location(),
      };
    }

HashKey
  = BracketSegment
  / IDNonDigitStart

// Lookahead to detect hash start: ID followed by optional whitespace and =
HashPairLookahead
  = (BracketSegment / IDNonDigitStart) _ "="

// ============================================================================
// Block params: as |foo bar|
// ============================================================================

BlockParamsLookahead
  = "as" __ "|"

BlockParams
  = "as" __ "|" names:BlockParamNamesWithLoc "|" {
      return names;
    }

BlockParamNamesWithLoc
  = _ first:BlockParamNameWithLoc rest:(_ p:BlockParamNameWithLoc { return p; })* _ { return [first, ...rest]; }

BlockParamNameWithLoc
  = id:IDNonDigitStart { return { name: id, loc: location() }; }

// ============================================================================
// Path expressions
// ============================================================================

DataName
  = "@" segments:PathSegments {
      return buildPath(true, segments, location());
    }
  / "@" {
      error("Expecting 'ID'");
    }

Path
  = segments:PathSegments {
      return buildPath(false, segments, location());
    }

PathSegments
  = first:FirstPathSegment rest:RestPathSegment* {
      return [first, ...rest];
    }

RestPathSegment
  = ".#" seg:PathSegmentAfterSep { return { ...seg, separator: '.#' }; }
  / "." seg:PathSegmentAfterSep { return { ...seg, separator: '.' }; }
  / "/" seg:PathSegmentAfterSep { return { ...seg, separator: '/' }; }

FirstPathSegment
  = seg:BracketSegment { return { part: idFromBracket(seg), original: seg, loc: location() }; }
  / ".." { return { part: '..', original: '..', loc: location() }; }
  / "." !IDContinueChar { return { part: '.', original: '.', loc: location() }; }
  / "this" !IDContinueChar { return { part: 'this', original: 'this', loc: location() }; }
  / id:IDNonDigitStart { return { part: id, original: id, loc: location() }; }

PathSegmentAfterSep
  = seg:BracketSegment { return { part: idFromBracket(seg), original: seg, loc: location() }; }
  / ".." { return { part: '..', original: '..', loc: location() }; }
  / "." !IDContinueChar { return { part: '.', original: '.', loc: location() }; }
  / id:IDAllowDigitStart { return { part: id, original: id, loc: location() }; }

// ============================================================================
// Literals
// ============================================================================

StringLiteral
  = '"' chars:DoubleStringChar* '"' {
      let value = chars.join('');
      return {
        type: 'StringLiteral',
        value: value,
        loc: location(),
      };
    }
  / "'" chars:SingleStringChar* "'" {
      let value = chars.join('');
      return {
        type: 'StringLiteral',
        value: value,
        loc: location(),
      };
    }

DoubleStringChar
  = '\\"' { return '"'; }
  / [^"]

SingleStringChar
  = "\\'" { return "'"; }
  / [^']

NumberLiteral
  = num:$("-"? [0-9]+ ("." [0-9]+)?) &LiteralLookahead {
      let value = Number(num);
      return {
        type: 'NumberLiteral',
        value: value,
        loc: location(),
      };
    }

BooleanLiteral
  = "true" &LiteralLookahead {
      return {
        type: 'BooleanLiteral',
        value: true,
        loc: location(),
      };
    }
  / "false" &LiteralLookahead {
      return {
        type: 'BooleanLiteral',
        value: false,
        loc: location(),
      };
    }

UndefinedLiteral
  = "undefined" &LiteralLookahead {
      return {
        type: 'UndefinedLiteral',
        value: undefined,
        loc: location(),
      };
    }

NullLiteral
  = "null" &LiteralLookahead {
      return {
        type: 'NullLiteral',
        value: null,
        loc: location(),
      };
    }

// Lookahead for literal boundaries: must be followed by whitespace, close, etc.
LiteralLookahead
  = ![a-zA-Z0-9_$\-.:/?]

// ============================================================================
// Identifiers
// ============================================================================

// An ID that must not start with a digit (first path segment).
IDNonDigitStart
  = $([a-zA-Z_$\-:?] IDContinueChar*)

// An ID that can start with a digit (after a separator).
IDAllowDigitStart
  = $(IDContinueChar+)

// Characters valid inside an ID.
// The original Handlebars lexer: [^\s!"#%-,\.\/;->@\[-\^`\{-~]+
// Allowed: $, -, 0-9, :, ?, A-Z, _, a-z, and chars > 0x7e
IDContinueChar
  = [a-zA-Z0-9_$\-:?]

// Bracket-escaped segment: [anything except unescaped ]]
BracketSegment
  = "[" chars:BracketChar* "]" { return "[" + chars.join("") + "]"; }

BracketChar
  = "\\]" { return "]"; }
  / "\\\\" { return "\\"; }
  / [^\]]

// ============================================================================
// Whitespace
// ============================================================================

// Required whitespace
__ = [ \t\n\r]+

// Optional whitespace
_ = [ \t\n\r]*

// Position marker (matches empty string, captures current location)
Pos = "" { return location(); }
