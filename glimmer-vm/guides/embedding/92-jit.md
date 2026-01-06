# The JIT Embedding API

This version of the API is currently used by Ember as of Ember 3.7.

Pros:

- Allows an application to ship a relatively compact representation of the template (the [Wire Format][wire-format]), which is useful for extremely bandwidth-constrained environments.
- Allows an application to compile templates on demand

Cons:

- Requires an application to ship the [Wire Format][wire-format]
- Requires the compilation of the Wire Format at runtime

[wire-format]: ./04-wire-format.md
