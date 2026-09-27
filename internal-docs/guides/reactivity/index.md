# The Glimmer Reactivity System

## Table of Contents

1. [Tag Composition](./tag-composition.md): The formal composition semantics of Glimmer's tag-based
   validation system.
2. [The Fundamental Laws of Reactivity](./laws.md): A definition of Glimmer's reliable and
   consistent reactive programming model, and the rules that reactive abstractions must
   satisfy in order to safely support this model.
3. [System Phases](./system-phases.md): A description of the phases of the Glimmer execution model:
   _action_, _render_, and _idle_, and how the exeuction model supported batched _UI_ updates while
   maintaining a _coherent_ data model.
4. [Reactive Abstractions](./reactive-abstractions.md): A description of the implementation of
   a number of reactive abstractions, and how they satisfy the laws of reactivity.
5. [Autotracked Rendering](./autotracked-rendering.md): An overview of the
   details of how rendering and autotracking interplay.

### Pseudocode

This directory also contains pseudocode for the foundation of a reactive system that satisfies these
requirements, and uses them to demonstrate the implementation of the reactive abstractions.

- [`tags.ts`](./pseudocode/tags.ts): A simple implementation of the tag-based validation system,
  including an interface for a runtime that supports tag consumptions and tracking frames.
- [`primitives.ts`](./pseudocode/primitives.ts): Implementation of:
  - `Snapshot`, which captures a value at a specific revision with its tag validator.
  - `PrimitiveCell` and `PrimitiveCache`, which implement a primitive root storage and a primitive
    cached computation, both of which support law-abiding snapshots.
- [`composition.ts`](./pseudocode/composition.ts): Implementations of the higher-level reactive
  constructs described in [Reactive Abstractions](./reactive-abstractions.md) in terms of the
  reactive primitives.

> [!TIP]
>
> While these are significantly simplified versions of the production primitives that ship with
> Ember and Glimmer, they serve as clear illustrations of how to implement reactive abstractions
> that satisfy the reactive laws.
