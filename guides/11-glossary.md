# Glossary

This glossary covers terms you may come across while reading the Glimmer VM
source code or participating in its development on GitHub.

It includes low-level implementation details in the compiler and VM that are
*not* needed to write Glimmer.js components, so don't be overwhelmed! This
document is for intermediate to advanced users who want to understand the inner
workings of Glimmer.

## Abstract Syntax Tree

An Abstract Syntax Tree, or AST, is a data structure that represents source code
as a tree of nodes.

In Glimmer, the AST represents the parsed source code of Handlebars templates.
At compile time, the source for each template is read from disk and passed to
the Handlebars parser, which returns a Handlebars AST. The Glimmer compiler then
uses the AST to ultimately produce bytecode.

## Bytecode

Bytecode is a binary encoding of a sequence of instructions, or [opcodes](#opcode),
optimized for being evaluated with a virtual machine, or VM.

The Glimmer compiler compiles one or more templates into a single bytecode
representation, which can be efficiently loaded and evaluated in the browser by
the VM. Each instruction is represented by a one-byte opcode followed by zero or
more operands.

## Compiler Delegate

The compiler delegate is an object that implements the [CompilerDelegate
interface][compiler-delegate-source] and provides information to the compiler
during the compilation process.

For example, the compiler delegate is responsible for helping the compiler
answer whether a particular component or helper is in scope for the template it
is currently compiling. It also is responsible for providing the
[capabilities](#componentcapabilities) of a component so certain optimizations
can be performed.

See also: [`CompilerDelegate` interface][compiler-delegate-source]

[compiler-delegate-source]: ../packages/@glimmer/bundle-compiler/lib/compiler-delegate.ts

## Component

Generally speaking, a component is a reusable unit of UI that encapsulates
behavior and appearance. Because Glimmer VM is a highly configurable runtime,
the exact meaning of "component" is determined by the host
[environment](#environment) and one or more [component
managers](#component-manager).

In the VM, the only assumption made about components is that they have an
associated template. Host environments define the JavaScript component API, if
any, so in [Glimmer.js](https://www.glimmerjs.com) you define subclasses of
`@glimmer/component`'s `Component` class, while in
[Ember.js](https://www.emberjs.com) you extend the `Ember.Component` base class.

A component is defined once (see [`ComponentDefinition`](#componentdefinition))
but can be instantiated and used multiple times. Each instance may receive data
from a parent component, and each instance has its own private component state.

Components can update automatically when state changes. The exact mechanism for
change tracking is up to the host environment.

For example, Ember.js uses key-value observing (KVO) to detect changes while
Glimmer.js uses [tracked
properties](https://glimmerjs.com/guides/tracked-properties). Using the
low-level [`Reference`](#reference) API, host environments could additionally
model Angular-style dirty checking, React-style `setState()`, and more.

## `ComponentCapabilities`

A `ComponentCapabilities` object describes the runtime features required for a
particular component. Glimmer uses this information to perform optimizations
that would not be possible if the capabilities were not known ahead of time.

For example, in Ember, a component can dynamically set its `layout` property at
runtime to give itself a different template. In Glimmer.js, changing a
component's template is not allowed, so the compiler can inline the template
into the bytecode instead of having to look it up at runtime and performing
additional compilation on the client.

See also: [`ComponentCapabilities` interface][component-capabilities-source]

[component-capabilities-source]: ../packages/@glimmer/interfaces/lib/component-capabilities.d.ts

## `ComponentDefinition`

A `ComponentDefinition` is a data structure that represents a component
implementation. No matter how many instances of a particular component are
created, there is just one `ComponentDefinition`.

A definition contains a reference to a [component manager](#component-manager)
as well as host-specific `state` that is opaque to the VM. The host environment
can include metadata in the definition, and the VM will pass that state back
to the component manager when invoking certain hooks.

For example, the host environment can register a `ComponentDefinition` for the
`Button` component and store the associated JavaScript component class in the
state.

When that component is invoked via `<Button />`, the VM will pass the
definition's state back to the component manager's `create()` hook so it knows
the correct class to instantiate.

See also: [`ComponentDefinition` interface][component-definition-source]

[component-definition-source]: ../packages/@glimmer/interfaces/lib/components.d.ts

## Component Manager

A component manager configures the behavior of the Glimmer runtime for a
particular component. Glimmer VM is low-level and highly configurable, and a
component manager's primarily role is to turn that low-level functionality into
a higher-level API for use by application developers.

A component manager is responsible for instantiating component classes, setting
the context of a component's template, invoking lifecycle hooks, and more. In
other words, it's the bridge between the VM and user's components.

For example, the manager defines the API for component lifecycle hooks, so it
can decide whether the hook is called `didInsertElement`, `componentDidMount`,
`connectedCallback`, or something else entirely.

## Element Modifier

An modifier is a special kind of helper that appears in the attribute position of an
element: `<div {{modifier}}></div>`;

Regular helpers are used to produce values that can be inserted into the DOM,
either as attributes or text nodes.

```hbs
<span class="created-at">{{formatDate @user.createdAt}}</span>
```

Modifiers, on the other hand, make imperative changes to a DOM element. For example,
an `on` modifier might bind DOM events using `addEventListener`:

```hbs
<button {{on "click" didClick}}>Click me!</button>
```

## Environment

Similar to how a component manager configures the behavior of a particular component,
the environment configures how all components behave in a particular host environment.

For example, the environment can provide alternate implementations of DOM
construction and updating operations. For server-side rendering in Node.js, the
environment is configured to use something like [Simple DOM][simple-dom] instead
of browser DOM which is not available. The environment could theoretically
provide an implementation that maps on to other UI hosts entirely, to enable
something like Glimmer Native, for example.

[simple-dom]: https://github.com/ember-fastboot/simple-dom

## Handle

A handle is a unique integer identifier is assigned to external objects referred
to in templates (such as helpers, other components, etc).

The integer is encoded as operands in the compiled [bytecode](#bytecode). At run
time, the host environment is responsible for exchanging a handle for the
appropriate live JavaScript object.

See also: [Compiler architecture overview (guide)](./01-introduction.md#compiler)

## Helper

A (typically pure) JavaScript function that takes input arguments and produces a
value based on those inputs. If one or more of a helper's inputs are modified,
Glimmer will reevaluate the helper function and update the DOM appropriately.

Example with `dasherize` and `formatDate` helpers:

```hbs
<div id="{{dasherize @user.username}}" class="date">
  {{formatDate @user.createdAt "MMM Do YY"}}
</div>
```

## Intermediate Representation (IR)

An intermediate representation, or IR, is a data structure that a compiler uses
internally to represent the program it is compiling.

An IR differs from an [AST](#abstract-syntax-tree) primarily in that it more
closely resembles the final compiled output, where an AST more closely
represents the source code as typed by the developer.

In Glimmer, the compiler transforms Handlebars AST into a Glimmer IR. The IR
represents the final bytecode output, but is designed to allow additional
optimization passes.

Once optimization has finished and all of the templates in the program have been
linked together, the final pass transforms IR into binary-encoded bytecode.

## Iterable

In the context of Glimmer VM, an `Iterable` is an object that helps the VM
iterate over a list of items (such as an array), detect changes to that list,
and efficiently update the DOM to reflect those changes.

You can think of an `Iterable` as being like a [`Reference`](#reference) for
iterable objects like arrays, `Map`s, `Set`s, etc.

## Layout

A layout is another term for a component's template. Because components can be
invoked with additional content, "layout" helps disambiguate between the
component's template and the template for the passed block.

For example, if a `Wrapper` component has a template like this:

```hbs
<div class="wrapper">{{yield}}</div>
```

We call this the layout template. You might invoke the component like this:

```hbs
<Wrapper>
  Hello World!
</Wrapper>
```

When put together, they look like this:

```hbs
<div class="wrapper">
  Hello World!
</div>
```

To avoid confusion, the layout template means the original component template
(the one that contains the `{{yield}}`).

## Opcode

An opcode represents an instruction the Glimmer VM should perform. Glimmer
compiles the templates in your program into a sequence of opcodes that, when
executed, create DOM, instantiate component classes, etc.

Examples of opcodes in the Glimmer virtual machine include:

* `0x16 Text` - append a DOM `Text` node
* `0x30 PushFrame` - push a new frame on to the stack
* `0x1F FlushElement` - flush a newly-created element to DOM (or stream in SSR case)
* `0x40 CreateComponent` - instantiate a component class and push it on to the stack

When serialized into Glimmer bytecode, every opcode is represented as a 1-byte
integer.

## Opcode Compiler

The opcode compiler transforms the intermediate representation (IR) of a
template into the final sequence of opcode and operand integers. An encoder
turns this array of integers into the Glimmer bytecode file format.

## Path Reference

A `PathReference` is a kind of `Reference` that supports creating additional
child `References` via path lookups using the `get()` method.

See also: [Reference](#reference), [References (guide)][path-reference-guide]

[path-reference-guide]: ./04-references.md#references-in-glimmer

## Partial

A partial is a kind of non-component template that can be included inside other
templates, inheriting the lexical scope of its surrounding environment.

Similar to `eval()` in JavaScript, it behaves as though you copied and pasted
the partial's template into the parent template, inheriting all of the variables
in scope. Also like `eval()`, its highly dynamic nature disables many categories
of optimization wherever it is used.

Using partials is discouraged. They are implemented for backwards compatibility
with Ember and should not be used in new Glimmer host environments. Everything
that can be accomplished with a partial can be better accomplished with a
component.

## Constant Pool

The constant pool is a data structure that contains arrays of JavaScript values
that can be referred to by a [handle](#handle). The constant pool is produced
during compilation, and is serialized to JavaScript so that it is available at
run time. By sharing constant values in a pool, the size of compiled templates
can be reduced even further.

For example, imagine this simple template:

```hbs
<div>
  <div></div>
</div>
```

The bytecode for this template would include two `OpenElement` opcodes, which
construct a new DOM element.

```assembly
OpenElement "div"
```

But this would be inefficient, because we would repeat the string `"div"` many
times in bytecode for most apps.

Rather than repeating the string multiple times, we instead put it into the
constant pool. We then encode the `div`s in the above template as
bytecode with the same operand in both cases.

```assembly
; Refer to "div" by handle (integer id), assuming it was assigned id 0 here
OpenElement 0x00
```

In the browser, the string constant pool might look like:

```js
const STRING_CONSTANTS = ['div'];
```

When the VM encounters the `OpenElement` opcode with the handle as the first operand, it will exchange it for the appropriate string value:

```js
let handle = instruction.operand1; // 0
let tagName = STRING_CONSTANTS[handle];
```

## Reference

A `Reference` is a stable object that represents the result of a pure
(side-effect-free) computation, where the result of the computation might change
over time. Glimmer creates references to represent values used in templates so
that they can be efficiently shared across multiple components and efficiently
updated should the underlying value change.

See also: [References (guide)][path-reference-guide]

[path-reference-guide]: ./04-references.md#references-in-glimmer

## Runtime / Run Time

"The runtime" is the set of Glimmer code that runs in the
user's browser, i.e., at the time the program is run. The terms "VM" and
"runtime" are often used interchangeably, although the VM is just the most
significant part of the runtime.

It may also be used to describe events that happen after the program has started
running, e.g. "the object is instantiated at run time" or "that is a run-time
concern."

## Template

A template is HTML that has been augmented with additional syntax to express
dynamic content and behavior. Glimmer uses [Handlebars][handlebars] syntax for
its templates.

Typically, every [component](#component) will have an associated template that
is rendered whenever the component is created.

[handlebars]: http://handlebarsjs.com

## Virtual Machine

In the context of Glimmer, a virtual machine (or VM) is a software implementation of a
hardware (or hardware-like) architecture, designed to execute computer programs.

For example, Java source code is compiled into Java bytecode, which is run on
the platform-independent Java virtual machine (JVM). Any program conforming to
the JVM specification can execute Java bytecode, allowing the same compiled Java
program to run on any platform with a conforming JVM implementation.

Glimmer VM is an implementation of a compiler that turns Handlebars templates
into bytecode, and a virtual machine that executes those bytecode programs in
the browser and Node.js.

We call Glimmer a virtual machine because its architecture is modelled on
hardware CPUs. For example, the Glimmer virtual machine is both a stack machine
and a register machine that evaluates a sequence of [opcodes](#opcode).

In order to optimize over-the-wire size of compiled bytecode, Glimmer's
instruction set implements common tasks of component-based libraries, such as
creating new elements, setting attributes, instantiating components, and more.
