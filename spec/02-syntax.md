# 02 — Lexical Syntax and Parsing

This chapter specifies how template source text is parsed: which text is accepted, which is
rejected and with what error, and what structure each accepted template has. It states that
structure as the current parse tree (**ASTv1**), which serves as the spec's notation; the
tree itself is not part of the contract (§00-0.1 "Non-goals"). It covers the Handlebars mustache layer, the HTML tokenizer layer, how the two
are interleaved, whitespace control, character references, source locations, and every
parse-time error.

What is *not* here:

- Where template source text comes from (`<template>` tags, `precompileTemplate`,
  `template()`, `.hbs` files) — see `01-authoring-formats.md`.
- What names mean (keywords, locals, `this`, `@args`, free-variable resolution, strict vs
  loose mode), ASTv2 normalization, and errors raised during normalization (e.g. named-block
  placement rules, `...attributes` validity, reserved names) — see `03-static-semantics.md`.
- Runtime meaning of any construct — see `05-runtime-semantics.md`.

Parsing is identical in strict and loose mode; no option described in chapter 01 other than
the ones listed in §02-1.2 changes the parse tree.

---

## 1. Overview

### 1.1 The two-layer design

A template is parsed by two cooperating tokenizers:

1. **Layer 1 — the Handlebars layer** (`packages/@handlebars/parser`). A Jison-generated
   lexer/parser treats the input as a flat stream of `CONTENT` (anything that is not a
   mustache) and mustache constructs (`{{…}}`, `{{{…}}}`, `{{#…}}…{{/…}}`, comments, raw
   blocks). It knows nothing about HTML. Its output is a Handlebars AST (`Program`,
   `ContentStatement`, `MustacheStatement`, `BlockStatement`, `CommentStatement`, …), which is
   then post-processed by the whitespace-control pass (§02-5).
2. **Layer 2 — the HTML layer** (`simple-html-tokenizer` 0.5.11, driven by
   `packages/@glimmer/syntax/lib/parser/tokenizer-event-handlers.ts` and
   `packages/@glimmer/syntax/lib/parser/handlebars-node-visitors.ts`). The Handlebars AST is
   walked in source order. Each `ContentStatement`'s (post-whitespace-control) text is fed
   *incrementally* into a single, persistent, evented HTML tokenizer; its events build
   elements, attributes, text nodes and HTML comments. When the walk reaches a mustache,
   comment or block, the **current state of the HTML tokenizer** determines what that
   construct means (child content, attribute value, attribute-value part, element modifier,
   element comment, or error).

A conforming implementation MUST accept and reject the same inputs as this two-layer
process, report the same errors, and give every accepted input the structure that the ASTv1
described here records, including the quirks recorded in this chapter. It need not build
ASTv1 or expose any parse tree (§00-0.1 "Non-goals"). Implementations MAY use a different
internal architecture (e.g. a single hand-written scanner), but must then reproduce the
interleaving semantics precisely — in particular, that Handlebars tokenization
happens *first and independently of HTML context* (so `{{` inside an HTML attribute value or
an HTML comment is still a mustache at layer 1), and that whitespace control operates on
layer-1 content *before* HTML tokenization.

Entry point: `preprocess(input, options)` —
`packages/@glimmer/syntax/lib/parser/tokenizer-event-handlers.ts:746-803`.

```
source string
   │  Handlebars lexer+parser (parse / parseWithoutProcessing)
   ▼
Handlebars Program  ──►  WhitespaceControl (precompile mode only)
   │
   │  TokenizerEventHandlers.parse(): walk HBS nodes in order;
   │  ContentStatement text → HTML tokenizer.tokenizePart(); flushData()
   │  Mustache/Block/Comment → dispatch on tokenizer.state
   ▼
ASTv1 Template  ──►  AST plugins (options.plugins.ast; implementation-defined), see chapter 03
```

### 1.2 Parse options that affect the result

| Option | Effect |
|---|---|
| `mode: 'precompile'` (default) | Whitespace control is applied (§02-5); HTML character references are decoded (§02-6.3); a single leading newline directly after `<pre>`/`<textarea>` start tags is dropped (§02-6.8). |
| `mode: 'codemod'` | Layer 1 uses `parseWithoutProcessing` — **no** whitespace control at all, neither `~` stripping nor standalone stripping (strip *flags* are still recorded on nodes). Character references are **not** decoded (a `CodemodEntityParser` that never matches is used). The `<pre>`/`<textarea>` newline is kept. (`tokenizer-event-handlers.ts:735-744, 757-778`; `simple-html-tokenizer/dist/es6/index.js:70`.) |
| `parseOptions.ignoreStandalone: true` | Standalone-line stripping (§02-5.3) is disabled; `~` stripping still applies (`whitespace-control.js:9,116`; test `packages/@glimmer/syntax/test/parser-whitespace-test.ts:23-31,91-97`). Ignored in codemod mode (where nothing is stripped). |
| `parseOptions.srcName` | Recorded as `source` in layer-1 locations only; not observable in ASTv1. |
| `meta.moduleName` | Module name used in error messages (§02-9.1). Default `'an unknown module'` (`packages/@glimmer/syntax/lib/source/source.ts:21`). |
| `locals` | Copied verbatim into `Template.blockParams` (`tokenizer-event-handlers.ts:787-790`). Has no effect on parsing. |

*Note:* `babel-plugin-ember-template-compilation` with `targetFormat: 'hbs'` parses in codemod
mode and re-prints (`babel-plugin-ember-template-compilation/src/plugin.ts:544-545`); the
printed text is later parsed again in precompile mode. See §02-10.

### 1.3 Input normalization

- The input is a JavaScript string; positions are measured in UTF-16 code units.
- Layer 1 treats `U+0000` specially: `CONTENT` is defined as `[^\x00]`, so a NUL character
  anywhere outside a mustache produces
  `Lexical error on line N. Unrecognized text.` (`src/handlebars.l:31,44`;
  `lib/parser.js:1686-1697`). Implementations MUST reject NUL in content with a lexical error.
- Layer 2 replaces every `\r\n` and every lone `\r` with `\n` in each chunk of content it
  tokenizes (`preprocessInput`, `simple-html-tokenizer/dist/es6/index.js:38,45-47,650-651`).
  Consequently **every `TextNode.chars`, attribute text, and HTML comment value contains only
  `\n` line terminators**, in both modes. Mustache string literals are *not* normalized
  (they never pass through layer 2).

---

## 2. Layer 1 — the Handlebars lexer

Source of truth: `packages/@handlebars/parser/src/handlebars.l` (compiled to
`lib/parser.js`, rules listed at `lib/parser.js:1957-2020`).

### 2.1 Matching discipline

The lexer is a Jison lexer with **first-match (not longest-match) semantics**: in each lexer
state, rules are tried in the order listed, and the first rule whose regular expression matches
at the current position wins. Jison additionally appends a word boundary `\b` to rules whose
pattern ends in a word character; this is observable for the `{{else` rule
(`lib/parser.js:1977`: `/^(?:\{\{(~)?\s*else\b)/`), so `{{elsewhere}}` is an ordinary
mustache while `{{else-thing}}` lexes as `{{else` + `-thing` (an else-chain opening a block
named `-thing`).

Lexer start conditions (states): `INITIAL` (content), `mu` (inside a mustache), `emu`
(content after an escaped mustache), `com` (inside a `{{!-- --}}` comment), `raw` (inside a
raw block), `escl` (inside a `[...]` literal segment). All except `INITIAL` are exclusive.

### 2.2 Content and mustache escaping

In `INITIAL`:

```
R0  CONTENT-before-mustache  [^\x00]*? (?= "{{")
R1  CONTENT                  [^\x00]+
```

R0 (`handlebars.l:31-42`) takes the text up to (not including) the next `{{` and then:

1. If the text ends with **two** backslashes `\\`: one backslash is removed from the end of the
   token, the lexer enters `mu`; i.e. `\\{{x}}` is a literal backslash followed by a real
   mustache.
2. Else if the text ends with **one** backslash: the backslash is removed, and the lexer
   enters `emu` (escaped mustache).
3. Else it enters `mu`.

A `CONTENT` token is emitted only if the (possibly trimmed) text is non-empty.

Rule (1) only inspects the last two characters, so `\\\{{x}}` (three backslashes) is treated as
case 1: two literal backslashes then a real mustache. In general *k* ≥ 2 backslashes before
`{{` yield *k−1* literal backslashes followed by a real mustache; exactly one backslash
escapes the mustache. Backslashes not immediately before `{{` are never special.
Tests: `packages/@glimmer/syntax/test/parser-escape-test.ts:9-129`.

In `emu` (`handlebars.l:47-50`):

```
CONTENT  [^\x00]{2,}? (?= "{{" | "\{{" | "\\{{" | EOF )
```

i.e. the escaped text begins with the literal `{{` and extends (at least two characters) up to
the next `{{`, `\{{`, `\\{{` or end of input; then the lexer returns to `INITIAL`. The
escaped `{{…}}` is therefore **not** tokenized as a mustache even if it is well-formed;
there is no requirement that it be closed (`\{{ unclosed` → text `{{ unclosed`).

Consequences that implementations MUST reproduce:

- `prefix\{{foo}} suffix` yields two `ContentStatement`s, `"prefix"` and
  `"{{foo}} suffix"`, which become **two separate `TextNode`s** in element/template content
  (`parser-escape-test.ts:19-21`) but a **single merged text part** inside an attribute value
  (`parser-escape-test.ts:77-83`; see §02-6.1).
- `\{{foo}} text \{{bar}} done {{baz}}` → text `"{{foo}} text "`, text `"{{bar}} done "`,
  mustache `baz` (`parser-escape-test.ts:27-32`).
- Escaping works identically inside HTML content, inside attribute values, and in codemod mode
  (the backslash is consumed by the lexer in all modes).

### 2.3 Tokens inside a mustache (`mu` state)

Rules in priority order (`handlebars.l:73-142`, `lib/parser.js:1964-2006`). `~?` denotes the
optional whitespace-control tilde; `\s` is the JavaScript regex whitespace class.

| # | Pattern | Token | Notes |
|---|---|---|---|
| 1 | `(` | `OPEN_SEXPR` | |
| 2 | `)` | `CLOSE_SEXPR` | |
| 3 | `[` | — | In Glimmer, `syntax.square` is always `'string'`; the `[` is pushed back and the lexer enters `escl` (§02-2.5). `OPEN_ARRAY` is never produced. |
| 4 | `]` | `CLOSE_ARRAY` | Only reachable as a stray `]`; always a parse error in Glimmer. |
| 5 | `{{{{` | `OPEN_RAW_BLOCK` | |
| 6 | `}}}}` | `CLOSE_RAW_BLOCK` | pops `mu`, enters `raw` |
| 7 | `{{~?>` | `OPEN_PARTIAL` | |
| 8 | `{{~?#>` | `OPEN_PARTIAL_BLOCK` | |
| 9 | `{{~?#*?` | `OPEN_BLOCK` | `*` marks a decorator block |
| 10 | `{{~?/` | `OPEN_ENDBLOCK` | |
| 11 | `{{~?^\s*~?}}` | `INVERSE` | pops state |
| 12 | `{{~?\s*else\s*~?}}` | `INVERSE` | pops state |
| 13 | `{{~?^` | `OPEN_INVERSE` | |
| 14 | `{{~?\s*else\b` | `OPEN_INVERSE_CHAIN` | |
| 15 | `{{~?{` | `OPEN_UNESCAPED` | |
| 16 | `{{~?&` | `OPEN` | `&` means unescaped |
| 17 | `{{~?!--` | — | pushed back; enters `com` |
| 18 | `{{~?![\s\S]*?}}` | `COMMENT` | short comment, ends at first `}}` |
| 19 | `{{~?*?` | `OPEN` | `*` marks a decorator |
| 20 | `=` | `EQUALS` | |
| 21 | `..` | `ID` | |
| 22 | `.` followed by `[=~}\s/.)\]\|]` | `ID` | a bare `.` segment |
| 23 | `.#` | `PRIVATE_SEP` | |
| 24 | `/` or `.` | `SEP` | |
| 25 | `\s+` | — | skipped (includes newlines) |
| 26 | `}~?}}` | `CLOSE_UNESCAPED` | pops state |
| 27 | `~?}}` | `CLOSE` | pops state |
| 28 | `"` (`\\"` \| `[^"]`)* `"` | `STRING` | value = inner text with `\"` → `"` |
| 29 | `'` (`\\'` \| `[^']`)* `'` | `STRING` | value = inner text with `\'` → `'` |
| 30 | `@` | `DATA` | |
| 31–34 | `true`, `false`, `undefined`, `null`, each followed by `[~}\s)\]]` | `BOOLEAN` / `UNDEFINED` / `NULL` | |
| 35 | `-?[0-9]+(\.[0-9]+)?` followed by `[~}\s)\]]` | `NUMBER` | |
| 36 | `as\s+\|` | `OPEN_BLOCK_PARAMS` | |
| 37 | `\|` | `CLOSE_BLOCK_PARAMS` | |
| 38 | ID (§02-2.4) | `ID` | |
| 39 | any single character | `INVALID` | always a parse error |
| 40 | end of input | `EOF` | |

