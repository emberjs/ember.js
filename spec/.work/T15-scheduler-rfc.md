# T15: author feedback `59f71505b9` — relate the reactive core to RFC 957 (scheduler)

Resume from the first unticked item. The question (was inline under §07-5 item 14): if RFC 957
(runspired/rfcs@modernized-scheduler, `text/0957-modernized-scheduler.md`) is approved, does it
change our design; is the design flexible enough for its requirements; do we fall into the
performance traps it describes?

- [x] Prototype test: a promise-based frame strategy (RFC 957 Example 1 semantics) drives the
      renderer and user effects through `schedule`; check ordering and the re-render within one
      frame.
- [x] New §07-2.8 (non-normative): mapping, fit, traps, design consequences.
- [x] §07-5 item 14 (default schedule) and item 17 (ordering) updated; the inline note removed.
- [x] §00-0.7.10, STATUS, checkers.
