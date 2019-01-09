# `Opaque` is now `unknown`

TypeScript no longer requires a custom type -- any uses of `Opaque` must be replaced with `unknown`.

# Import changes

Moved from `@glimmer/runtime` to `@glimmer/interfaces`

- `Cursor`
- `DynamicScope`
- `Arguments` -> `VMArguments`
- `CapturedArguments`
- `VM`

Moved from `@glimmer/util` to `@glimmer/interfaces`

- Dict

Moved from `@glimmer/program` to `@glimmer/interfaces`

- `ConstantPool`

# `new Heap` is now `new RuntimeHeapImpl()`

Old:

```ts
import { Heap } from '@glimmer/program';

let heap = new Heap({
  table: serializedHeap.table,
  handle: serializedHeap.handle,
  buffer: bytecode,
});
```

New:

```ts
import { RuntimeHeapImpl } from '@glimmer/program';

let heap = new RuntimeHeapImpl({
  table: serializedHeap.table,
  handle: serializedHeap.handle,
  buffer: bytecode,
});
```

# `new CompilableProgram` is now `compilable()`

Old:

```ts
import { CompilableProgram } from '@glimmer/opcode-compiler';

let block = JSON.parse(templateBlock);
let compilable = new CompilableProgram(this.compiler.compiler, {
  block,
  referrer: meta,
  asPartial: false,
});
```

New:

```ts
import { compilable } from '@glimmer/opcode-compiler';

let block = JSON.parse(templateBlock);
let compilable = compilable({
  block,
  referrer: meta,
});
```