Notes:

- Mustache openers are only recognized when the lexer is in `mu`, which it enters exactly at a
  `{{` found by R0. The opener rules are all anchored at that `{{`. Consequently whitespace is
  **not** permitted between `{{` and a sigil: `{{ #foo}}` and `{{#~ foo}}` are parse errors
  (the `#`/`~` become `INVALID`), but whitespace is permitted after the sigil (`{{# foo }}`),
  and before/after `else` (`{{ else }}`, `{{~ else if x}}`).
- The tilde must be *immediately* adjacent to the braces: `{{~foo}}`, `{{foo~}}`,
  `{{~{foo}~}}`, `{{~#if}}`, `{{/if~}}`. `{{foo ~ }}` is a parse error (`~` then space → the
  `~` is `INVALID`), while `{{foo ~}}` is fine (`~}}` is `CLOSE`). In `{{{foo}}}` the close
  tilde goes between the braces: `}~}}`; `{{{foo ~}}}` is a parse error.
- There is no escape mechanism in string literals other than an escaped quote of the same kind:
  `"a\nb"` contains a backslash and `n`; `"a\\"` contains two backslashes (the lexer regex
  `"(\\["]|[^"])*"` matches it and only `\"` is rewritten). A string literal may contain
  newlines, `}}`, `{{` and the other quote character.
- `STRING` tokens preserve the raw inner text (after quote un-escaping); the ASTv1
  `StringLiteral.value` is that text.

### 2.4 Identifiers

```
ID  = IDChar+ , followed by (lookahead) one of  = ~ } whitespace / . ) ] |
IDChar = any character except:
         whitespace ! " # % & ' ( ) * + , . / ; < = > @ [ \ ] ^ ` { | } ~
