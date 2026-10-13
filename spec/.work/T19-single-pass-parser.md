# T19 — State §02 as a single-pass parser

Author's question (2026-10-13): can §02 drop the "Handlebars parse, then HTML tokenize" layering
in favour of one HTML tokenizer with added states for mustaches? Either explain why backward
compatibility precludes it, or rewrite §02.

Answer: compatibility does not preclude a single scan, but four properties of today's parser must
survive, because they are observable: Handlebars lexing is HTML-blind, whitespace control is
HTML-blind, block structure is HTML-blind (blocks may straddle tags and HTML comments), and
Handlebars grammar errors outrank every other error. §02 now states the model as one scan with
those properties explicit, and the current two-layer parser is an implementation note.

Probes (built `@glimmer/syntax`, rebuilt with `pnpm rollup --config` at this checkout):
`<div a=b {{~x}}>` → E31 while `<div a=b {{x}}>` is a modifier; `{{#if x}}<div class="{{/if}}"></div>`
→ empty block, then `<div class="">`; `{{#if x}}<!--{{else}}-->{{/if}}` → comment in the inverse;
`</div>{{#a}}{{/b}}` → E3 but `</div>{{./foo}}` → E23; `a\{{b}} c\{{d}}` → three TextNodes;
`\{{a}} b\\{{c}}` → `"{{a}} b"`, `"\"`, mustache; chained-else close standalone uses the first
inverse (`{{else if b}}\n  y\n  {{/if}}` keeps `"  y\n  "`).

- [x] Probes for every divergence point
- [x] §1.1 parsing model (single scan), §1.4 rationale, §1.5 implementation note
- [x] Section titles and "layer 1/2" wording throughout §02
- [x] §5 intro (HTML-blind, bounded lookahead); §5.3 closeStandalone uses the first inverse
- [x] §6.1 scan algorithm; §6.7 comments; §6.9–6.11 placement; block straddling rule
- [x] §9.1 error priority
- [x] §11 new open questions
- [x] §00 diagram line, CONVENTIONS table, STATUS row
- [x] xref.py, check-citations.py
