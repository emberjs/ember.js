# Glimmer Syntax Basics

Glimmer's syntax is relatively small.

## Expressions

**Literals**:

- numbers, e.g. `1` and `1.5`
- strings, e.g. `'some text'` and `"some text"`
- booleans: `true` and `false`
- `null`
- `undefined`

**VariableReference**:

- `this`
- `Identifier` (the usual identifier characters, plus `-`, `?` and `!`)
- `"@" Identifier`

**MemberAccess**:

- _VariableReference_ "." _Identifier_
- _MemberAccess_ "." _Identifier_

(effectively a _variable reference_ followed by "." and then N "." separated identifiers)

**Call**:

- "(" _VariableReference_ Expression\* NamedArg\* ")"

**NamedArg**:

- _Identifier_ "=" _Expression_
