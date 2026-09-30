# Background

The glimmer rendering engine is a VM-based system for compiling and executing handlebars-like templates in the browser DOM. In typical usage, user-authored templates get preprocessed during their app's build into "wire format". Wire format gets a runtime compilation pass and then executes in the glimmer VM.

I believe we'd have a simpler and more maintainable system if we replace the Glimmer VM's stack and heap with the actual Javascript stack and heap. Instead of compiling templates to VM bytecode, we would compile them to javascript function, written against a small new runtime.

As a first step toward writing a next generation rendering engine, we want to thoroughly describe the existing behaviors.

# Goal

Produce a thorough specification of the existing template language and its semantics.

This should include lexing, parsing, compilation, and runtime layers.

The resulting document should be complete enough to write a fully backward-compatible new implementation.

# Other important information beyond this repo

## Template Tag Syntax

The current user-facing API for templates is Template Tag, which is defined here: https://github.com/emberjs/rfcs/blob/main/text/0931-template-compiler-api.md

Important parts of the implementation live in [babel-plugin-ember-template-compilation](https://github.com/emberjs/babel-plugin-ember-template-compilation).

And the low-level conversion of GJS syntax to JS is handled by [content-tag](https://github.com/embroider-build/content-tag).

## Ember RFCs

The Ember RFCs repo captures past decisions that might be relevant: https://github.com/emberjs/rfcs/tree/main/text

The aforementioned 0931-template-compiler-api.md is one example, but there are others relevant to how the template language works. Especially:

- https://github.com/emberjs/rfcs/blob/main/text/0496-handlebars-strict-mode.md

## Manager Pattern

The user-defined things that can be invoked in a template are Components, Helpers, and Modifiers. All three follow a Manager Pattern that governs the interface between the user-written artifact and the framework. It is the manager APIs that are definitive. For example, you cannot assume that all components extend `@glimmer/component` or `@ember/component`. They could be any Javascript value that has an associated component manager.

## Reactivity patterns

Internally, reactivity is modeled through a reference and tagging system. Users can use the `tracked` function as a field decorator, auto-accessor decorator, or plain function to establish buckets of tracked state.

There is, presently, no single clear well-established low-level public API for _consuming_ changes to tracked state. I believe that's an important missing primitive. If introducing such a primitive can make the spec cleaner, let's attempt that. For example: ideally the details of tags and refs are not visible the spec we're writing, they remain implementation details of the current implementation only.

## new inputs for this session

- last session we burned through limits quickly with a large number of sub agents. Make sure we're not wasting effort by ensuring that partial work from subagents is being preserved before they hit their limits and stop.

- Wire format compatibility is _not_ a requirement. We don't make any guarantee on wire format compatibility across ember versions. Addons are expected to ship handlebars, not wire format, for that reason.
