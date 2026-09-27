# Tag Composition

Glimmer's reactivity system is founded on a minimal algebraic primitive called _Tag_. Tags operate on a _monotonic revision timeline_ and compose within _tracking frames_.

Tags intentionally exist as a separate layer from the [reactive values](./reactive-values.md) they represent, creating a clean separation between validation algebra and value semantics.

> [!NOTE]
>
> This separation distinguishes Glimmer from most reactive systems: Glimmer can validate reactive computations without recomputing values or performing equality comparisons. While this approach doesn't provide reference-equality-based cutoffs for invalidation propagation, it enables reliable fine-grained validation and controlled root-state invalidation through equivalence rules. At scale, this architecture yields significant benefits in predictability and performance.

## Core Algebraic Primitives

- **Revision Timeline**: A monotonically increasing sequence where each increment represents an atomic change. The timeline advances in a discrete and monotonic manner, with each new revision strictly greater than all previous revisions.

- **Tag**: A stateful object that represents a timestamp (revision) on the timeline when its
  associated value or computation last changed. _Tags can be retained and later used to determine if
  a previously snapshotted value is still valid, without recomputing that value._
  
  All tags support the `[Consume]` operation, which records the tag in the current tracking frame when accessed.

- **Value Tag**: <a id="value-tag"></a> The base tag type that tracks when a single value changes.

- **Mutable Tag**: A tag that can be explicitly updated with:
  - `[Update]`: Advances the timeline and records the new revision as the tag's current revision.
  - `[Freeze]`: Marks a tag as immutable, preventing its accesses from being recorded in tracking frames.

- **Combined Tag**: <a id="combined-tag"></a> A tag that represents the join (maximum) of multiple tag revisions. This join operation maintains the algebraic property that if any constituent tag invalidates, the combined tag also invalidates.

- **Tracking Frame**: A collector that accumulates tags consumed during a computation. The frame has
  two operations:
  - `[Begin]`: Creates a bounded context for tag collection.
  - `[Commit]`: Closes the collection scope and produces a combined tag from the collected tags.

- **Tracking Stack**: A nested structure of tracking frames representing the current computation hierarchy. Enables compositional reactive tracking across function boundaries.

## Revision Timeline

The revision timeline forms the foundation of Glimmer's validation algebra. It consists of:

- **Initial Revision**: Timeline begins at revision `1`.
- **Constant Revision**: Special revision `0` indicates values that never change. Tags with this revision are not tracked.
- **Timeline Advancement**: Each atomic update advances the global timeline exactly once.
- **Revision Comparison**: Two tags can be compared by examining their respective revisions.

> [!NOTE]
>
> Revision `0` (constant revision) receives special treatment in the algebra. Tags with revision `0` do not participate in tracking and a frame containing only constant tags is itself considered constant.
