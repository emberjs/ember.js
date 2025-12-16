# The Fundamental Laws of Reactivity

## ♾ The Fundamental Axiom of Reactivity

> ### "A reactive abstraction must provide both the current value and a means to detect invalidation without recomputation."

From the perspective of a Glimmer user, this axiom enables writing reactive code using standard
JavaScript functions and getters that automatically reflect the current state of UI inputs.

**Glimmer users write UI code as straightforward rendering functions**, yet the system behaves _as
if_ these functions re-execute completely whenever any reactive value changes.

> [!IMPORTANT]
>
> When root state is mutated, all reactive abstractions reflect those changes immediately, even when
> implemented with caching. Glimmer's reactive values are _always coherent_ — changes are never
> batched in ways that would allow inconsistencies between computed values and their underlying root
> state.

## Definitions

- **Root Reactive State**: An atomic reactive value that can be updated directly. It is represented
  by a single [value tag](./concepts.md#value-tag). You can create a single piece of root state
  explicitly using the `cell` API, but containers from `tracked-builtins` and the storage created by
  the `@tracked` decorator are also root reactive state.
- **Formula**: A reactive computation that depends on a number of reactive values. A formula's
  revision is the most recent revision of any of the members used during the last computation (as a
  [combined tag](./concepts.md#combined-tag)). A
  formula will _always_ recompute its output if the revision of any of its members is advanced.
- **Snapshot**: A _snapshot_ of a reactive abstraction is its _current value_ at a specific
  revision. The snapshot <a id="invalidate"></a> _invalidates_ when the abstraction's tag has a more
  recent revision. _A reactive abstraction is said to _invalidate_ when any previous snapshots would
  become invalid._

## The Fundamental Laws of Reactivity

In order to satisfy the _Fundamental Axiom of Reactivity_, all reactive abstractions must adhere to these six laws:

1. **Dependency Tracking**: A reactive abstraction **must** [invalidate](#invalidate) when any
   reactive values used in its _last computation_ have changed. _The revision of the tag associated
   with the reactive abstraction <u>must</u> advance to match the revision of its most recently
   updated member._

2. **Value Coherence**: A reactive abstraction **must never** return a cached _value_ from a
   revision older than its current revision. _After a root state update, any dependent reactive
   abstractions must recompute their value when next snapshotted._

3. **Transactional Consistency**: During a single rendering transaction, a reactive abstraction
   **must** return the same value and revision for all snapshots taken within that transaction.

4. **Snapshot Immutability**: The act of snapshotting a reactive abstraction **must not**
   advance the reactive timeline. _Recursive snapshotting (akin to functional composition) naturally
   involves tag consumption, yet remains consistent with this requirement as immutability applies
   recursively to each snapshot operation._

5. **Defined Granularity**: A reactive abstraction **must** define a contract specifying its
   _invalidation granularity_, and **must not** invalidate more frequently than this contract
   permits. When a reactive abstraction allows value mutations, it **must** specify its equivalence
   comparison method. When a new value is equivalent to the previous value, the abstraction **must
   not** invalidate.

All reactive abstractions—including built-in mechanisms like `@tracked` and `createCache`, existing
libraries such as `tracked-toolbox` and `tracked-builtins`, and new primitives like `cell`—must
satisfy these six laws to maintain the Fundamental Axiom of Reactivity when these abstractions are
composed together.

> [!TIP]
> 
> In practice, the effectiveness of reactive composition is bounded by the **Defined Granularity** and **Specified Equivalence** of the underlying abstractions.
> 
> For instance, if a [`cell`](#cell) implementation defines granularity at the level of JSON serialization equality, then all higher-level abstractions built upon it will inherit this same granularity constraint.
> 
> The laws do not mandate comparing every value in every _computation_, nor do they require a
> uniform approach to equivalence based solely on reference equality. Each abstraction defines its
> own appropriate granularity and equivalence parameters.
>
> For developers building reactive abstractions, carefully selecting granularity and equivalence
> specifications that align with user mental models is crucial—users will experience the system
> through these decisions, expecting UI updates that accurately reflect meaningful changes in their
> application state.
> 
