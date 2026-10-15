# T25 — HTML-first parsing everywhere (author follow-up to T24)

Author (2026-10-15, in conversation after T24): the comment rule was not meant as a special
exception. Change the architecture: drop the "HTML-blind Handlebars side" so that the HTML
tokenizer has priority everywhere. Enumerate the compatibility issues and address each one,
rather than accepting the old parser layering.

Resume from the first unticked item.

- [x] 1. Probe the current parser for every place the layering is observable (done in
      conversation; results in the notes below).
- [x] 2. Corpus impact: `tools/html-first-impact.mjs` (replaces `comment-mustaches.mjs`) over
      `~/hacking`: comments, escape-split text nodes, `<pre>`/`<textarea>` newlines.
- [x] 3. Rewrite §02-1.1 as HTML-first: per-state table (construct / error / text), construct
      extent is Handlebars, whitespace control acts on text only, block delimiters in content,
      escapes are text with no boundary, `<pre>` newline only after the start tag.
- [x] 4. Rewrite §02-1.4 as the enumeration of compatibility issues, each with current
      behavior, the spec's rule, corpus impact and resolution; plus what does not change.
- [x] 5. Follow through: §02-1.5, §02-2.2, §02-5 (intro, 5.2, 5.3), §02-6.1, §02-6.6, §02-6.7,
      §02-6.8, §02-6.9–6.11, §02-11 items 4, 7, 19; §00-0.5.1 rows; §00-0.7.2 item 7.
- [x] 6. STATUS, users-todo-list, xref and citation checks, commit.

## Notes

Probes (built `@glimmer/syntax`, 2026-10-15):

- `<div a=b {{~x}}>` and `<div a={{x~}} b>`: E31 (the tilde deletes inter-attribute space).
  `<div a {{~x}}>`: modifier, same as without the tilde. A standalone `{{! c }}` line inside a
  tag changes nothing observable (only `[ \t]*` before and `[ \t]*\n` after are deleted, and the
  tag states treat the remaining whitespace the same).
- `<div class="a  {{~x}}">`: static part `a` (deletion inside attribute-value text).
- `<pre>{{x}}\nfoo</pre>` → `foo`; `<pre>{{a}}\n{{b}}</pre>` → an empty text node, the newline
  is lost; `<pre>a{{x}}\nfoo</pre>` also drops it; `<pre><b></b>{{x}}\nfoo</pre>` keeps it.
  Same for `<textarea>`.
- `a\{{b}} c\{{d}}` → three text nodes.
- `<style>{{"</style>"}}</style>`, `<script>{{x}}</script>`, `<title>{{x}}</title>`: mustaches.
- `<!-- {{#if x}}` → parse error (unclosed block). NUL anywhere, comments included → lexical
  error. `<!DOCTYPE {{x}}>`, `<!-{{x}}-->`, `<![CDATA[{{x}}]]>` → E47.

Corpus (`tools/html-first-impact.mjs .. ~/hacking`, 28,786 distinct templates): comments 0,
escapes 41 (mostly docs pages showing `\{{`), pre 7 (crates.io, boxel, gmail-automation: newline
before `</pre>`; embercom-composer debug view: newlines after mustaches; Discourse: after a
`<Textarea />` component; a Prettier fixture; crates.io counted twice through `.embroider`).
