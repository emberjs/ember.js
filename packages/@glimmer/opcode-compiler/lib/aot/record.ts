import type {
  BlockMetadata,
  BuilderOp,
  BuilderOpcode,
  CompileTimeConstants,
  Dict,
  Encoder,
  EncoderError,
  EvaluationContext,
  HandleResult,
  HighLevelOp,
  ProgramConstants,
  SerializedBlock,
  SerializedInlineBlock,
  SingleBuilderOperand,
  Statement,
} from '@glimmer/interfaces';
import { isMachineOp, VM_RETURN_OP } from '@glimmer/constants/lib/vm-ops';
import { VM_PRIMITIVE_OP } from '@glimmer/constants/lib/syscall-ops';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { dict, StackImpl as Stack } from '@glimmer/util/lib/collections';
import { ARG_SHIFT, MACHINE_MASK, OPERAND_LEN_MASK, TYPE_MASK } from '@glimmer/vm/lib/flags';

import type { HighLevelStatementOp, PushStatementOp } from '../syntax/compilers';

import { encodeOp } from '../opcode-builder/encoder';
import { withLexicalScopeAtRuntime } from '../opcode-builder/helpers/resolution';
import { HighLevelOperands } from '../opcode-builder/operands';
import { compileSexp } from '../syntax/compilers';
import { ensureLegacyOps } from '../syntax/legacy';

/**
 * Ahead-of-time compilation records the words the encoder would write to
 * the heap, plus everything the loader must patch at load time:
 *
 * - `constantRefs`: word positions that hold a local constant index. The
 *   loader interns the constant into the context's pool and writes the
 *   real handle.
 * - `stdlibRefs`: word positions that hold a stdlib routine handle.
 * - nested blocks: constants of kind `block` point at another recorded
 *   program in the same unit.
 *
 * Labels are resolved here, since jump targets are relative.
 */
export interface RecordedProgram {
  words: number[];
  size: number;
  constantRefs: number[];
  stdlibRefs: Array<[position: number, routine: string]>;
}

export type RecordedConstant =
  | { kind: 'value'; value: unknown }
  | { kind: 'array'; value: unknown[] }
  | { kind: 'block'; program: number; parameters: number[] }
  | { kind: 'ref'; ref: AotRef };

/**
 * A value the template reads from its `scope` at load time, by position.
 * The build tool renames scope keys to their JavaScript identifiers, so a
 * key is not stable, but the order is.
 */
export interface AotRef {
  index: number;
}

export const AOT_REF: unique symbol = Symbol('aot-ref');

export interface AotRefValue {
  [AOT_REF]: AotRef;
}

export function aotRef(ref: AotRef): AotRefValue {
  return { [AOT_REF]: ref };
}

function isAotRef(value: unknown): value is AotRefValue {
  return typeof value === 'object' && value !== null && AOT_REF in value;
}

/**
 * Recorded handles carry this offset. A resolution continuation passes a
 * handle back to the encoder as a plain number, so the encoder needs to
 * tell a handle from a register or a count.
 */
export const HANDLE_BASE = 1 << 28;

export interface RecordedUnit {
  programs: RecordedProgram[];
  constants: RecordedConstant[];
}

/**
 * Collects constants for one unit. Values dedupe the way `ConstantsImpl`
 * dedupes them, so the loader can intern the list in order.
 */
export class RecordingConstants implements CompileTimeConstants {
  readonly entries: RecordedConstant[] = [];
  private index = new Map<unknown, number>();

  value(value: unknown): number {
    let found = this.index.get(value);

    if (found !== undefined) {
      return found;
    }

    let entry: RecordedConstant = isAotRef(value)
      ? { kind: 'ref', ref: value[AOT_REF] }
      : { kind: 'value', value };

    let handle = HANDLE_BASE + this.entries.push(entry) - 1;
    this.index.set(value, handle);
    return handle;
  }

  array(values: unknown[]): number {
    let handles = values.map((value) => this.value(value));
    let key = 'array:' + handles.join(',');
    let found = this.index.get(key);

    if (found !== undefined) {
      return found;
    }

    let handle = HANDLE_BASE + this.entries.push({ kind: 'array', value: values }) - 1;
    this.index.set(key, handle);
    return handle;
  }

  block(program: number, parameters: number[]): number {
    return HANDLE_BASE + this.entries.push({ kind: 'block', program, parameters }) - 1;
  }

  toPool(): unknown[] {
    throw new Error('A recording constant pool has no runtime pool');
  }
}

class Labels {
  labels: Dict<number> = dict();
  targets: Array<{ at: number; target: string }> = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  target(at: number, target: string) {
    this.targets.push({ at, target });
  }

  patch(words: number[]): void {
    for (const { at, target } of this.targets) {
      let address = expect(this.labels[target], `unknown label ${target}`) - at;
      words[at] = address;
    }
  }
}

export class AotEncoder implements Encoder {
  readonly words: number[] = [];
  readonly constantRefs: number[] = [];
  readonly stdlibRefs: Array<[number, string]> = [];

  private labelsStack = new Stack<Labels>();
  private errors: EncoderError[] = [];

  constructor(
    private constants: RecordingConstants,
    private meta: BlockMetadata,
    private compileBlock: (block: SerializedInlineBlock | SerializedBlock) => number
  ) {}

