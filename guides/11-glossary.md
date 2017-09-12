
# Component

A component is a reusable unit of UI that encapsulates behavior and appearance.
In Glimmer, a component is comprised of a template and, optionally, a JavaScript
class.

A component is defined once (see `ComponentDefinition`) but can be instantiated
and used multiple times. Each instance may receive data from a parent component,
and each instance has its own private component state. Components update
automatically when any data (component state or otherwise) that influences their
appearance changes.

In Glimmer VM, there is no built-in base `Component` class. User-facing objects
like this are supplied by the host `Environment`.

# `ComponentFactory`

A component factory is an object that can construct new instances of a
particular component's JavaScript class. It has a `create()` method which takes
an object containing properties that should be set on the instantiated
component.

# `ComponentCapabilities`

# `ComponentManager`

# `Environment`

# Layout

# Element Modifier

# Path Reference

# Opcode

# Opcode Compiler

# Iterable

# Partial

# Template

# Runtime

# Compiler

# Compiler Delegate

# Component

# Handle

# Pool

# Specifier

# ComponentDefinition

# ComponentSpec

# Helper

# Reference

# Validator

# Tag

# Symbol Table

# Abstract Syntax Tree (AST)

# Intermediate Representation (IR)