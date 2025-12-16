import type { BlockMetadata, ProgramConstants, ProgramHeap } from '@glimmer/interfaces';
import { decodeHandle } from '@glimmer/constants';

import type { RawDisassembledOperand } from '../debug';
import type {
  NonNullableOperandType,
  NormalizedOperand,
  NullableOperandType,
  OperandType,
} from './operand-types';

import { decodeCurry, decodePrimitive, decodeRegister } from '../decoders';

interface DisassemblyState {
  readonly offset: number;
  readonly label: NormalizedOperand;
  readonly value: number;
  readonly constants: ProgramConstants;
  readonly heap: ProgramHeap;
  readonly meta: BlockMetadata | null;
}

export type OperandDisassembler = (options: DisassemblyState) => RawDisassembledOperand;

const todo: OperandDisassembler = ({ label, value }) => ['error:operand', value, { label }];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Left<D extends Disassembler<any>> =
  D extends Disassembler<infer Added> ? Exclude<OperandType, Added> : never;

type AllOperands = OperandType;

class Disassembler<in out Added extends OperandType> {
  static build(
    builder: (disassembler: Disassembler<never>) => Disassembler<AllOperands>
  ): Record<OperandType, OperandDisassembler> {
    return builder(new Disassembler()).#disms as Record<OperandType, OperandDisassembler>;
  }

  readonly #disms: Record<string, OperandDisassembler>;

  private constructor() {
    this.#disms = {};
  }

  addNullable<const K extends Left<this> & NullableOperandType>(
    names: K[],
    dism: OperandDisassembler
  ): Disassembler<Added | K | `${K}?`> {
    for (const name of names) {
      this.#disms[name] = dism;
      this.#disms[`${name}?`] = dism;
    }

    return this as Disassembler<Added | K | `${K}?`>;
  }

  add<const K extends Left<this> & NonNullableOperandType>(
    names: K[],
    dism: OperandDisassembler
  ): Disassembler<Added | K> {
    const add = (name: K, dism: OperandDisassembler) => (this.#disms[name] = dism);
    for (const name of names) {
      add(name, dism);
    }

    return this;
  }
}

export const OPERANDS = Disassembler.build((d) => {
  return d
    .add(['imm/u32', 'imm/i32', 'imm/u32{todo}', 'imm/i32{todo}'], ({ value }) => ['number', value])
    .add(['const/i32[]'], ({ value, constants }) => [
      'array',
      constants.getArray<number>(value),
      { kind: Number },
    ])
    .add(['const/bool'], ({ value }) => ['boolean', !!value])
    .add(['imm/bool'], ({ value, constants }) => [
      'boolean',
      constants.getValue<boolean>(decodeHandle(value)),
    ])
    .add(['handle'], ({ constants, value }) => ['constant', constants.getValue<number>(value)])
    .add(['handle/block'], ({ value, heap }) => ['instruction', heap.getaddr(value)])
    .add(['imm/pc'], ({ value }) => ['instruction', value])
    .add(['const/any[]'], ({ value, constants }) => ['array', constants.getArray<unknown[]>(value)])
    .add(['const/primitive'], ({ value, constants }) => [
      'primitive',
      decodePrimitive(value, constants),
    ])
    .add(['register'], ({ value }) => ['register', decodeRegister(value)])
    .add(['const/any'], ({ value, constants }) => ['dynamic', constants.getValue<unknown>(value)])
    .add(['variable'], ({ value, meta }) => {
      return ['variable', value, { name: meta?.symbols.lexical?.at(value) ?? null }];
    })
    .add(['register/instruction'], ({ value }) => ['instruction', value])
    .add(['imm/enum<curry>'], ({ value }) => ['enum<curry>', decodeCurry(value)])
    .addNullable(['const/str'], ({ value, constants }) => [
      'string',
      constants.getValue<string>(value),
    ])
    .addNullable(['const/str[]'], ({ value, constants }) => [
      'array',
      constants.getArray<string>(value),
      { kind: String },
    ])
    .add(['imm/block:handle'], todo)
    .add(['const/definition'], todo)
    .add(['const/fn'], todo)
    .add(['instruction/relative'], ({ value, offset }) => ['instruction', offset + value])
    .add(['register/sN'], todo)
    .add(['register/stack'], todo)
    .add(['register/tN'], todo)
    .add(['register/v0'], todo);
});
