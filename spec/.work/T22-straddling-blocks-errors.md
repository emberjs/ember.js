# T22 — Blocks that straddle markup become parse errors (upstream PR)

Author ruling (2026-10-13, on §02-11 item 17, "Blocks that straddle markup"): make a PR that turns these into parse errors in the
existing implementation, with good test coverage and a convincing argument for why this won't
break anybody with a sane template.

The behavior (§02-6.11 "Blocks that straddle markup"): only the block *opener's* HTML state is
checked (E21). A block's `{{else}}` or closer inside a tag, an attribute value or an HTML comment
ends the program anyway, and the half-built tag or comment lands in the next program or after the
block: `{{#if x}}<div class="{{/if}}"></div>` is an empty block followed by `<div class="">`.

Resume from the first unticked item. Branch from `origin/main`.

- [ ] 1. Implementation sketch to confirm: in `parseProgram`
      (`packages/@glimmer/syntax/lib/parser/handlebars-node-visitors.ts:87-117`), after visiting
      the program body, if the tokenizer state is not `beforeData` or `data`, throw. Watch for:
      the early return for an empty program (`:88-90`) must not skip the check (an empty program
      cannot change the state, but the check belongs at program end regardless); the state at the
      end of the *default* program is the state at `{{else}}`, and at the end of the last program
      the state at the closer; chained `{{else if}}` programs; raw blocks.
- [ ] 2. Error message and span. Proposal, in the style of E21:
      ``A block's `{{else}}` or `{{/…}}` cannot appear inside an HTML tag or comment``, with the
      state family (tag, attribute value, HTML comment) named where it helps. Span: the
      `{{else}}` or closer if its location is recoverable from the Handlebars program locs, else
      the whole block.
- [ ] 3. HTML comments: decide between (a) an error for a block opened outside a comment and
      closed inside it, and (b) treating that closer as comment text (§02-11 item 17's suggestion,
      natural for a single-pass parser but awkward in the two-pass one, because the Handlebars
      pass has already matched the closer to its opener). (a) is simpler; confirm with the author.

      > I would prefer (b), so let's attempt that. I want to see how complex the ipmlementation is. If it turns out to be really complex, we can fall back to (a).

- [ ] 4. Tests in `packages/@glimmer/syntax/test/parser-error-test.ts`: `{{else}}` and closer in
      each state family (tag name, before/after attribute name, attribute name, unquoted, single-
      and double-quoted value, HTML comment, markup declaration); chained `{{else if}}`; nested
      blocks; and the accepted cases that must stay accepted (blocks wholly inside content, blocks
      wholly inside an HTML comment, `{{else}}` and closer in `data` inside `<script>`, `<style>`,
      `<title>`, `<pre>`).
- [ ] 5. The argument for the PR description:
      - Every input this rejects is accepted today with a tree that does not match its source:
        show the four §02-6.11 examples with their current trees (attribute values emptied, an
        element or comment moved out of its block or into the other branch).
      - Such a template cannot have been written on purpose: the rendered result is never what
        the source says.
      - Evidence: run the patched parser over every template in this repo (and, if feasible, a
        corpus of published addons' templates) and report zero new errors. Keep the script in
        `spec/tools/`.
- [ ] 6. When it lands: rewrite §02-1.1 property 3 and §02-6.11 to the new rule (the scan then
      needs no carry-over of a partial token across a program boundary), add the E-catalogue row,
      remove §02-11 item 17 and the matching §00-0.7.2 sentence, update STATUS.
