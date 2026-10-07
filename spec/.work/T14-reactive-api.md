# T14: author feedback `391b17239c` on the proposed reactive API (§00-0.7.10)

Resume from the first unticked item. Commit after each item or small group.

The feedback (now removed from §00-0.7.10; the full text is in `git show 391b17239c`):

1. Adopt RFC 1218 (`cached(fn)` overload, not yet accepted;
   NullVoxPopuli/rfcs@1f99b3a6 `text/1218-overload-cached-for-non-class-use.md`). `tracked()` and
   `cached()` are *the* primitives. `isConst`/`isValid` are free functions on `cached()`'s return
   value. `createCache` is compat only, implemented in terms of `cached()`.
2. Put an effect primitive in the core, so effect implementations do not each debounce every
   write and poll `isValid`. It replaces the global `onInvalidate`. A renderer is an effect
   around its re-rendering logic.
3. Asynchronous consumption: do not commit to one strategy in the core, but show (as an
   exploration) that the primitives can build asynchronous reactive resources.

## Checklist

- [x] Prototype in `spec/prototype/reactive/` on top of the built `@glimmer/validator`
      (`dist/dev`): `cached`, `isValid`, `isConst`, `untrack`, `effect`, compat
      `createCache`/`getValue`, and an async resource. `node --test` tests for every normative
      claim of the new §07-2.2 and the async strategies of §07-2.7.
      *Done:* 31 tests pass. Effects are scheduled through the global-context
      `scheduleRevalidate` (the only private hook used).
- [x] §07-2.1/§07-2.2 rewritten: `tracked` (root), `cached` (derived), `isValid`/`isConst`
      (introspection), `untrack`, `effect` (consumption), compat layer, module placement.
      `onInvalidate` removed.
- [x] §07-2.3 reference semantics: add effect scheduling to the clock sketch.
- [x] §07-2.4: `C(expr)` is `cached(...)`; modifiers (2.4.6) and the renderer loop (2.4.10) as
      effects; conclusion updated.
- [x] §07-2.5 Signals comparison and §07-2.6 updated.
- [x] New §07-2.7 (non-normative): asynchronous consumption, strategies and the prototype.
- [x] §07 intro, §07-0 terminology (invalidation hook is now internal), §07-1.1/§07-1.10
      wording where they mention the hook, §07-3.3 (`@cached` as sugar), §07-3.4 (compat),
      §07-5 open questions for the new review points.
- [x] Other chapters: §00-0.4, §00-0.7.10 (replace the feedback with the new review points),
      §08 (the reference to §07-2.2.2), any other `§07-2.2.x` references.
- [x] STATUS.md: decision, task row, next steps. `xref.py` and `check-citations.py` clean.
