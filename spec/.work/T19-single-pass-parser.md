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

## Author feedback (`8dd43f4d83`, `1871c6cf4a`)

- [x] §02-11 item 1 (inverse section with `{{else}}`): **[Out of spec]**; new CONVENTIONS marker;
      §02-3.3 and E42 row; item removed (and §00-0.7.2 old item 5)
- [x] §02-11 item 19 (error priority): not specified; §02-1.1 (three properties), §02-1.4,
      §02-1.5, §02-9.1; item removed
- [x] §02-11 items 2, 16, 18: planned as T20, T21, T22 (checklists in `.work/`); items annotated
- [x] §05-14 item 13: PR emberjs/ember.js#21718; §00-0.7.1 item 2, STATUS table
- [x] Pruned with `tools/prune-open-questions.py --apply`; bare references fixed by hand
