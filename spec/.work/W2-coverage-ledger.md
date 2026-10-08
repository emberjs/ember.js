# W2 coverage ledger

Every test that W2 deletes, collapses or moves, with where its behavior is still tested.
Append rows as you go; never delete a test without a row here. The exit check (W2 item 8.3)
reads this file.

`Action`: `deleted (twin)`, `ported` (new location in the Twin column), `collapsed` (fan-out
registration removed; the Glimmer/template-only registration remains), `kept` (with reason).

| Step | Test (file › module › name, kind) | Action | Twin / new location | Notes |
|---|---|---|---|---|