  error(error: EncoderError): void {
    this.words.push(VM_PRIMITIVE_OP | (1 << ARG_SHIFT), 0);
    this.errors.push(error);
  }

  commit(size: number): HandleResult {
    this.words.push(VM_RETURN_OP | MACHINE_MASK);

    if (this.errors.length > 0) {
      throw new Error(
        `Cannot compile ahead of time: ${this.errors.map((error) => error.problem).join('; ')}`
      );
    }

    // The loader receives the words directly; the handle is a placeholder.
    void size;
    return 0;
  }

  push(
    _constants: CompileTimeConstants,
    type: BuilderOpcode,
    ...args: SingleBuilderOperand[]
  ): void {
    let machine = isMachineOp(type) ? MACHINE_MASK : 0;
    this.words.push(type | machine | (args.length << ARG_SHIFT));

    for (let i = 0; i < args.length; i++) {
      this.operand(args[i]);
    }
  }

  private pushHandle(handle: number): void {
    this.constantRefs.push(this.words.length);
    this.words.push(handle - HANDLE_BASE);
  }

  private operand(operand: SingleBuilderOperand): void {
    if (typeof operand === 'number') {
      if (operand >= HANDLE_BASE) {
        this.pushHandle(operand);
      } else {
        this.words.push(operand);
      }
      return;
    }

    if (typeof operand === 'object' && operand !== null) {
      if (Array.isArray(operand)) {
        this.pushHandle(this.constants.array(operand));
        return;
      }

      switch (operand.type) {
        case HighLevelOperands.Label:
          this.currentLabels.target(this.words.length, operand.value);
          this.words.push(-1);
          return;

        case HighLevelOperands.IsStrictMode:
          this.pushHandle(this.constants.value(this.meta.isStrictMode));
          return;

        case HighLevelOperands.DebugSymbols:
          this.pushHandle(this.constants.value(operand.value));
          return;

        case HighLevelOperands.Block: {
          let program = this.compileBlock(operand.value);
          let parameters = operand.value[1] ?? [];
          this.pushHandle(this.constants.block(program, parameters));
          return;
        }

        case HighLevelOperands.StdLib:
          this.stdlibRefs.push([this.words.length, operand.value.name]);
          this.words.push(-1);
          return;

        case HighLevelOperands.NonSmallInt:
        case HighLevelOperands.SymbolTable:
          this.pushHandle(this.constants.value(operand.value));
          return;

        case HighLevelOperands.Layout:
          throw new Error(
            'Cannot compile ahead of time: a layout operand needs a resolver, which only loose mode templates have'
          );
      }
    }

    this.pushHandle(this.constants.value(operand));
  }

  private get currentLabels(): Labels {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }

  label(name: string) {
    this.currentLabels.label(name, this.words.length + 1);
  }

  startLabels() {
    this.labelsStack.push(new Labels());
  }

  stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.words);
  }

  finish(size: number): RecordedProgram {
    return {
      words: this.words,
      size,
      constantRefs: this.constantRefs,
      stdlibRefs: this.stdlibRefs,
    };
  }
}

/**
 * The parts of an evaluation context that `encodeOp` reads while
 * compiling a strict template: the constant pool and a resolver, which
 * is always `null` here.
 */
function recordingContext(constants: RecordingConstants): EvaluationContext {
  return {
    program: { constants: constants as unknown as ProgramConstants },
    resolver: null,
  } as unknown as EvaluationContext;
}

export interface RecordOptions {
  meta: BlockMetadata;
  constants: RecordingConstants;
  programs: RecordedProgram[];
}

/**
 * Records one program. `build` pushes ops the same way the JIT compiler
 * does. Returns the program's index in `programs`. Nested blocks are
 * recorded first, so a block always has a lower index than its parent.
 */
export function recordProgram(
  build: (op: PushStatementOp) => void,
  size: number,
  options: RecordOptions
): number {
  let { meta, constants, programs } = options;
  let context = recordingContext(constants);

  let encoder = new AotEncoder(constants, meta, (block) =>
    recordProgram(
      (op) => {
        for (const statement of block[0]) {
          compileSexp(op, statement);
        }
      },
      0,
      options
    )
  );

  let pushOp = (...op: BuilderOp | HighLevelOp | HighLevelStatementOp) => {
    encodeOp(encoder, context, meta, op as BuilderOp | HighLevelOp);
  };

  withLexicalScopeAtRuntime(() => build(pushOp));
  encoder.commit(size);

  return programs.push(encoder.finish(size)) - 1;
}

export function recordStatements(
  statements: Statement[],
  size: number,
  options: RecordOptions
): number {
  // The statements come from `precompileJSON`, so their heads are numbers.
  ensureLegacyOps();

  return recordProgram(
    (op) => {
      for (const statement of statements) {
        compileSexp(op, statement);
      }
    },
    size,
    options
  );
}

/**
 * The syscall opcode numbers a program dispatches, in first-use order.
 * Machine ops need no handler.
 */
export function syscallsIn(words: readonly number[]): number[] {
  let seen = new Set<number>();
  let i = 0;

  while (i < words.length) {
    let word = words[i] as number;
    let argc = (word & OPERAND_LEN_MASK) >> ARG_SHIFT;

    if ((word & MACHINE_MASK) === 0) {
      seen.add(word & TYPE_MASK);
    }

    i += 1 + argc;
  }

  return [...seen];
}