```

(`handlebars.l:18-27`.) In particular, IDs MAY contain `$`, `-`, `:`, `?`, `_`, digits, and
any non-ASCII character, and MAY begin with a digit or `-`. Because `NUMBER` and the keyword
literals are tried before ID and require their own lookahead, the following hold:

| Source | Result |
|---|---|
| `{{foo-bar}}`, `{{foo?}}`, `{{foo:bar}}`, `{{foo$}}`, `{{foo-}}` | path, single segment |
| `{{foo 1}}`, `{{foo -1.5}}`, `{{foo 01}}` | `NumberLiteral` 1, −1.5, 1 |
| `{{foo 1e5}}`, `{{foo 1a}}` | **path** `1e5`, `1a` (digit-initial identifier) |
| `{{foo -}}` | path `-` |
| `{{foo .5}}` | parse error |
| `{{foo 1.}}` | error `'.' is not a supported path…` (NUMBER `1` fails its lookahead, so `1` is an ID; the `.` before `}` is lexed as a separate bare-`.` expression) — see §02-4.2 |
| `{{true}}`, `{{foo true}}` | `BooleanLiteral` |
| `{{truex}}`, `{{true.x}}`, `{{null.x}}` | path (head `truex` / `true` / `null`) |
| `{{foo.0}}` | parse error (`0` lexes as `NUMBER` because `}` follows) |
| `{{foo.0.bar}}` | path `foo`,`0`,`bar` (`0` followed by `.` is an ID) |
| `{{foo.[0]}}` | path `foo`,`0` |

The ID lookahead set means an ID immediately followed by a character outside
`= ~ } ws / . ) ] |` does not lex as ID; e.g. `{{foo[bar]}}` and `{{foo(bar)}}` are parse
errors.

### 2.5 Literal (bracketed) segments

In `escl` (`handlebars.l:136-140`): `[` ( `\]` | any char but `]` )* `]` is an `ID` token
whose text has `\\` → `\` and `\]` → `]` applied. The helper `id()` then strips the surrounding
brackets (`lib/helpers.js:25-31`). The segment is marked *literal* (its `original` differs
from its `part`), which suppresses the special meaning of `this`, `.` and `..`
(`lib/helpers.js:62-64`).

A literal segment may contain any characters except an unescaped `]`, including spaces, dots
and `/`. Examples: `{{[foo bar].baz}}` → head `foo bar`, tail `baz`; `{{foo.[bar.baz]}}` →
tail `["bar.baz"]`; `{{foo.[a\]b]}}` → tail `["a]b"]`; `{{foo.[]}}` → tail `[""]`;
`{{foo [a b]}}` → a *param* path named `a b`; `{{foo [a b]=1}}` → a hash key `a b`.

*Note:* upstream Handlebars can alternatively lex `[...]` as array literals
(`syntax.square: 'node'`) and `(a=b)` / `{{a=b}}` as hash literals. Glimmer never enables
array literals, and hash-literal nodes are produced but not supported (§02-3.8).

### 2.6 Comments

```
ShortComment = "{{" "~"? "!" <any chars, shortest match> "}}"          (rule 18)
LongComment  = "{{" "~"? "!--" <any chars, shortest match> "--" "~"? "}}" (com state)
```

- The short form ends at the **first** `}}`: `{{! {{x}} }}` is the comment ` {{x` followed by
  content ` }}`.
- The long form ends at the first `--}}` or `--~}}`; it may contain `}}` and mustaches.
- Comment value (`stripComment`, `lib/helpers.js:40-42`): remove the leading
  `/^\{\{~?!-?-?/` and trailing `/-?-?~?\}\}$/`. Hence `{{!-foo-}}` has value `foo`,
  `{{!--}}` has value `""`, and a short comment ending in `--}}` also loses the dashes.
- Strip flags: `open` = the third character is `~`; `close` = the third-from-last character is
  `~` (`lib/helpers.js:33-38`).

### 2.7 Raw blocks

```
RawBlock = "{{{{" helperName expr* hash? "}}}}" RawContent* "{{{{/" ID "}}}}"
```

After `}}}}` the lexer is in `raw` (`handlebars.l:53-66`):

- `{{{{` not followed by `/` → a `CONTENT` token `{{{{` and a nested `raw` state is pushed.
- `{{{{/` ID `}}}}` (where the ID is followed by one of `= } ws / .` inside the closer) pops one
  `raw` level; if still inside a nested raw level it is `CONTENT`, otherwise it is
  `END_RAW_BLOCK` with the name extracted.
- Any other text up to the next `{{{{` is `CONTENT`.

The open and close names are compared as strings; a mismatch throws
`<open> doesn't match <close> - L:C` (§02-9.2).

In ASTv1, a raw block becomes an **ordinary `BlockStatement`** whose default block contains
the raw text as content, with no inverse, empty strip flags, and no block params. Critically,
the raw text is *raw only with respect to Handlebars*: it is still fed through the HTML
tokenizer, so `{{{{raw}}}}<div>{{{{/raw}}}}` fails with `Unclosed element \`div\``, while
`{{{{raw}}}} {{x}} {{{{/raw}}}}` yields a single `TextNode` `" {{x}} "`. Nested raw openers and
closers produce *separate* `ContentStatement`s and therefore separate `TextNode`s. Standalone
whitespace stripping (§02-5.3) applies to raw blocks. There is no syntactic trace in ASTv1
that a block was raw. **[Legacy]**

---

## 3. Layer 1 — the Handlebars grammar

Source: `packages/@handlebars/parser/src/handlebars.yy`, AST construction helpers in
`lib/helpers.js`. Terminals are the tokens of §02-2. `X*` = zero or more, `X+` = one or more,
`X?` = optional.

### 3.1 Grammar

```ebnf
root            ::= program EOF
program         ::= statement*
statement       ::= mustache | block | rawBlock | partial | partialBlock
                  | CONTENT | COMMENT

mustache        ::= OPEN hash CLOSE                          (* hash-literal mustache; unsupported, §3.8 *)
                  | OPEN expr expr* hash? CLOSE
                  | OPEN_UNESCAPED expr expr* hash? CLOSE_UNESCAPED

block           ::= openBlock program inverseChain? closeBlock
                  | openInverse program inverseAndProgram? closeBlock
openBlock       ::= OPEN_BLOCK helperName expr* hash? blockParams? CLOSE
openInverse     ::= OPEN_INVERSE helperName expr* hash? blockParams? CLOSE
openInverseChain::= OPEN_INVERSE_CHAIN helperName expr* hash? blockParams? CLOSE
inverseAndProgram ::= INVERSE program
inverseChain    ::= openInverseChain program inverseChain?
                  | inverseAndProgram
closeBlock      ::= OPEN_ENDBLOCK helperName CLOSE

rawBlock        ::= OPEN_RAW_BLOCK helperName expr* hash? CLOSE_RAW_BLOCK CONTENT* END_RAW_BLOCK

partial         ::= OPEN_PARTIAL expr expr* hash? CLOSE                     (* rejected *)
partialBlock    ::= OPEN_PARTIAL_BLOCK expr expr* hash? CLOSE program closeBlock (* rejected *)

expr            ::= helperName | sexpr | arrayLiteral
sexpr           ::= OPEN_SEXPR hash CLOSE_SEXPR                  (* hash literal; unsupported *)
                  | OPEN_SEXPR expr expr* hash? CLOSE_SEXPR
arrayLiteral    ::= OPEN_ARRAY expr* CLOSE_ARRAY                 (* unreachable in Glimmer *)

hash            ::= hashSegment+
hashSegment     ::= ID EQUALS expr
blockParams     ::= OPEN_BLOCK_PARAMS ID+ CLOSE_BLOCK_PARAMS

helperName      ::= path | dataName | STRING | NUMBER | BOOLEAN | UNDEFINED | NULL
dataName        ::= DATA pathSegments
path            ::= (sexpr | arrayLiteral) sep pathSegments       (* sub-expression-rooted; unsupported *)
                  | pathSegments
pathSegments    ::= ID ( sep ID )*
sep             ::= SEP | PRIVATE_SEP
```

Observations that follow directly from the grammar:

- Positional params MUST precede all hash pairs (`{{foo a=1 b}}` → parse error
  `Expecting 'EQUALS', got 'CLOSE'`).
- Hash keys are single `ID` tokens (possibly bracketed). `@bar=`, `bar.baz=`, `'bar'=` are parse
  errors. Whitespace around `=` is allowed (`{{foo bar = baz}}`). Duplicate keys are accepted by
  the parser and preserved in order in `Hash.pairs`.
- A block's close may be only `{{/` helperName `}}` — no params (`{{/foo bar}}` is an error).
  The close's `original` text must equal the open's path `original` string exactly
  (`validateClose`, `lib/helpers.js:3-11`): `{{#foo.bar}}{{/foo}}` → `foo.bar doesn't match foo`.
  Because comparison is on `original` (which drops brackets, §02-4), `{{#[a]}}{{/a}}` matches.
- `{{else}}`/`{{^}}` (the `INVERSE` token) may appear at most once per block level, after any
  number of `{{else …}}` chain links, and only inside a block; `{{else}}` at top level and a
  second `{{else}}` are parse errors.
- Block params are only allowed on block openers (`openBlock`, `openInverse`,
  `openInverseChain`), never on `{{foo as |x|}}`, never on the plain `{{else as |x|}}` (only on
  `{{else helper … as |x|}}`). `as` must be followed by at least one whitespace character before
  `|` (`as\s+\|`); `{{#foo as|a|}}` is a parse error. `||` (empty list) and non-ID names
  (`|a.b|`) are parse errors. Whitespace, including newlines, may separate names; the closing
  `|` may be preceded by whitespace (`as | a b |`).
- The helperName of a block/mustache may be a literal at the grammar level; Glimmer rejects or
  special-cases this (§02-3.7).
- Parse errors (from the grammar or the lexer) are thrown as plain `Error`s with Jison's message
  format (§02-9.2), not as Glimmer syntax errors.

### 3.2 Mustaches

`{{ expr expr* hash? }}` is an *escaped* mustache (`trusting: false`); `{{{ … }}}` and
`{{& … }}` are *trusting* (`trusting: true`) (`prepareMustache`, `lib/helpers.js:97-112`;
escapeFlag is the 4th char, or the 3rd when there is no tilde — i.e. the char right after
`{{` or `{{~`). `{{&…}}}` is not valid (`{{&` closes with `}}`).

The first `expr` is the callee/value (`path`), the rest are positional `params`, then an optional
`hash`.

### 3.3 Blocks and `else` chains

```
{{#name params hash as |p1 p2|}} DEFAULT {{else}} INVERSE {{/name}}
{{#name …}} DEFAULT {{^}} INVERSE {{/name}}               (* {{^}} ≡ {{else}} *)
{{#name …}} D {{else other a b as |q|}} E {{else}} F {{/name}}
```

An `{{else X …}}` link is sugar: the block's inverse becomes a synthetic program containing
exactly one `BlockStatement` for `X …` whose default is `E` and whose own inverse is the rest of
the chain; that synthetic program has `chained: true` (`handlebars.yy:70-79`). Chains nest
arbitrarily (`{{else if b}}…{{else if c}}…{{else}}…`). All links share the outer block's single
`{{/name}}` closer; the close name is validated only against the outermost opener
(`prepareBlock` is invoked for links with `close` = the rest of the chain, which has no
`path`), so `{{#if a}}x{{else unless b}}y{{/if}}` is valid, and `{{#if a}}…{{else if b}}…{{/unless}}`
fails with `if doesn't match unless`. Any helper name may follow `else` (`{{else each b as |c|}}`,
`{{else-thing}}`); which ones are *meaningful* is decided in chapter 03.

The closing strip flags of the outer block are copied onto the innermost chained block's
`closeStrip` (`lib/helpers.js:154-156`).

**Inverse sections** `{{^name}}…{{/name}}` parse at layer 1 as a block whose program and
inverse are swapped: the body becomes the `inverse`, and the `{{else}}` part, if any, becomes
the `program`. Glimmer handles the two forms differently:

- **Without `{{else}}`** there is no program, and the construct is a syntax error:
  ``Inverse sections (`{{^foo}}...{{/foo}}`) are not supported. Use `{{#unless foo}}...{{/unless}}` instead``
  (span: the whole block; `handlebars-node-visitors.ts:133-140`; test
  `parser-error-test.ts:110-119`).
- **With `{{else}}`**, `{{^foo}}a{{else}}b{{/foo}}` is accepted and means
  `{{#foo}}b{{else}}a{{/foo}}` (untested).

`{{^}}` *inside* a block is fully supported as a synonym for `{{else}}`.

### 3.4 Sub-expressions

`( expr expr* hash? )` — a call used as a value. The callee may itself be a sub-expression
(`((foo) bar)`), a path, or (grammatically) a literal. Sub-expressions may be nested to any
depth and may span lines. `()` is a parse error.

### 3.5 Literals

| Token | ASTv1 node | `value` |
|---|---|---|
| `STRING` | `StringLiteral` | inner text, quotes un-escaped |
| `NUMBER` | `NumberLiteral` | `Number(text)` (so `01` → 1, `-0` → −0) |
| `true` / `false` | `BooleanLiteral` | `true` / `false` |
| `undefined` | `UndefinedLiteral` | `undefined` |
| `null` | `NullLiteral` | `null` |

Literals may appear as params, hash values, and as the entire content of a mustache
(`{{"foo"}}`, `{{1}}`, `{{null}}`, `{{undefined}}` — tests
`packages/@glimmer/syntax/test/parser-node-test.ts:891-913`).

### 3.6 Paths

See §02-4.

### 3.7 Literal callees

`acceptCallNodes` (`handlebars-node-visitors.ts:659-733`) is used for blocks, sub-expressions,
modifiers and non-literal mustaches:

- A **mustache whose path is a literal** (`{{"foo"}}`, `{{1 a=b}}`) is special-cased
  (`handlebars-node-visitors.ts:247-255`): the literal becomes the mustache `path`, and any
  params and hash in the source are **silently discarded** (`{{"foo" bar}}` ≡ `{{"foo"}}`).
  See Open questions.
- A **block or sub-expression whose callee is a literal** is a syntax error:
  `` `${Type} "${text}" cannot be called as a sub-expression, replace (${value}) with ${value}` ``
  where `Type` is the literal node type, `text` is the string value for strings and the printed
  value otherwise, and `value` is `"…"`-quoted for strings, `true`/`false`, `null`, `undefined`,
  or `Number.prototype.toString()` of the number. The error span is the literal
  (`handlebars-node-visitors.ts:693-716`; tests `parser-node-test.ts:1027-1100`). E.g.
  `{{("foo-baz")}}` →
  `StringLiteral "foo-baz" cannot be called as a sub-expression, replace ("foo-baz") with "foo-baz"`;
  `{{#"foo"}}{{/foo}}` produces the same message form.
- A **modifier whose path is a literal** is a syntax error (§02-6.9).

### 3.8 Constructs rejected by Glimmer

| Construct | Example | Error (Glimmer syntax error, span = whole construct) |
|---|---|---|
| Partial | `{{> foo}}` | `Handlebars partials are not supported` |
| Partial block | `{{#> foo}}{{/foo}}` | `Handlebars partial blocks are not supported` |
| Decorator | `{{* foo}}`, `{{*foo}}` | `Handlebars decorators are not supported` |
| Decorator block | `{{#* foo}}{{/foo}}` | `Handlebars decorator blocks are not supported` |
| Decorator block with inverse | `{{#* foo}}{{^}}{{/foo}}` | layer-1 `Unexpected inverse block on decorator` |
| Inverse section without `{{else}}` | `{{^foo}}x{{/foo}}` | ``Inverse sections (`{{^foo}}...{{/foo}}`) are not supported. Use `{{#unless foo}}...{{/unless}}` instead`` (§02-3.3) |
| Hash literal, anywhere an expression can appear | `{{foo=bar}}`, `{{(foo=bar)}}`, `{{foo =bar}}`, `{{foo (a=b)}}`, `{{foo x=(a=b)}}` | ``Hash literals are not supported. Use named arguments (`{{helper foo=bar}}`) or the `hash` helper (`(hash foo=bar)`) instead`` (span: the hash literal, e.g. `(a=b)`) |
| Sub-expression-rooted path | `{{(foo).bar}}`, `{{foo (bar).baz}}` | ``A path cannot start with a sub-expression. Use the `get` helper (`(get (foo) "bar")`) instead`` (span: the path) |

(`handlebars-node-visitors.ts:417-443` for the first four rows, `:133-140` for inverse
sections, `:450-455` and `:690-691` for hash literals, `:461-466` for sub-expression-rooted
paths; tests `parser-node-test.ts:915-961`, `parser-error-test.ts:110-134`.) A conforming
implementation MUST reject all of these with a syntax error.

---

## 4. Path expressions

### 4.1 Layer-1 path construction

`preparePath(data, sexpr, parts, loc)` (`lib/helpers.js:44-95`) builds a Handlebars path from
the segment list. For each segment it appends `separator + part` to `original`, where
`part` is the segment text with brackets removed and `separator` is `.`, `/` or `.#` (none for
the first). Then:

- A non-literal segment equal to `..`, `.` or `this`:
  - if any ordinary segment has already been collected, throw
    `Invalid path: <original-so-far> - L:C` (layer-1 `Exception`; e.g. `{{foo.this}}`,
    `{{foo/..}}`, `{{foo/./bar}}`);
  - otherwise it is dropped (`..` increments `depth`).
- Otherwise the segment is collected; a segment introduced by `.#` is collected as `#part`.
- `original` starts with `@` for data paths.

So `this.foo` has parts `[foo]` and original `this.foo`; `this/foo` has parts `[foo]` and
original `this/foo`; `../foo` has parts `[foo]` and original `../foo`; `[this]` has parts
`[this]` and original `this`.

### 4.2 Conversion to ASTv1 (`PathExpression` visitor)

`handlebars-node-visitors.ts:457-562`. Given the layer-1 `original` and `parts`:

1. If `original` contains `/`:
   1. if it starts with `./` → error `Using "./" is not supported in Glimmer and unnecessary`;
   2. if it starts with `../` → error `Changing context using "../" is not supported in Glimmer`;
   3. if it contains `.` anywhere → error
      `Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths`;
   4. otherwise the whole path becomes a **single segment** `parts.join('/')`. **[Legacy]**
2. Else if `original === '.'` → error
   `'.' is not a supported path in Glimmer; check for a path with a trailing '.'`.
3. Else segments = `parts`.
4. The head is determined:
   - If `original` matches `/^this(?:\..+)?$/`: head is `ThisHead` and **all** segments are
     the tail (layer 1 already dropped the `this`).
   - Else if the path is a data path: the first segment `s` is removed and head is
     `AtHead { name: '@' + s }`; if there is none, error
     `Attempted to parse a path expression, but it was not valid. Paths beginning with @ must start with a-z.`
   - Else the first segment `s` is removed and head is `VarHead { name: s }`; if none, error
     `Attempted to parse a path expression, but it was not valid. Paths must start with a-z or A-Z.`
5. The remaining segments are `tail` (an array of strings).

All errors in this section have the path's span as location (tests
`packages/@glimmer-workspace/integration-tests/test/syntax/general-errors-test.ts:12-58`,
`parser-node-test.ts:1012-1025`).

Resulting behavior table (normative):

| Source | head | tail | `original` (§02-7) |
|---|---|---|---|
| `foo` | Var `foo` | `[]` | `foo` |
| `foo.bar.baz` | Var `foo` | `[bar, baz]` | `foo.bar.baz` |
| `this` | This | `[]` | `this` |
| `this.foo` | This | `[foo]` | `this.foo` |
| `@foo.bar` | At `@foo` | `[bar]` | `@foo.bar` |
| `foo/bar` | Var `foo/bar` | `[]` | `foo/bar` **[Legacy]** |
| `@foo/bar` | At `@foo/bar` | `[]` | `@foo/bar` |
| `foo/[bar]` | Var `foo/bar` | `[]` | `foo/bar` |
| `this/foo` | **Var `foo`** | `[]` | `foo` (see Open questions) |
| `[this]` | This | `[this]` | `this.this` |
| `foo.[this]` | Var `foo` | `[this]` | `foo.this` |
| `[foo bar].baz` | Var `foo bar` | `[baz]` | `foo bar.baz` |
| `[foo.bar]` | Var `foo.bar` | `[]` | `foo.bar` |
| `foo.[bar.baz]` | Var `foo` | `[bar.baz]` | `foo.bar.baz` |
| `foo.#bar` | Var `foo` | `[#bar]` | `foo.#bar` |
| `this.#foo` | This | `[#foo]` | `this.#foo` |
| `foo..bar` | error "Paths must start with a-z or A-Z." (the `..` segment is re-parsed as a separate expression) | | |
| `foo.` / `foo. bar` | error `'.' is not a supported path…` | | |
| `../foo`, `./foo`, `foo.bar/baz`, `this.foo/bar`, `@../foo` | errors as above | | |
| `this.@foo`, `@`, `@0`, `@@`, `@=`, `@!` | parse error (tests `packages/@glimmer/syntax/test/parser-error-test.ts:50-83`) | | |
| `@1a` | At `@1a` | `[]` | `@1a` |
| `foo.this`, `foo/..` | layer-1 `Invalid path: …` | | |

*Note:* despite the error wording ("must start with a-z"), no character-class restriction is
applied to heads beyond the ID rules of §02-2.4; `{{1a}}`, `{{@1a}}`, `{{-}}` all parse. Which
names are *valid references* is chapter 03's concern.

*Note:* `tail` segments are plain strings, so bracketed segments are indistinguishable from
plain ones after parsing (`foo.[bar]` ≡ `foo.bar`), and a segment containing `.` is
representable in `tail` but not in `original`.

---

## 5. Whitespace control

Applied only in precompile mode, by `WhitespaceControl`
(`packages/@handlebars/parser/lib/whitespace-control.js`) on the layer-1 AST, *before* any HTML
tokenization. It edits `ContentStatement.value` (keeping `original`). Because layer 1 does not
know about HTML, all rules below apply to raw template text regardless of HTML context
(e.g. the text `<div>\n  ` is a single content statement).

### 5.1 Strip flags

Every mustache, block opener/`else`/closer, and comment carries `{open, close}` flags from its
tildes (§02-2.3, §02-2.6). In ASTv1 they are exposed as `MustacheStatement.strip`,
`BlockStatement.openStrip` / `inverseStrip` / `closeStrip`. Missing flags default to
`{open:false, close:false}`. Raw blocks have empty strip objects (no tilde syntax).

### 5.2 Tilde (`~`) stripping

Definitions, for a statement list `body` and an index `i`:

- `omitRight(body, i, multiple)`: let `c = body[i+1]` (or `body[0]` if `i` is null). If `c` is a
  `ContentStatement` (and, when not `multiple`, not already `rightStripped`), remove from the
  start of `c.value` the match of `/^\s+/` if `multiple` else `/^[ \t]*\r?\n?/`; set
  `rightStripped` if anything changed.
- `omitLeft(body, i, multiple)`: symmetric on `body[i-1]` (or the last element if `i` is null),
  removing `/\s+$/` if `multiple` else `/[ \t]+$/`; returns whether anything changed.

(`whitespace-control.js:180-216`.) Tilde stripping uses `multiple = true`: **all** whitespace
(`\s`, including newlines) in the adjacent content statement is removed, but it never reaches
past a non-content node.

- Mustache / comment: `open` → omitLeft on the preceding sibling; `close` → omitRight on the
  following sibling (`whitespace-control.js:29-34`).
- Block `{{~#x}}` (openStrip.open): strips the content before the block.
  `{{#x~}}` (openStrip.close): strips the start of the first program's body.
- `{{~else}}` (inverseStrip.open): strips the end of the default program.
  `{{else~}}` (inverseStrip.close): strips the start of the (first) inverse program.
- `{{~/x}}` (closeStrip.open): strips the end of the last inverse in the chain if there is an
  inverse, else the end of the program. `{{/x~}}` (closeStrip.close): strips content after the
  block.

(`whitespace-control.js:64-128`; tests `parser-node-test.ts:532-684`,
`packages/@glimmer/syntax/test/loc-node-test.ts:729-782`.)

If stripping empties a `ContentStatement`, it produces **no** `TextNode` (the HTML tokenizer
never enters `data` for an empty chunk; `parser-whitespace-test.ts:9-13`).

### 5.3 Standalone lines

A statement is *standalone* when it is the only non-whitespace thing on its line. Standalone
nodes have the whitespace of their line removed. Only content statements are ever modified.

For a statement at index `i` of `body`, with `isRoot` = "this is the outermost template program":

```
isPrevWhitespace(body, i, isRoot):
  prev = body[i-1]; sibling = body[i-2]
  if prev is absent: return isRoot
  if prev is ContentStatement:
     regex = (sibling exists or not isRoot) ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/
     return regex.test(prev.original)
  return false            (* any non-content node *)

isNextWhitespace(body, i, isRoot):
  next = body[i+1]; sibling = body[i+2]
  if next is absent: return isRoot
  if next is ContentStatement:
     regex = (sibling exists or not isRoot) ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/
     return regex.test(next.original)
  return false
```

(`whitespace-control.js:147-178`.) When called with `i` undefined, `isPrevWhitespace` looks at
the end of the list and `isNextWhitespace` at the start. Note the tests use `original`, so
earlier tilde stripping does not affect standalone detection.

Candidates:

- **Comments** (`{{! }}`) and partials are *inline-standalone* candidates. If both
  `isPrevWhitespace` and `isNextWhitespace` hold, `omitRight(body, i)` then `omitLeft(body, i)`
  (single-line mode: remove trailing `[ \t]*` of the previous content and leading
  `[ \t]*\r?\n?` of the next).
- **Mustaches** are never standalone.
- **Blocks** report `openStandalone` = the block's first program starts with whitespace up to a
  newline (`isNextWhitespace(program.body)`), and `closeStandalone` = the last program before the
  closer ends with newline+whitespace (`isPrevWhitespace((firstInverse || program).body)`)
  (`whitespace-control.js:86-94`). In the parent:
  - if `openStandalone && isPrevWhitespace(parent, i)`: omitRight on the start of the block's
    first program (`program || inverse`), and omitLeft on the preceding sibling;
  - if `closeStandalone && isNextWhitespace(parent, i)`: omitRight on the following sibling,
    and omitLeft on the end of the block's last program (`inverse || program`).
- **`{{else}}`**: inside a block with an inverse, if the default program ends with
  newline+whitespace and the first inverse starts with whitespace+newline, the else line is
  standalone: omitLeft on the end of the default program, omitRight on the start of the
  inverse (`whitespace-control.js:114-122`).

The processing order within one program is: for each statement in order, first recurse into it
(blocks process their own programs, including `~` flags internal to the block), then apply the
statement's own `close` then `open` tilde flags, then inline-standalone, open-standalone, and
close-standalone stripping (`whitespace-control.js:15-58`).

Worked examples (precompile mode; tests `parser-whitespace-test.ts`, `parser-node-test.ts:686-722`):

| Source | Result |
|---|---|
| `{{#each}}\n  <li> foo </li>\n{{/each}}` | program body: `"  "`, `<li>`, `"\n"` |
| same with `ignoreStandalone` | program body: `"\n  "`, `<li>`, `"\n"` |
| ` {{#comment}} \nfoo\n {{/comment}} ` | top-level: only the block; program: `"foo\n"` |
| ` {{#comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} ` | program `"foo\n"`, inverse `"  bar \n"` |
| `{{#foo}} {{#comment}} \nfoo\n {{/comment}} {{/foo}}` | inner block not standalone: `" \nfoo\n "` |
| `  {{! comment }} ` | only the comment remains |
| `<div>\n  {{#if x}}\n    foo\n  {{/if}}\n</div>` | div children: `"\n"`, block(`"    foo\n"`) |
| `  {{foo}}  \n` | `"  "`, mustache, `"  \n"` (mustaches are never standalone) |
| `{{#if a}}\n{{else}}\n{{/if}}` | both programs empty |

### 5.4 Interaction with source locations

When a content statement has been *right*-stripped (leading text removed), the HTML tokenizer's
line/column is advanced past the removed prefix before tokenizing, so resulting `TextNode`
locations point at the retained text (`updateTokenizerLocation` /
`calculateRightStrippedOffsets`, `handlebars-node-visitors.ts:617-657`). Left-stripping simply
ends the text earlier. *Note:* the offset computation uses `original.split(value)[0]`, i.e. the
first occurrence of the retained text in the original; see Open questions.

---
## 6. Layer 2 — the HTML layer

### 6.1 Driving algorithm

```
parse(program):
  template = Template { body: [], blockParams: options.locals, loc: whole source }
  elementStack = [template]
  for each HBS statement s in program.body (in order):
     visit(s)
  assert elementStack == [template]         (* else "Unclosed element `tag`" *)
  if pendingError: pendingError.eof(end of template)
```

- `ContentStatement`: set tokenizer line/column to the start of the (stripped) content
  (§02-5.4), call `tokenizePart(value)`, then `flushData()` (`handlebars-node-visitors.ts:378-383`).
  `flushData` finishes the current text node *only if the tokenizer is in `data` state*
  (`simple-html-tokenizer/dist/es6/index.js:665-670`). Therefore:
  - text in element/template content is split into a separate `TextNode` at every layer-1
    content boundary (every mustache, comment, block boundary and escape boundary);
  - but text inside an attribute value, a tag, or an HTML comment continues across content
    boundaries (the tokenizer's partial token persists).
- `MustacheStatement`, `CommentStatement`, `BlockStatement`: dispatch on the tokenizer state
  (§02-6.9–6.11).
- A block's programs are visited recursively with a new `Block` node pushed on `elementStack`;
  after the program, the popped node must be that `Block`, otherwise an element opened inside
  the block was not closed there: `Unclosed element \`tag\`` (span: the element's open tag)
  (`handlebars-node-visitors.ts:87-117`). Elements therefore MUST be properly nested with
  respect to blocks: `{{#if}}<div>{{/if}}</div>` → `Unclosed element \`div\``;
  `<div>{{#if}}</div>{{/if}}` → `Closing tag </div> without an open tag`.
- The HTML tokenizer is **never** given an end-of-input signal. Any partially-tokenized
  construct at end of input is silently discarded (see §02-6.12).

### 6.2 HTML tokenizer states

The tokenizer is a simplified subset of the WHATWG tokenizer
(`simple-html-tokenizer/dist/es6/index.js:61-630`). The states, and the events they emit to the
parser, are:

| State | Behavior (on next char `c`) |
|---|---|
| `beforeData` | `<` (and not an ignored end tag, §02-6.8) → `tagOpen`, mark tag start. Otherwise: in precompile mode, if `c` is `\n` and the most recent tag name (lower-cased) is `pre` or `textarea`, consume it silently; then → `data`, begin a text node. |
| `data` | `<` (not ignored) → finish text, → `tagOpen`. `&` (unless last tag name is exactly `script` or `style`) → char reference (§02-6.3). Else append `c`. |
| `tagOpen` | consume `c`. `!` → `markupDeclarationOpen`; `/` → `endTagOpen`; `@`, `:` or ASCII letter → begin start tag, → `tagName`. **Any other character is discarded and the state stays `tagOpen`.** |
| `markupDeclarationOpen` | `--` → begin comment, → `commentStart`. Case-insensitive `DOCTYPE` → doctype states (ignored, no node). Otherwise the character is discarded and the state is unchanged. |
| `commentStart`, `commentStartDash`, `comment`, `commentEndDash`, `commentEnd` | WHATWG-like comment tokenization: `<!-->` and `<!--->` produce an empty comment; `--` not followed by `>` is kept in the data (`commentEnd` appends `--` + `c`). The comment ends at `-->`. |
| `tagName` | whitespace → `beforeAttributeName`; `/` → `selfClosingStartTag`; `>` → finish tag, → `beforeData`; else append to name. |
| `endTagOpen` | `@`, `:` or ASCII letter → begin end tag, → `endTagName`; otherwise the character is discarded and the state is unchanged. |
| `endTagName` | like `tagName` (whitespace → `beforeAttributeName`, `/` → `selfClosingStartTag`, `>` → finish tag). |
| `beforeAttributeName` | whitespace skipped; `/` → `selfClosingStartTag`; `>` → finish tag; `=` → **syntax error** `attribute name cannot start with equals sign`; else begin attribute, → `attributeName`. |
| `attributeName` | whitespace → `afterAttributeName`; `/` → finish valueless attribute, → `selfClosingStartTag`; `=` → `beforeAttributeValue`; `>` → finish valueless attribute, finish tag; `"`, `'`, `<` → **syntax error** `<c> is not a valid character within attribute names`; else append. |
| `afterAttributeName` | whitespace skipped; `/` → finish valueless attribute, → `selfClosingStartTag`; `=` → `beforeAttributeValue`; `>` → finish valueless attribute, finish tag; else finish valueless attribute and begin a new one with `c`. |
| `beforeAttributeValue` | whitespace skipped; `"` / `'` → quoted value states; `>` → finish attribute with empty value, finish tag; else → `attributeValueUnquoted` with `c`. |
| `attributeValueDoubleQuoted` / `…SingleQuoted` | matching quote → finish value, → `afterAttributeValueQuoted`; `&` → char reference; else append. |
| `attributeValueUnquoted` | whitespace → finish value, → `beforeAttributeName`; `/` → finish value, → `selfClosingStartTag`; `&` → char reference; `>` → finish value, finish tag; else append (including `"`, `'`, `=`, `<`, `` ` ``). |
| `afterAttributeValueQuoted` | whitespace → `beforeAttributeName`; `/` → `selfClosingStartTag`; `>` → finish tag; else → `beforeAttributeName` **without consuming** (so `a="1"b="2"` is two attributes). |
| `selfClosingStartTag` | `>` → mark self-closing, finish tag; else → `beforeAttributeName` without consuming (so `<br/ >` is **not** self-closing, and `<div a="b" / c>` has attributes `a` and `c`). |

"Finish tag" and the other events are handled by `TokenizerEventHandlers` as described below.
The tokenizer's own `syntaxError` reports are raised via `reportSyntaxError`, which throws a
Glimmer syntax error with a *collapsed* span at the current position (hence the quoted-code
section of the message is empty) (`tokenizer-event-handlers.ts:560-562`; tests
`parser-node-test.ts:43-61`).

Only whitespace per `[\t\n\f ]` counts as whitespace in layer 2
(`simple-html-tokenizer/dist/es6/index.js:36`); `\r` never reaches it (§02-1.3).

### 6.3 Text and character references

In precompile mode, `&` in `data` and in all three attribute-value states starts a character
reference (`consumeCharRef`, `simple-html-tokenizer/dist/es6/index.js:686-704`;
`EntityParser`, lines 9-34):

```
consumeCharRef():
  j = index of the next ';' at or after the current position in the current chunk
  if none: return nothing                       (* the '&' is literal *)
  entity = text between '&' and that ';'
  if entity matches /^#[xX]([A-Fa-f0-9]+)$/: chars = String.fromCharCode(parseInt(hex, 16))
  elif entity matches /^#([0-9]+)$/:          chars = String.fromCharCode(parseInt(dec, 10))
  elif entity matches /^([A-Za-z0-9]+)$/:      chars = HTML5NamedCharRefs[entity]
  if chars is a non-empty string: consume entity and ';', return chars
  else: return nothing                          (* the '&' is literal, rest re-scanned *)
```

Normative consequences (all reproduced by tests or directly observable):

- The terminating `;` is required: `&amp` and `&not c` are literal. Unknown names
  (`&bogus;`, `&NotANamedRef;`) are literal. `&#;`, `&#x;`, `&#65` are literal.
- Named references use the WHATWG `entities.json` table (the names *with* semicolons, e.g.
  `amp`, `AMP`, `nbsp`, `notin`, `excl`), and are case-sensitive.
- Numeric references use `String.fromCharCode`, **not** `String.fromCodePoint`, and apply no
  WHATWG replacement: code points above U+FFFF are truncated modulo 2^16 (`&#128512;` →
  U+F600), `&#0;` → U+0000, `&#xD800;` → a lone surrogate. See Open questions.
- The `;` search is limited to the current layer-1 content chunk; a reference cannot span a
  mustache.
- References are **not** decoded when the most recent tag name is exactly `script` or `style`
  (data state only; attribute values are always decoded). They *are* decoded in `<textarea>`
  and `<title>`.
- In codemod mode no reference is ever decoded: the text is kept verbatim.

TextNode `chars` hold the decoded text. A `<` in text always starts a tag (unless inside
`<title>`, `<style>`, `<script>`, §02-6.8); there is no recovery for a bare `<` — see §02-6.12.
`>` in text is literal.

### 6.4 Elements and tags

**Tag names.** A start tag name begins with `@`, `:` or an ASCII letter and continues until
whitespace, `/` or `>`; any other characters (including `.`, `-`, digits, quotes, `{`) are part
of the name. Tag names are **case-sensitive** and preserved exactly (`<Div></Div>` is fine;
`<div></DIV>` is a mismatch error).

On finishing a start tag (`finishStartTag`, `tokenizer-event-handlers.ts:136-169`):

- The name is split on `.`: the first piece is the head, the rest the tail of
  `ElementNode.path`. The head is `ThisHead` if it is exactly `this`, `AtHead` if it starts with
  `@`, else `VarHead` (`packages/@glimmer/syntax/lib/v1/parser-builders.ts:311-320`). Thus
  `<Foo.bar.baz />`, `<this />`, `<this.foo.bar />`, `<@Foo />`, `<@Foo.bar />`, `<:foo />` all
  parse (test `parser-node-test.ts:22-36`). Whether a given element *means* an HTML element,
  component invocation or named block is decided in chapter 03.
- If the name is exactly `:` → syntax error
  `Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter`
  (span from `<` to the current position) (`tokenizer-event-handlers.ts:116-124`). Other
  malformed named-block names (`<:1bar>`, `<:Bar>`) parse and are rejected in chapter 03.
  (`<:/1bar>` hits this error because the name ends at `/`; test
  `packages/@glimmer-workspace/integration-tests/test/syntax/named-blocks-test.ts:187-198`.)
- The element is pushed on `elementStack`.
- If the name is in the **void set** (exact, case-sensitive match against
  `area base br col command embed hr img input keygen link meta param source track wbr`,
  `packages/@glimmer/syntax/lib/generation/printer.ts:5-22`) or the tag was self-closing
  (`/>`), the element is immediately closed with `closeTag: null`.

Hence `<BR>` and `<Input>` are *not* void (they need end tags or `/>`), and **any** element may
be self-closed: `<div/>`, `<div />`, `<Foo />`, `<:named />` (the latter rejected in chapter 03).

**End tags** (`finishEndTag` / `validateEndTag`, `tokenizer-event-handlers.ts:171-191, 578-599`):
pop `elementStack` and validate, in this order:

1. If the end tag's name is a void name and this is a real end tag →
   `<name> elements do not need end tags. You should remove it` (span: the end tag). This is
   checked before matching, so `</br>` at top level gives this error rather than "without an
   open tag".
2. If the popped node is not an element (i.e. a `Template`/`Block`) →
   `Closing tag </name> without an open tag`.
3. If the popped element's tag differs →
   `Closing tag </name> did not match last open tag <tag> (on line N)` where N is the open
   tag's start line.

The element's `closeTag` span and `loc` end are set, and it is appended to its parent.

End tags MUST NOT have attributes (`Invalid end tag: closing tag must not have attributes`,
span from `</` to the current position) and MUST NOT be self-closing
(`Invalid end tag: closing tag must not be self-closing`) (`tokenizer-event-handlers.ts:193-204,
285-296`). `</div >` (trailing whitespace) is allowed.

**No implicit tag closing or foster-parenting.** Unlike HTML, the parser never implies end tags
(`<p><p>`, `<li>`, `<td>` etc. must be explicitly closed) and never re-parents content; SVG and
MathML are not special (`<svg><foreignObject><div></div></foreignObject></svg>` is a plain
tree). Namespace handling is a runtime concern (chapter 05).

### 6.5 Attributes

An attribute is recorded on `finishAttributeValue` (`tokenizer-event-handlers.ts:285-314`):

- Name: every character appended in `attributeName` state; names are case-sensitive and may
  contain any character except whitespace, `/`, `=`, `>`, `"`, `'`, `<` (e.g. `@arg`,
  `...attributes`, `data-foo`, `on:click`). Duplicate names are preserved.
- If the name starts with `|`, the value is empty, unquoted and not dynamic → syntax error
  `Invalid block parameters syntax: block parameters must be preceded by the \`as\` keyword`
  with span = the name (`tokenizer-event-handlers.ts:300-306`; tests
  `general-errors-test.ts:288-317`).
- Value (`assembleAttributeValue`, `tokenizer-event-handlers.ts:601-630`), where `parts` is the
  sequence of text parts and mustache parts:
  - **dynamic & quoted** (`"…{{x}}…"`): a `ConcatStatement` of all parts, *even if the only part
    is one mustache* (`class="{{b}}"` → `ConcatStatement([Mustache b])`).
  - **dynamic & unquoted** (`class={{x}}`): exactly one mustache part, optionally followed by a
    single text part consisting of just `/` (the `<input value={{foo}}/>` case, where the `/` is
    then treated as self-closing): the value is that `MustacheStatement`. Anything else (text
    before the mustache, two mustaches, text after) → syntax error
    `An unquoted attribute value must be a string or a mustache, preceded by whitespace or a '=' character, and followed by whitespace, a '>' character, or '/>'`
    with the span of the whole attribute (tests `parser-node-test.ts:724-770`,
    `packages/@glimmer-workspace/integration-tests/test/invalid-html-test.ts:220-251`).
  - **static**: the single `TextNode` (quoted or unquoted, possibly empty).
  - **valueless** (`<input disabled>`, `<div class=>`): `TextNode` with `chars: ""`.
- Consecutive static characters are accumulated into one `TextNode` part; a mustache part
  finalizes the current text part. Text parts are never empty.

Quoted text parts may contain any characters, including `<`, `>`, `=`, newlines, and the other
quote. `\{{` inside quoted attribute values yields a literal `{{` (§02-2.2).

Blocks are not allowed in attribute values (§02-6.11); comments are not allowed in attribute
values (§02-6.10).

### 6.6 Block parameters on elements

`<Foo as |a b|>` declares block params on the element. The parser recognizes them when an
attribute name becomes exactly `as` (`appendToAttributeName` →
`parsePossibleBlockParams`, `tokenizer-event-handlers.ts:242-251, 316-558`), with a sub-state
machine driven by `tokenizer.peek()`/`consume()`:

```
PossibleAs:        ws → BeforeStartPipe (tokenizer → afterAttributeName)
                   '|' → ERROR "expecting at least one space character between "as" and "|""
                   other → Done (an ordinary attribute named "as…", e.g. as="a", async)
BeforeStartPipe:   ws → stay;  '|' → BeforeBlockParamName (tokenizer → beforeAttributeName)
                   other → Done (valueless attribute "as" followed by other content)
BeforeBlockParamName:
                   ws → stay
                   '' (end of chunk: a mustache or EOF follows) → Done + pendingError
                        {mustache: "mustaches cannot be used inside parameters list",
                         eof: "expecting the tag to be closed with ">" or "/>" after parameters list"}
                   '|' → if no params yet: ERROR "empty parameters list, expecting at least one identifier"
                         else AfterEndPipe
                   '>' or '/' → ERROR "incomplete parameters list, expecting "|" but the tag was closed prematurely"
                   other → BlockParamName(name = c)
BlockParamName:    '' → Done + pendingError (as above)
                   '|' or ws → validate name; push VarHead; → AfterEndPipe or BeforeBlockParamName
                   '>' or '/' → ERROR "expecting "|" but the tag was closed prematurely"
                   other → append
AfterEndPipe:      ws → stay
                   '' → Done + pendingError {mustache: "modifiers cannot follow parameters list",
                                             eof: "expecting the tag to be closed with …"}
                   '>' or '/' → Done
                   other → Error state: consume until '', '/', '>' or ws, then
                           ERROR "expecting the tag to be closed with ">" or "/>" after parameters list"
                           (span = the offending token)
```

All messages are prefixed `Invalid block parameters syntax: `. A name is invalid if it is
`this` or contains any of `` ! " # % & ' ( ) * + . / ; < = > @ [ \ ] ^ ` { | } ~ ``
(`tokenizer-event-handlers.ts:325, 470-475`): error
``Invalid block parameters syntax: invalid identifier name `NAME` `` with the name's span. (Note
this set differs slightly from the Handlebars ID set: `,` and `-`, `$`, `:`, `?` are allowed.)

The "as" attribute itself is never recorded. Block params MUST be the last thing in the start
tag: attributes, modifiers or comments after them are errors (`<Foo as |a| class="x">`,
`<Foo as |a| {{b}}>`). Attributes and modifiers *before* `as` are fine. A `pendingError` is
thrown by the next layer-1 mustache visited (`MustacheStatement`, with that mustache's span) or
at end of template (`eof`, span from `as` to the end); `CommentStatement` and `BlockStatement`
do **not** consult `pendingError` (see Open questions).

Error spans for the other cases begin at the `a` of `as` (tests
`general-errors-test.ts:60-286`; `parser-node-test.ts:396-490`).

### 6.7 HTML comments and doctype

`<!-- … -->` produces a `CommentStatement` whose `value` is the text between the delimiters
(tokenized per §02-6.2; entities are *not* decoded in comments). Mustaches, blocks and
Handlebars comments encountered anywhere inside an HTML comment are *not* interpreted: their
**original source text** (from the source lines, joined with `\n`) is appended to the comment
value. This applies in every comment tokenizer state (`commentStart`, `commentStartDash`,
`comment`, `commentEndDash`, `commentEnd`). A `-` or `--` that the tokenizer is still holding,
because it might begin `-->`, is appended first, as the tokenizer itself would do when the next
character is not `>` (`handlebars-node-visitors.ts:323-350`;
`packages/@glimmer/syntax/lib/parser.ts:175-211`). E.g. `<!-- {{#if x}}y{{/if}} -->` has value
` {{#if x}}y{{/if}} `, `<!--{{x}}-->` has value `{{x}}`, and `<!-- a -{{x}}-->` has value
` a -{{x}}` (tests `parser-node-test.ts:789-799`). However, because layer 1 has already run, whitespace control *has* been
applied to the content surrounding them (`<!-- a {{~x~}} b -->` → value ` a{{~x~}}b `), and a
`--}}`-terminated long comment or a `{{!` short comment still ends at its own delimiter.

The comment's `loc` starts at its `<`. `<!DOCTYPE …>` is consumed and produces no node. Other
`<!…` markup (e.g. `<![CDATA[`) is discarded character-by-character (the state does not change),
which means it effectively swallows input until `--` or a `DOCTYPE` match — see §02-6.12.

### 6.8 Special elements

- **`<pre>` / `<textarea>`**: in precompile mode, a newline that is the *first character of
  data* after the most recent start or end tag named `pre`/`textarea` (case-insensitive) is
  removed (`simple-html-tokenizer/dist/es6/index.js:70-75`). Only one newline is removed
  (`<pre>\n\nfoo` → `"\nfoo"`). The check uses the tokenizer's `tagNameBuffer`, which holds the
  name of the most recent *start* tag and is cleared when an end tag finishes
  (`index.js:397-415`). So it does not apply after `</pre>` or after a nested `<b></b>` (buffer
  empty), nor after a nested `<br>` (buffer `br`). But it is re-evaluated at the start of every
  content chunk that begins in `beforeData` while the buffer is still `pre`/`textarea` — e.g.
  `<pre>{{x}}\nfoo</pre>` also drops the newline after the mustache. See Open questions.
- **`<title>`, `<style>`, `<script>`** (exact lower-case names): while the most recent tag
  name is one of these, a `<` in data starts a tag **only** if it begins the exact text
  `</title>`, `</style>`, `</script>` respectively (`isIgnoredEndTag`,
  `simple-html-tokenizer/dist/es6/index.js:712-717`). All other `<` are text:
  `<title><b>x</b></title>` → one TextNode `<b>x</b>`; `<svg><title><div></div></title></svg>`
  likewise (test `parser-node-test.ts:96-102`). Mustaches are still recognized inside these
  elements (layer 1 runs first). References are decoded in `title` but not in `script`/`style`
  data.
- Tag names are matched case-sensitively in these checks except the `pre`/`textarea` newline
  rule.

### 6.9 Mustache placement

For each layer-1 `MustacheStatement` (`handlebars-node-visitors.ts:228-321`):

1. Throw a pending block-params error if any (§02-6.6).
2. If the tokenizer is inside an HTML comment (any comment state): append its source to the
   comment (§02-6.7); done.
3. If the layer-1 path `original` is `...attributes` (i.e. `{{...attributes}}`) → syntax error
   `Illegal use of ...attributes` (span: the mustache) in any position — content, attribute
   value, or modifier (tests `parser-node-test.ts:124-152`; see Open question 15 for how this
   path lexes).
4. Build an ASTv1 `MustacheStatement` (§02-3.2, §02-3.7).
5. Dispatch on tokenizer state:

| Tokenizer state | Source example | Meaning |
|---|---|---|
| `beforeData`, `data` | `<p>{{x}}</p>` | child of the current parent node |
| `tagOpen`, `tagName`, `endTagOpen`, `endTagName` | `<{{x}}>`, `<div{{x}}>`, `</{{x}}>`, `</div{{x}}>` | error `Cannot use mustaches in an elements tagname` |
| `beforeAttributeName`, `selfClosingStartTag` | `<div {{x}}>`, `<div /{{x}}>` | element modifier; tokenizer → `beforeAttributeName`. A `/` not followed by `>` is ignored, as in HTML, so `<div /{{x}}></div>` ≡ `<div {{x}}></div>` (test `parser-node-test.ts:801-804`) |
| `attributeName`, `afterAttributeName` | `<div a{{x}}>`, `<div a {{x}}>` | finish the pending valueless attribute (`a=""`), then element modifier; tokenizer → `beforeAttributeName` |
| `afterAttributeValueQuoted` | `<div a="1"{{x}}>` | element modifier; → `beforeAttributeName` |
| `beforeAttributeValue` | `<div a={{x}}>`, `<div a= {{x}}>` | begin unquoted value with this mustache part; → `attributeValueUnquoted` |
| `attributeValueDoubleQuoted`, `attributeValueSingleQuoted`, `attributeValueUnquoted` | `<div a="x {{y}}">`, `<div a=b{{x}}>` | append as a dynamic value part (unquoted multi-part then errors per §02-6.5) |
| any other state (`markupDeclarationOpen`, doctype states) | `<!-{{x}}-->`, `<!DOCTYPE {{x}}>` | error ``Using a Handlebars mustache when in the `STATE` state is not supported`` |

In the tag states above (`beforeAttributeName`, `selfClosingStartTag`, `attributeName`,
`afterAttributeName`), if the tag being tokenized is an **end** tag, the mustache is an error
`Invalid end tag: closing tag must not contain mustaches` (span: the mustache;
`handlebars-node-visitors.ts:352-356`), e.g. `</div {{x}}>`, `</div foo{{x}}>`, `</div/{{x}}>`
(tests `parser-error-test.ts:136-153`).

An element modifier whose path is a literal → error
`` In <TAG ... {{LIT}} ..., {{LIT}} is not a valid modifier `` where `LIT` is
`JSON.stringify(value)` (or `undefined`) (`handlebars-node-visitors.ts:735-750`), e.g.
`<div {{'str'}}>` → `In <div ... {{"str"}} ..., {{"str"}} is not a valid modifier`. Modifiers keep
source order in `ElementNode.modifiers`, independent of attribute order. A trusting mustache
`{{{x}}}` in modifier position is accepted and treated as a modifier (the `trusting` flag is
dropped).

Until emberjs/ember.js#21635 (merged for 7.5.0-alpha) several of these states were mishandled: an end tag
with a mustache or comment threw a `TypeError`, the comment states other than `comment` moved
the mustache out of the comment (and `<!-- a -{{x}}-->` lost the comment), and the
`selfClosingStartTag`, end-tag-name, markup-declaration and doctype states put the mustache in
the parent. Templates that relied on those behaviors now either error or parse as above.

### 6.10 Handlebars comment placement

`{{! … }}` / `{{!-- … --}}` (`handlebars-node-visitors.ts:385-415`):

| Tokenizer state | Meaning |
|---|---|
| any comment state | source appended to the HTML comment (§02-6.7) |
| `beforeData`, `data` | `MustacheCommentStatement` child |
| `beforeAttributeName`, `afterAttributeName` | pushed on the start tag's `comments` list (`<div {{! c }} class="x">`, `<input foo {{! c }}>`); the pending attribute in `afterAttributeName` is *not* finished by the comment, it is finished by whatever follows. In an **end** tag it is an error `Invalid end tag: closing tag must not contain Handlebars comments` (`</div {{! c}}>`) |
| anything else | error ``Using a Handlebars comment when in the `STATE` state is not supported`` (span: the comment), e.g. states `attributeName`, `beforeAttributeValue`, `attributeValueDoubleQuoted`, `attributeValueUnquoted`, `tagName` |

(Tests `parser-node-test.ts:805-889`.) Note `<div a="x"{{! c}}>` (state
`afterAttributeValueQuoted`) is an error, while `<div a="x" {{! c}}>` is allowed.

### 6.11 Block placement

A layer-1 `BlockStatement` (`handlebars-node-visitors.ts:119-226`):

- in any comment state: source appended to the HTML comment (§02-6.7);
- in `beforeData` or `data`: a `BlockStatement` child of the current parent;
- anywhere else (tag, attribute name/value, etc.): error
  `A block may only be used inside an HTML element or another block.` (span: the whole block).
  So `<div {{#if x}}{{/if}}>` and `<div class="{{#if x}}y{{/if}}">` are errors (use inline
  `{{if}}` in attributes).

Block params on blocks are converted to `VarHead`s with locations found by searching the source
between the end of the hash and the start of the program for the `|…|` list
(`handlebars-node-visitors.ts:149-203`). If a name cannot be located in the searched span, its
loc is the non-existent location. The default block is visited with these params; the inverse
with none.

### 6.12 Silent discards at end of input and malformed markup (current behavior)

Because the HTML tokenizer is never told about end of input, and some states discard
characters, the following inputs parse **without error** and lose text. Implementations MUST
at least not accept these differently in a way that changes the AST for otherwise-valid
templates; whether to turn them into errors is an open question.

| Input | ASTv1 body |
|---|---|
| `<div` , `<div class='x'` | `[]` (unfinished start tag dropped) |
| `<!-- foo` , `<!--- x --->` (the latter never reaches `-->` in the tokenizer's view) | `[]` |
| `<>` | `[]` |
| `a < b` | `[Text "a "]` (the `<` begins a tag; ` ` is discarded in `tagOpen`; `b` starts a tag name) |
| `a<b` | `[Text "a"]` |
| `<1a>` | error ``Unclosed element `a` `` (the `1` is discarded) |
| `< div>` | error ``Unclosed element `div` `` |
| `x < {{y}}` | error `Cannot use mustaches in an elements tagname` |

A literal `<` in content MUST be written as `&lt;` (or inside a string literal / `{{"<"}}`).

---

## 7. ASTv1 — the parse tree used as notation

*Informative as a data structure.* The node shapes below are how this chapter and chapter 03
state the structure of a parsed template. What they record (for example which part of an
element is an attribute, a modifier or a comment) is normative through §02-1.1; the field
names, accessors and deprecated properties are not (§00-0.1 "Non-goals").

Defined in `packages/@glimmer/syntax/lib/v1/nodes-v1.ts`, built by
`packages/@glimmer/syntax/lib/v1/parser-builders.ts` and `legacy-interop.ts`. Every node has
`type` and `loc` (a `SourceSpan`, §02-8). Fields marked *(accessor)* are getters/setters, not
own data; fields marked *(non-enumerable, deprecated)* are defined with `enumerable: false` and
emit a deprecation when accessed. Today's AST plugins observe these shapes, but plugin
compatibility is not a goal of this spec.

### 7.1 Programs

```ts
Template { type: 'Template'; body: Statement[]; blockParams: string[]; loc }
Block    { type: 'Block'; body: Statement[]; params: VarHead[];
           blockParams: string[] /* accessor: params.map(p => p.name); setter builds synthetic VarHeads */;
           chained: boolean; loc }
```

`Template.blockParams` = `options.locals ?? []`. `Block.chained` is `true` only for the synthetic
inverse block produced by an `{{else X}}` chain link.

### 7.2 Statements

```ts
type Statement = MustacheStatement | BlockStatement | MustacheCommentStatement
               | CommentStatement | TextNode | ElementNode;

MustacheStatement { type; path: Expression; params: Expression[]; hash: Hash;
                    trusting: boolean; strip: StripFlags; loc;
                    escaped /* non-enumerable, deprecated: !trusting */ }
BlockStatement    { type; path: PathExpression | SubExpression; params; hash;
                    program: Block; inverse: Block | null;
                    openStrip; inverseStrip; closeStrip: StripFlags; loc }
ElementModifierStatement { type; path: PathExpression | SubExpression; params; hash; loc }
CommentStatement         { type; value: string; loc }          // <!-- -->
MustacheCommentStatement { type; value: string; loc }          // {{! }}
TextNode          { type; chars: string; loc }
ElementNode       { type; path: PathExpression; selfClosing: boolean /* accessor */;
                    attributes: AttrNode[]; params: VarHead[];
                    modifiers: ElementModifierStatement[];
                    comments: MustacheCommentStatement[]; children: Statement[];
                    openTag: SourceSpan; closeTag: SourceSpan | null; loc;
                    tag: string        /* accessor: path.original */;
                    blockParams: string[] /* accessor: params.map(name) */ }
AttrNode          { type; name: string; value: TextNode | MustacheStatement | ConcatStatement; loc }
ConcatStatement   { type; parts: [TextNode | MustacheStatement, ...]; loc }
StripFlags        { open: boolean; close: boolean }
```

- `MustacheStatement.path` is a `PathExpression`, `SubExpression`, or a literal (only in the
  literal-mustache case, §02-3.7, where `params` is `[]` and `hash` is empty).
- `BlockStatement.inverse` is `null` when there is no `{{else}}`.
- `ElementNode.closeTag` is `null` for void and self-closing elements. Setting `selfClosing`
  via the accessor sets `closeTag` to null or a synthetic `</tag>` span.
- Missing `hash` is always materialized as an empty `Hash` whose loc is collapsed at the end of
  the last param (or of the path) (`handlebars-node-visitors.ts:719-732`).

### 7.3 Expressions

```ts
type Expression = PathExpression | SubExpression | Literal;

SubExpression   { type; path: PathExpression | SubExpression; params: Expression[]; hash: Hash; loc }
PathExpression  { type; head: ThisHead | AtHead | VarHead; tail: string[]; loc;
                  original: string   /* accessor: head.original + ('.' + tail.join('.') if tail) */;
                  parts /* non-enumerable, deprecated */;
                  this, data /* non-enumerable, deprecated: head.type checks */ }
ThisHead { type: 'ThisHead'; original: 'this' /* accessor */; loc }
AtHead   { type: 'AtHead'; name: string /* includes '@' */; original /* alias */; loc }
VarHead  { type: 'VarHead'; name: string; original /* alias */; loc }
StringLiteral    { type; value: string;    loc; original /* non-enumerable, deprecated */ }
NumberLiteral    { type; value: number;    loc; … }
BooleanLiteral   { type; value: boolean;   loc; … }
NullLiteral      { type; value: null;      loc; … }
UndefinedLiteral { type; value: undefined; loc; … }
Hash     { type; pairs: HashPair[]; loc }
HashPair { type; key: string; value: Expression; loc }
```

The deprecated `PathExpression.parts` getter returns `original.split('.')` minus a leading
`this`, and with the `@` removed from a leading `@name` (`legacy-interop.ts:63-96`; test
`packages/@glimmer/syntax/test/legacy-interop-test.ts`). Head/`VarHead` names are not validated
in production builds; **[Dev]** in debug builds the builders assert that a `VarHead` name is not `this`,
does not start with `@`, and contains no `.` (`parser-builders.ts:363-399`) — a literal segment
like `{{[foo.bar]}}` violates this (see Open questions).

`ThisHead`, `AtHead`, `VarHead` are "sub-nodes": they are not visited by the traversal API.
Traversal visitor keys (`packages/@glimmer/syntax/lib/v1/visitor-keys.ts`) are:

```
Template, Block: body
MustacheStatement, ElementModifierStatement, SubExpression: path, params, hash
BlockStatement: path, params, hash, program, inverse
ElementNode: attributes, modifiers, children, comments
AttrNode: value;  ConcatStatement: parts;  Hash: pairs;  HashPair: value
(all others: none)
```

### 7.4 Example

```hbs
<Foo @a={{b}} class="x {{y}}" {{on "click" this.go}} as |p q|>t</Foo>
```

```
Template.body = [
  ElementNode {
    path: Path(Var "Foo"), tag: "Foo", selfClosing: false,
    attributes: [ AttrNode "@a" = Mustache(Path(Var b)),
                  AttrNode "class" = Concat[Text "x ", Mustache(Path(Var y))] ],
    modifiers: [ Modifier(Path(Var on), [String "click", Path(This, ["go"])]) ],
    params: [Var p, Var q], comments: [],
    children: [ Text "t" ] } ]
```

---

## 8. Source locations

### 8.1 Model

`packages/@glimmer/syntax/lib/source/*`. A `Source` is the full template string plus module
name. A `SourceOffset` is a position; a `SourceSpan` a half-open range. Positions are
`{ line, column }` with **1-based lines and 0-based columns counted in UTF-16 code units**;
lines are delimited by `\n` only (`source.ts:84-90`). Conversions (`source.ts:49-75`; tests
`packages/@glimmer/syntax/test/location-test.ts`, `source-boundary-test.ts`):
`hbsPosFor(offset)` maps a character offset to a position; `charPosFor(pos)` maps back, clamping
a column past the end of a line to the line end.

Special spans exist for nodes without real source: `synthetic`, `broken`, `nonexistent`
(`location.ts:18-48`).

### 8.2 Node spans (normative where they appear in error messages; the current wire format's debug info also uses them)

| Node | Span |
|---|---|
| `Template` | the entire source (offset 0 to length), regardless of leading/trailing whitespace |
| `MustacheStatement`, `BlockStatement`, comments | from the first `{` to the last `}` inclusive, including `~` |
| `Block` (default program) | from the end of the opener to the start of `{{else}}`/closer (layer-1 program loc). If layer 1 gives no loc (empty program), a fallback derived from the block params span or the block end is used (`repairBlock`, `handlebars-node-visitors.ts:752-780`) — these fallback spans are irregular (see Open questions) |
| chained inverse `Block` | currently the span of the *chained block's default program*, not of the whole chain |
| `ElementNode` | from `<` of the start tag to `>` of the end tag (or of the start tag if void/self-closing) |
| `ElementNode.openTag` / `closeTag` | the start tag / end tag text |
| `ElementNode.path` | the tag name; `path.head` its first `.`-separated piece |
| `AttrNode` | from the first char of the name to the end of the value (including closing quote); for a valueless attribute, up to where the tokenizer was when the attribute was finished, which may include following whitespace (`data-something-boolean` in `loc-node-test.ts:607-638` spans to the next line) |
| `AttrNode.value` | quoted: from the opening quote to after the closing quote (ConcatStatement likewise); unquoted: the value text / mustache |
| `TextNode` in content | the retained text (after stripping, §02-5.4) |
| `TextNode` in attribute | the text part |
| `CommentStatement` | from `<!--` through `-->` |
| `PathExpression` | the path text; `ThisHead` = first 4 chars; `AtHead`/`VarHead` = first `len(name)` chars |
| `Hash` | first to last pair; empty hash: collapsed after last param/path |
| `VarHead` block param | the name's text |

Tests: `packages/@glimmer/syntax/test/loc-node-test.ts` (all cases),
`packages/@glimmer/syntax/test/parser-node-test.ts`.

---

## 9. Errors

### 9.1 Error kinds and message formats

There are three kinds of parse-time errors. Implementations MUST produce the same kind of error
and SHOULD produce identical messages (tests assert full messages for Glimmer syntax errors).

1. **Glimmer syntax errors** (`generateSyntaxError`, `packages/@glimmer/syntax/lib/syntax-error.ts:8-24`):
   an `Error` with `name = 'SyntaxError'`, `location` (the span), `code` (the span's source
   text), and message

   ```
   `${message}: ${quoted}(error occurred in '${moduleName}' @ line ${line} : column ${column})`
   quoted = code ? `\n\n|\n|  ${code.split('\n').join('\n|  ')}\n|\n\n` : ''
   ```

   where `line`/`column` are the span start. (Test helper:
   `packages/@glimmer-workspace/test-utils/lib/syntax-error.ts`.)
2. **Handlebars exceptions** (`packages/@handlebars/parser/lib/exception.js`): an `Error` whose
   message is `${message} - ${line}:${column}` (start of the node), with `lineNumber`,
   `endLineNumber`, `column`, `endColumn` properties.
3. **Jison parse/lexical errors**: a plain `Error` with a `hash` property
   (`{text, token, line, loc, expected}`), message

   ```
   Parse error on line ${n}:\n${showPosition()}\nExpecting ${'A', 'B', …}, got '${TOKEN}'
   Lexical error on line ${n}. Unrecognized text.\n${showPosition()}
   ```

   `showPosition()` is up to 20 chars of preceding input (prefixed `...` if truncated) plus up
   to 20 of upcoming, then a line of `-` and `^` under the error column (`lib/parser.js:1320-1352,
   1686-1697`). The exact "Expecting" list depends on the LALR tables and is **not** required to
   match; implementations MUST report `Parse error on line N` with the correct line (tests
   `packages/@handlebars/parser/spec/parser.js:346-434`).

### 9.2 Catalogue

| # | Message | Kind | Condition | Source |
|---|---|---|---|---|
| E1 | `Parse error on line N: …` | 3 | any grammar violation: unclosed mustache (`{{foo}`), `{{}}`, `{{~}}`, `{{~~}}`, stray `{{else}}`/`{{/x}}`, unclosed block, params after hash, bad hash key, bad block params, `{{@}}`, `{{@0}}`, … | `lib/parser.js:1320` |
| E2 | `Lexical error on line N. Unrecognized text.` | 3 | NUL in content | `lib/parser.js:1686` |
| E3 | `X doesn't match Y - L:C` | 2 | block / raw-block open and close names differ | `lib/helpers.js:3-11` |
| E4 | `Invalid path: P - L:C` | 2 | `this`, `.`, `..` after a real segment | `lib/helpers.js:71-74` |
| E5 | `Unexpected inverse block on decorator` | 2 | `{{#*x}}{{else}}` | `lib/helpers.js:150-152` |
| E6 | `Handlebars partials are not supported` | 1 | `{{> …}}` | `handlebars-node-visitors.ts:417-422` |
| E7 | `Handlebars partial blocks are not supported` | 1 | `{{#> …}}` | `:424-429` |
| E8 | `Handlebars decorators are not supported` | 1 | `{{* …}}` | `:431-436` |
| E9 | `Handlebars decorator blocks are not supported` | 1 | `{{#* …}}` | `:438-443` |
| E10 | `Using "./" is not supported in Glimmer and unnecessary` | 1 | path starts `./` | `:469-474` |
| E11 | `Changing context using "../" is not supported in Glimmer` | 1 | path starts `../` | `:475-480` |
| E12 | `Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths` | 1 | `/` and `.` in one path | `:481-486` |
| E13 | `'.' is not a supported path in Glimmer; check for a path with a trailing '.'` | 1 | path `.` | `:488-492` |
| E14 | `Attempted to parse a path expression, but it was not valid. Paths beginning with @ must start with a-z.` | 1 | data path with no segment | `:524-529` |
| E15 | `Attempted to parse a path expression, but it was not valid. Paths must start with a-z or A-Z.` | 1 | non-data path with no segment left (`{{[]}}`, the `..` in `foo..bar`) | `:541-546` |
| E16 | `` ${Type} "${v}" cannot be called as a sub-expression, replace (${v}) with ${v} `` | 1 | literal callee of block/sexpr | `:693-716` |
| E17 | `Illegal use of ...attributes` | 1 | `{{...attributes}}` anywhere | `:240-245` |
| E18 | `Cannot use mustaches in an elements tagname` | 1 | mustache in `tagOpen`/`tagName`/`endTagOpen`/`endTagName` | `:270-274` |
| E19 | `` In <T ... {{L}} ..., {{L}} is not a valid modifier `` | 1 | literal in modifier position | `:735-746` |
| E20 | ``Using a Handlebars comment when in the `S` state is not supported`` | 1 | §02-6.10 | `:407-411` |
| E21 | `A block may only be used inside an HTML element or another block.` | 1 | block outside content | `:126-131` |
| E22 | ``Unclosed element `T` `` | 1 | element not closed by end of its template/block (span: the element's start tag) | `:105-108` |
| E23 | `Closing tag </T> without an open tag` | 1 | end tag with no element open in this block | `tokenizer-event-handlers.ts:591-592` |
| E24 | `Closing tag </T> did not match last open tag <U> (on line N)` | 1 | tag mismatch | `:593-597` |
| E25 | `<T> elements do not need end tags. You should remove it` | 1 | end tag for void name | `:583-590` |
| E26 | `Invalid end tag: closing tag must not have attributes` | 1 | | `:291-296` |
| E27 | `Invalid end tag: closing tag must not be self-closing` | 1 | `</x/>` | `:198-203` |
| E28 | `Invalid named block named detected, …` (full text §02-6.4) | 1 | tag name exactly `:` | `:116-124` |
| E29 | `attribute name cannot start with equals sign` | 1 (collapsed span) | `=` in `beforeAttributeName` (e.g. `<img =foo>`, `<div data-{{x}}="y">`) | s-h-t `:431-437` |
| E30 | `" is not a valid character within attribute names` (also `'`, `<`) | 1 (collapsed span) | | s-h-t `:466-470` |
| E31 | `An unquoted attribute value must be a string or a mustache, preceded by whitespace or a '=' character, and followed by whitespace, a '>' character, or '/>'` | 1 | §02-6.5 | `tokenizer-event-handlers.ts:617-622` |
| E32–E41 | `Invalid block parameters syntax: …` (10 variants in §02-6.6, plus "block parameters must be preceded by the `as` keyword") | 1 | §02-6.6 | `:300-306, 316-558` |
| E42 | ``Inverse sections (`{{^foo}}...{{/foo}}`) are not supported. Use `{{#unless foo}}...{{/unless}}` instead`` | 1 | `{{^x}}…{{/x}}` without `{{else}}` (§02-3.3) | `handlebars-node-visitors.ts:133-140` |
| E43 | ``Hash literals are not supported. Use named arguments (`{{helper foo=bar}}`) or the `hash` helper (`(hash foo=bar)`) instead`` | 1 | hash literal as a callee, param or hash value (§02-3.8) | `handlebars-node-visitors.ts:450-455` |
| E44 | ``A path cannot start with a sub-expression. Use the `get` helper (`(get (foo) "bar")`) instead`` | 1 | `(foo).bar` (§02-3.8) | `handlebars-node-visitors.ts:461-466` |
| E45 | `Invalid end tag: closing tag must not contain mustaches` | 1 | mustache in an end tag's attribute area (§02-6.9) | `handlebars-node-visitors.ts:352-356` |
| E46 | `Invalid end tag: closing tag must not contain Handlebars comments` | 1 | `{{! …}}` in an end tag (§02-6.10) | `handlebars-node-visitors.ts:352-356` |
| E47 | ``Using a Handlebars mustache when in the `S` state is not supported`` | 1 | mustache in a markup declaration or doctype (§02-6.9) | `handlebars-node-visitors.ts:313-317` |

*Note on E15:* for `{{[]}}` layer 1 produces an empty head string, which its `parts` construction
treats as absent (`lib/helpers.js:82-91`), so Glimmer sees no segments. For `foo..bar` the lexer
produces `foo` then the `..` ID as a *separate* param expression whose segments were all dropped.
In contrast `{{foo.[]}}` yields tail `[""]` without error.

---

## 10. Codemod mode and printing

*Informative.* Printing is used only by addon pre-publication tooling, which is outside the
primary scope (§00-0.1 "Non-goals").

The printer (`packages/@glimmer/syntax/lib/generation/printer.ts`) is not part of compilation
proper, but it is used on the compile path by `babel-plugin-ember-template-compilation` when
`targetFormat: 'hbs'`: the template is parsed with `mode: 'codemod'`, AST plugins run, and the
result is printed with `entityEncoding: 'raw'` (`babel-plugin-ember-template-compilation/src/plugin.ts:544-545`).
The printed text is later compiled normally. Therefore the observable semantics of such a
template are those of *print(parse_codemod(src))* re-parsed in precompile mode. Addons publish
this printed text; once published it is ordinary template source (§01-1.5.6). Relevant facts:

- In codemod mode, no whitespace is stripped and entities are left encoded, so a `raw` print
  reproduces text and attribute values verbatim (quotes chosen to avoid escaping where possible).
- Strip flags are re-emitted as `~`, so whitespace control happens at the second parse.
- **Lossy round-trips** (current behavior; see Open questions): `\{{foo}}` prints as `{{foo}}`
  (the escape is lost and the text becomes a live mustache); raw blocks print as ordinary
  blocks (`{{{{raw}}}} {{x}} {{{{/raw}}}}` → `{{#raw}} {{x}} {{/raw}}`); literal path segments
  lose their brackets (`{{foo.[bar baz]}}` → `{{foo.bar baz}}`); `{{! c }}` prints as
  `{{!-- c --}}`; string literals are re-quoted with `"`.

In `entityEncoding: 'transformed'` (default print), text is escaped (`& < > U+00A0` in text,
`& " U+00A0` in attributes) (`generation/util.ts:11-58`).

---

## 11. Open questions / inconsistencies

1. **Inverse sections with `{{else}}`.** `{{^foo}}a{{else}}b{{/foo}}` is accepted as
   `{{#foo}}b{{else}}a{{/foo}}` (§02-3.3), has no test, and could reasonably be an error like the
   form without `{{else}}`.
2. **Literal mustaches discard params.** `{{"foo" bar baz=1}}` silently becomes `{{"foo"}}`
   (`handlebars-node-visitors.ts:247-255`), while `{{#"foo"}}` and `("foo")` error. Probably
   should be an error.
3. **`this/foo` loses `this`.** It becomes the free variable `foo` (not `this.foo`), because the
   `this` regex is `^this(\..+)?$` while layer 1 has already dropped the `this` segment. Loose
   mode would then resolve `foo` differently from `this.foo`. Untested.
4. **Literal segments containing `.`** (`{{[foo.bar]}}`, `{{foo.[bar.baz]}}`) produce heads/tails
   containing `.`, violating debug-build builder assertions and making `original` ambiguous.
   `{{foo.[]}}` produces an empty-string tail segment. Semantics for chapter 03 are unclear.
5. **Silent input loss.** Unterminated tags/comments at EOF, `<>`, `a < b`, and non-letter
   characters after `<` / `</` / `<!` are silently discarded (§02-6.12). The code comment at
   `handlebars-node-visitors.ts:54-56` acknowledges this. Recommend errors.
6. **`pendingError` is only consulted by mustaches and EOF**; a Handlebars comment inside an
   element's block-params list (`<Foo as |a {{! c}}|>`) is accepted onto `comments` and the
   remaining `|` then produces the misleading "must be preceded by the `as` keyword" error; a
   block there errors with E21.
7. **Numeric character references** use `String.fromCharCode` (no astral support, no WHATWG
   replacement of 0, surrogates, or C1 controls). `&#128512;` yields U+F600. Likely a bug that
   templates might nonetheless depend on.
8. **`<pre>`/`<textarea>` newline** is keyed off the most recent start-tag name (compared
   case-insensitively, cleared by any end tag) and is re-applied at every content chunk starting in `beforeData`
   (e.g. after a mustache inside `<pre>`), which does not match HTML parsing (only the newline
   immediately after the start tag). Meanwhile the runtime DOM parser is never involved, so this
   determines the rendered text.
9. **`<title>`/`<script>`/`<style>` handling** is keyed off the last tag name, case-sensitive,
   and applies inside SVG `<title>` too. Entity decoding is suppressed in `script`/`style` but
   not `title`.
10. **Void elements are case-sensitive in the parser** (`voidMap.has(name)`) but the printer's
    `isVoidTag` lower-cases (`printer.ts:57-59`). `<BR>` needs a close tag in the parser.
11. **Location oddities:** chained inverse `Block.loc` covers only the chained block's default
    program; empty-program fallback spans can cover the block params and closer; valueless
    attribute spans include trailing whitespace; `calculateRightStrippedOffsets` uses the first
    occurrence of the retained text, which is wrong when the stripped prefix contains the same
    text (unlikely since the prefix is whitespace, but `value === ''` handling counts `\n` in
    the whole original).
12. **CR handling:** layer 2 normalizes lone `\r` to `\n`, but `Source` line tables only split on
    `\n` (while `Parser.lines` splits on `\r\n?|\n`). Templates with lone CR line endings get
    inconsistent line numbers between layer-1 locs, tokenizer positions and `Source`.
13. **Raw blocks** are parsed as normal blocks with HTML-tokenized content; there is no ASTv1
    marker and no test in `@glimmer/syntax`. Their runtime meaning is whatever the block helper
    does (chapter 03/05).
14. **Private-field-looking segments** `foo.#bar` / `this.#foo` parse (tail `"#bar"`); no
    Glimmer test pins down their meaning.
15. **The `...attributes` check** (E17) compares the layer-1 `original` to `...attributes`.
    Layer 1 lexes `...attributes` as `..` (ID) `.` (SEP) `attributes`; `preparePath` drops `..`
    (depth 1) giving `original = "...attributes"` — the check works only by this coincidence.
    `{{../attributes}}` is a different error. `<div ...attributes={{x}}>` is accepted by the
    parser (validated, if at all, in chapter 03).
16. **Upstream-Handlebars leftovers**: `{{&foo}}` (trusting), `{{^}}` as `{{else}}`, `foo/bar`
    paths, `{{{{raw}}}}` blocks, `\{{` escapes and standalone-line stripping are all inherited
    from Handlebars and only partially tested in Glimmer. They are specified here as current
    behavior and should be marked **[Legacy]**.
17. **Duplicate attribute names and duplicate hash keys** are accepted at parse time. Their
    runtime meaning is specified in §05-4.9 and §05-7.3 and recorded as §05-14 item 15.
