# T22 — Blocks that straddle markup become parse errors (upstream PR)

Author ruling (2026-10-13, on §02-11 item 17, "Blocks that straddle markup"): make a PR that turns these into parse errors in the
existing implementation, with good test coverage and a convincing argument for why this won't
break anybody with a sane template.

The behavior (§02-6.11 "Blocks that straddle markup"): only the block *opener's* HTML state is
checked (E21). A block's `{{else}}` or closer inside a tag, an attribute value or an HTML comment
ends the program anyway, and the half-built tag or comment lands in the next program or after the
block: `{{#if x}}<div class="{{/if}}"></div>` is an empty block followed by `<div class="">`.

Resume from the first unticked item. Worktree `/Users/edward/hacking/ember.js-t22`, branch
`fix/blocks-straddling-markup` from `origin/main`.

- [x] 1. Implementation sketch to confirm: in `parseProgram`
      (`packages/@glimmer/syntax/lib/parser/handlebars-node-visitors.ts:87-117`), after visiting
      the program body, if the tokenizer state is not `beforeData` or `data`, throw. Watch for:
      the early return for an empty program (`:88-90`) must not skip the check (an empty program
      cannot change the state, but the check belongs at program end regardless); the state at the
      end of the *default* program is the state at `{{else}}`, and at the end of the last program
      the state at the closer; chained `{{else if}}` programs; raw blocks.
      Done (worktree commit `1fc261a10e`): `blockPrograms` in `handlebars-node-visitors.ts` visits
      a block's programs in source order and checks the HTML tokenizer state at each `{{else}}`
      and at the closer. Chain links skip the closer check (the outer block does it). Inverse
      sections with `{{else}}` keep the old path (their programs are not in source order).
