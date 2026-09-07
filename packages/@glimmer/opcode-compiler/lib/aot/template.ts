import type {
  BlockMetadata,
  BlockSymbolTable,
  CompilableBlock,
  CompilableProgram,
  EvaluationContext,
  HandleResult,
  LayoutWithContext,
  ProgramSymbolTable,
  StdlibRoutine,
  SyscallHandler,
  TemplateFactory,
} from '@glimmer/interfaces';
import { encodeHandle } from '@glimmer/constants/lib/immediate';
import { APPEND_OPCODES } from '@glimmer/runtime/lib/opcodes';

import templateFactory, {
  type SerializedTemplateWithOps,
  type TemplateLayouts,
} from '../template-core';

/** A plain value: a string, a number, a symbol table, a debug symbol list. */
export const VALUE = 0;
/** A list of plain values, interned as one array constant. */
export const LIST = 1;
/** A nested block: the index of its program in the block, plus its parameters. */
export const BLOCK = 2;
/** An entry of the template's `scope`, by position. */
export const SCOPE = 3;

export type AotConstant =
  | [kind: typeof VALUE, value: unknown]
  | [kind: typeof LIST, values: unknown[]]
  | [kind: typeof BLOCK, program: number, parameters: number[]]
  | [kind: typeof SCOPE, index: number];

/**
 * One program compiled ahead of time: its words, its frame size, the word
 * positions that hold a local constant index, and the positions that hold
 * a stdlib routine handle. The loader patches both kinds of position when
 * it copies the words into a context's heap.
 */
export type AotProgram = [
  words: number[],
  size: number,
  constants: number[],
  stdlib: Array<[position: number, routine: StdlibRoutine]>,
];

/**
 * A block compiled ahead of time. It sits in the `block` slot of a
 * serialized template, where a wire format block would otherwise be. The
 * last program is the template itself; the others are its nested blocks.
 */
export type AotBlock = [
  symbols: string[],
  handlers: SyscallHandler[],
  programs: AotProgram[],
  constants: AotConstant[],
];

export type AotTemplate = SerializedTemplateWithOps<AotBlock>;

interface Loaded {
  handles: number[];
}

class AotNestedBlock implements CompilableBlock {
  readonly symbolTable: BlockSymbolTable;

  constructor(
    private program: number,
    parameters: number[],
    private loaded: Loaded,
    readonly meta: BlockMetadata
  ) {
    this.symbolTable = { parameters };
  }

  compile(): HandleResult {
    return this.loaded.handles[this.program] as number;
  }
}

class AotLayout implements CompilableProgram {
  readonly symbolTable: ProgramSymbolTable;
  readonly meta: BlockMetadata;
  private loaded = new WeakMap<EvaluationContext, Loaded>();
  private registered = false;

  constructor(
    private layout: LayoutWithContext<AotBlock>,
    private block: AotBlock,
    readonly moduleName: string
  ) {
    let symbols = block[0];

    this.symbolTable = { symbols };
    this.meta = {
      symbols: { locals: symbols, upvars: null },
      scopeValues: null,
      isStrictMode: layout.isStrictMode,
      moduleName,
      owner: null,
      size: symbols.length,
    };
  }

  compile(context: EvaluationContext): HandleResult {
    let loaded = this.loaded.get(context);

    if (loaded === undefined) {
      loaded = this.load(context);
      this.loaded.set(context, loaded);
    }

    return loaded.handles[loaded.handles.length - 1] as number;
  }

  private scopeValues: unknown[] | null = null;

  private scopeValue(index: number): unknown {
    let values = (this.scopeValues ??= Object.values(this.layout.scope?.() ?? {}));

    if (index >= values.length) {
      throw new Error(
        `${this.moduleName} was compiled with ${index + 1} values in scope, but has ${values.length}`
      );
    }

    return values[index];
  }

  private load(context: EvaluationContext): Loaded {
    let [, handlers, programs, entries] = this.block;

    if (!this.registered) {
      this.registered = true;

      for (const handler of handlers) {
        APPEND_OPCODES.register(handler);
      }
    }

    let { constants, heap } = context.program;
    let loaded: Loaded = { handles: [] };

    let constantHandles = entries.map((entry) => {
      switch (entry[0]) {
        case VALUE:
          return constants.value(entry[1]);
        case LIST:
          return constants.array(entry[1]);
        case BLOCK:
          return constants.value(new AotNestedBlock(entry[1], entry[2], loaded, this.meta));
        case SCOPE:
          return constants.value(this.scopeValue(entry[1]));
      }
    });

    for (const [recorded, size, constantRefs, stdlibRefs] of programs) {
      let words = recorded.slice();

      for (const at of constantRefs) {
        words[at] = encodeHandle(constantHandles[words[at] as number] as number);
      }

      // A routine loads into its own heap region, so resolve every routine
      // before this program claims its region.
      for (const [at, routine] of stdlibRefs) {
        words[at] = context.stdlib.handle(routine);
      }

      let handle = heap.malloc();

      for (const word of words) {
        heap.pushRaw(word);
      }

      heap.finishMalloc(handle, size);
      loaded.handles.push(handle);
    }

    return loaded;
  }
}

/**
 * The template factory for templates compiled ahead of time. The block is
 * already VM words, so no compiler runs in the browser. `wrapped` is the
 * block for the classic component layout, when the template needs one.
 */
export default function createAotTemplateFactory(
  serialized: AotTemplate,
  wrapped?: AotBlock
): TemplateFactory {
  let layouts: TemplateLayouts<AotBlock> = {
    asLayout: (layout, moduleName) => new AotLayout(layout, layout.block, moduleName),
    asWrappedLayout: (layout, moduleName) => {
      if (wrapped === undefined) {
        throw new Error(
          `${moduleName} was compiled ahead of time without a classic component layout`
        );
      }

      return new AotLayout(layout, wrapped, moduleName);
    },
  };

  return templateFactory(serialized, layouts);
}
