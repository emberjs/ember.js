The Glimmer preprocessor is responsible for taking templates and converting them into the Wire Format.

The input to the preprocessor is _the AST_. The AST is the result of parsing a template via `@glimmer/syntax`.

> The preprocessor uses AST v2. See the README in @glimmer/syntax for more information.

## Passes

**Normalization**: The normalization pass turns the AST into the HIR (high-level IR). While the AST treats all blocks, curlies and expressions equally, the HIR has special instructions for keywords (such as `#in-element`, `{{yield}}` and `(has-block)`).

**Symbol Allocation**: The symbol allocation pass turns the HIR into the MIR (mid-level IR). HIR instructions use strings to identify variable bindings and references. The MIR uses unique symbols for each binding and reference instead. This removes the need to understand the current scope stack to resolve the location of a variable reference.

> The MIR is a representation of the encoded wire format before serializing the instructions, and with source offsets still attached to each instruction.

This pass allocates symbols for variable references that refer to in-scope bindings, which block parameters introduce. It also allocates symbols for `@arg` references, and for blocks referenced via the `{{yield}}`, `(has-block)` and `(has-block-params)` keywords.

Finally, this pass is responsible for identifying the presence of the `{{debugger}}` keyword, which require symbol maps at runtime.

**Encoding**: The encoding pass turns the MIR into the wire format, which is suitable for wire transport. The current encoding pass is hardcoded to emit the wire format (documented in `@glimmer/wire-format`). This is the stage where any optimizations on the representation are performed (like erasing trailing nulls, or other simple packing optimizations).

In strict mode, encoded templates will need to be emitted into a JavaScript file containing variable bindings that correspond to each of the upvars. This is not yet implemented.

In the future, it will be possible to replace the encoder with an arbitrary encoding pass, provided that you supply a runtime decoder.