- [x] 2. Error message and span. Proposal, in the style of E21:
      ``A block's `{{else}}` or `{{/…}}` cannot appear inside an HTML tag or comment``, with the
      state family (tag, attribute value, HTML comment) named where it helps. Span: the
      `{{else}}` or closer if its location is recoverable from the Handlebars program locs, else
      the whole block.
      Done. Messages: ``\`{{else}}\` cannot be inside an HTML tag or attribute value; a block's
      \`{{else}}\` must be in content, like its opening tag`` (the actual separator text, e.g.
      `{{else if y}}`); ``\`{{/if}}\` cannot be inside an HTML tag or attribute value; a block's
      closing tag must be in content, like its opening tag``; ``\`{{/if}}\` is inside an HTML
      comment that began inside the block, where it is comment text, so the block is never closed.
      Close the HTML comment before \`{{/if}}\` ``. Spans: the separator or closer itself.
- [x] 3. HTML comments: decide between (a) an error for a block opened outside a comment and
      closed inside it, and (b) treating that closer as comment text (§02-11 item 17's suggestion,
      natural for a single-pass parser but awkward in the two-pass one, because the Handlebars
      pass has already matched the closer to its opener). (a) is simpler; confirm with the author.
      **Answer (author, 2026-10-13, `036d98ba70`):** attempt (b), to see how complex the
      implementation is; fall back to (a) if it turns out really complex. Report the complexity
      either way.

- [x] 4. Tests in `packages/@glimmer/syntax/test/parser-error-test.ts`: `{{else}}` and closer in
      each state family (tag name, before/after attribute name, attribute name, unquoted, single-
      and double-quoted value, HTML comment, markup declaration); chained `{{else if}}`; nested
      blocks; and the accepted cases that must stay accepted (blocks wholly inside content, blocks
      wholly inside an HTML comment, `{{else}}` and closer in `data` inside `<script>`, `<style>`,
      `<title>`, `<pre>`).
      Done: `parser-error-test.ts` (closer in 12 states incl. doctype and a multi-line `{{~/if~}}`;
      `{{else}}`, `{{^}}`, `{{else if}}` in tags; inside a chain; closer in a comment, 4 cases) and
      `parser-node-test.ts` (`{{else}}`/`{{^}}`/`{{else if "}}"}}`/`{{else each … as |d|}}` as
      comment text; `{{else}}` after a closed comment). Not added: an end tag left open across
      `{{/if}}` (`{{#if x}}<div></div{{/if}}>`) reports the existing ``Unclosed element `div` ``
      first, which is also correct. `[glimmer-syntax]` 373/373.
- [x] 5. The argument for the PR description:
      - Every input this rejects is accepted today with a tree that does not match its source:
        show the four §02-6.11 examples with their current trees (attribute values emptied, an
        element or comment moved out of its block or into the other branch).
      - Such a template cannot have been written on purpose: the rendered result is never what
        the source says.
      - Evidence: run the patched parser over every template in this repo (and, if feasible, a
        corpus of published addons' templates) and report zero new errors. Keep the script in
        `spec/tools/`.
      Done: corpus result under "Evidence"; full suite 9235 tests, 9215 pass, 20 skip, 0 fail;
      PR description drafted below. Not pushed: waiting for the author's go-ahead.
**Parked (author, 2026-10-14):** not landing right away; probably a longer deprecation cycle.
The spec marks these inputs **[Deprecated]** (§02-1.1 property 3, §02-6.7, §02-6.11, §02-11
item 17, §0.7.2 item 5): a new implementation SHOULD reject them. Open before resuming: the
deprecation id and `until`, and whether an `{{else}}` inside a comment that began in the block
ends up an error or comment text (option (b) changes meaning silently, so it needs a warning
first). The branch stays as the eventual error change.

- [ ] 6. When it lands: rewrite §02-1.1 property 3 and §02-6.11 to the new rule (the scan then
      needs no carry-over of a partial token across a program boundary), add the E-catalogue row,
      remove §02-11 item 17 and the matching §00-0.7.2 sentence, update STATUS.

## Option (b): how complex it turned out

Implemented, at moderate cost: about 200 lines in `handlebars-node-visitors.ts`, most of it the
source-order walk over a block's programs. The parser already appended Handlebars syntax inside
an HTML comment as text; (b) needed three things on top:

- keeping the default program open (on the element stack) across an `{{else}}` that is comment
  text, so an element opened before it can be closed after it;
- flattening an `{{else if …}}` chain when a link is comment text: the link's body joins the
  current program and the link's own inverse becomes the block's inverse;
- the source text of each `{{else …}}`, which the Handlebars AST does not record. It is taken
  from the program locations (a program's loc ends exactly at its `{{else`, and a chain link's loc
  starts there), with the `}}` searched for after the link's last expression, so a string
  literal containing `}}` is handled.

**Limit.** (b) is complete only for templates the Handlebars pass accepts. Templates that are
valid *only* if the comment text is taken out of the Handlebars structure still fail in the
Handlebars pass with a grammar error, as they do today:
`{{#if x}}<!-- {{/if}} -->{{/if}}` (stray closer), `{{#if x}}<!-- a {{else}} b -->c{{else}}d{{/if}}`
(two `{{else}}`s). Accepting those needs the Handlebars pass to know where HTML comments are,
which needs the HTML tokenizer's state while lexing Handlebars, i.e. the single-pass parser of
§02-1.1. Leaving them as errors is forward-compatible: a later single-pass parser can accept
them. A closer inside such a comment is reported as "never closed" (step 2), which is what (b)
implies for every template the Handlebars pass accepts.

## Evidence (step 5)

`spec/tools/compare-parsers.mjs` (new) parses every `.hbs` file and every `<template>` body in
`.gjs`/`.gts` under the given roots with the `origin/main` parser and the patched one. Over all of
`~/hacking` (Ember apps and addons, including Ghost admin, the Boxel/Cardstack repos, published
addons under `node_modules`): 45,137 files, 57,329 templates, 28,770 distinct, **0 change**
between accepted and rejected.

## PR description (draft)

Title: Keep a block's `{{else}}` and closer out of half-built tags and HTML comments

The template parser runs Handlebars first and HTML second, and the HTML tokenizer is never told
where a block's programs begin and end. Only a block's *opener* was checked against the HTML
state ("A block may only be used inside an HTML element or another block."), so an `{{else}}`
or closer inside a tag, an attribute value or an HTML comment ended the program anyway, and the
half-built tag or comment carried over into the next program or past the block:

| Template | Parsed as (before this PR) |
|---|---|
| `{{#if x}}<div class="{{/if}}"></div>` | an empty block, then `<div class="">` after it |
| `{{#if x}}<div class="{{else}}"></div>{{/if}}` | an empty default block; `<div class="">` in the inverse |
| `{{#if x}}<!--{{else}}-->{{/if}}` | an empty default block; an empty comment in the inverse |
| `{{#if x}}<!-- {{/if}} -->` | an empty block, then the comment after it |

None of these trees matches its source: attribute values are emptied, and elements and comments
move out of their block or into the other branch. This PR:

- makes an `{{else}}` (also `{{^}}` and `{{else if …}}`) or a closer inside a tag or attribute
  value a syntax error, like an opener there;
- treats an `{{else …}}` inside an HTML comment that began inside the block as comment text,
  as Handlebars syntax inside an HTML comment already is, so the block's program continues after
  it (`{{#if x}}<!--{{else}}-->{{/if}}` is a block whose body is the comment `{{else}}`);
- reports a closer inside such a comment as an error: it is comment text too, so the block is
  never closed.

**Why this won't break a sane template.** Every template whose behavior changes is one where an
`{{else}}` or closer sits inside markup that started in the block, and every such template
parsed into a tree that contradicts its source, so it cannot have been rendering what its author
wrote. As a check, the parser before and after this change was run over every `.hbs` file and
every `<template>` body in a local corpus of Ember apps and addons (Ghost admin, several large
private apps, and the published addons in their `node_modules`): 57,329 templates, 28,770
distinct, and none changes between accepted and rejected.

Templates that do not straddle markup parse exactly as before (full test suite green).
`{{^foo}}a{{else}}b{{/foo}}` keeps its old handling.

Tests: `packages/@glimmer/syntax/test/parser-error-test.ts`, `parser-node-test.ts`.
