import { LOGGER, Opaque, Option, Dict, Slice as ListSlice, initializeGuid, fillNulls } from 'glimmer-util';
import { RevisionTag, VersionedPathReference } from 'glimmer-reference';
import { VM, UpdatingVM } from './vm';
import { CompiledExpression, CompiledArgs } from './compiled/expressions';
import { NULL_REFERENCE, UNDEFINED_REFERENCE } from './references';
import { InlineBlock } from './scanner';
import { Opcode } from './environment';

export type Slice = [number, number];

export interface OpcodeJSON {
  type: number | string;
  guid?: Option<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
}

export function pretty(json: OpcodeJSON): string {
  return `${json.type}(${json.args ? json.args.join(', ') : ''})`;
}

export function defaultToJSON(opcode: AppendOpcode): OpcodeJSON {
  return { type: opcode[0] };
}

export const enum OpcodeName {
  PushChildScope,            // ()
  PopScope,                  // ()
  PushDynamicScope,          // ()
  PopDynamicScope,           // ()
  Put,                       // (ConstantReference)
  EvaluatePut,               // (ConstantExpression)
  PutArgs,                   // (ConstantExpression)
  BindPositionalArgs,        //
  BindNamedArgs,             // (ConstantArray<string>, ConstantArray<number>)
  BindBlocks,                // (ConstantArray<string>, ConstantArray<number>)
  BindPartialArgs,           // (number)
  BindCallerScope,           // ()
  BindDynamicScope,          // (ConstantArray<string>)
  Enter,                     // (ConstantSlice)
  Exit,                      // ()
  Evaluate,                  // (ConstantBlock)
  Jump,                      // (number)
  JumpIf,                    // (number)
  JumpUnless,                // (number)
  Test,                      // (ConstantFunction)
  OpenBlock,                 // (Other<CompiledGetBlock>, ConstantExpression)
  CloseBlock,                // ()
  PutDynamicComponent,       // ()
  PutComponent,              // (Other<ComponentDefinition>)
  OpenComponent,             // (ConstantExpression, ConstantBlock)
  DidCreateElement,          //
  ShadowAttributes,          // ()
  DidRenderLayout,           // ()
  CloseComponent,            // ()
  Text,                      // (ConstantString)
  Comment,                   // (ConstantString)
  DynamicContent,            // (Other<AppendDynamicOpcode>)
  OpenElement,               // (ConstantString)
  PushRemoteElement,         // ()
  PopRemoteElement,          // ()
  OpenComponentElement,      // (ConstantString)
  OpenDynamicElement,        // ()
  FlushElement,              // ()
  CloseElement,              // ()
  PopElement,                // ()
  StaticAttr,                // (ConstantString, ConstantString, ConstantString)
  Modifier,                  // (ConstantString, ConstantOther<ModifierManager>, ConstantExpression)
  DynamicAttrNS,             // (ConstantString, ConstantString, number)
  DynamicAttr,               // (ConstantString, number)
  PutIterator,               // ()
  EnterList,                 // (ConstantSlice)
  ExitList,                  // ()
  EnterWithKey,              // (ConstantSlice)
  NextIter,                  // (number)
  PutDynamicPartial,         // (Other<SymbolTable>)
  PutPartial,                // (Other<PartialDefinition>)
  EvaluatePartial            // (Other<SymbolTable>, Other<Dict<PartialBlock>>)
}

// export type OpcodeName =
//     "PushChildScope"            // ()
//   | "PopScope"                  // ()
//   | "PushDynamicScope"          // ()
//   | "PopDynamicScope"           // ()
//   | "Put"                       // (ConstantReference)
//   | "EvaluatePut"               // (ConstantExpression)
//   | "PutArgs"                   // (ConstantExpression)
//   | "BindPositionalArgs"        //
//   | "BindNamedArgs"             // (ConstantArray<string>, ConstantArray<number>)
//   | "BindBlocks"                // (ConstantArray<string>, ConstantArray<number>)
//   | "BindPartialArgs"           // (number)
//   | "BindCallerScope"           // ()
//   | "BindDynamicScope"          // (ConstantArray<string>)
//   | "Enter"                     // (ConstantSlice)
//   | "Exit"                      // ()
//   | "Evaluate"                  // (ConstantBlock)
//   | "Jump"                      // (number)
//   | "JumpIf"                    // (number)
//   | "JumpUnless"                // (number)
//   | "Test"                      // (ConstantFunction)
//   | "OpenBlock"                 // (Other<CompiledGetBlock>, ConstantExpression)
//   | "CloseBlock"                // ()
//   | "PutDynamicComponent"       // ()
//   | "PutComponent"              // (Other<ComponentDefinition>)
//   | "OpenComponent"             // (ConstantExpression, ConstantBlock)
//   | "DidCreateElement"          //
//   | "ShadowAttributes"          // ()
//   | "DidRenderLayout"           // ()
//   | "CloseComponent"            // ()
//   | "Text"                      // (ConstantString)
//   | "Comment"                   // (ConstantString)
//   | "DynamicContent"            // (Other<AppendDynamicOpcode>)
//   | "OpenElement"               // (ConstantString)
//   | "PushRemoteElement"         // ()
//   | "PopRemoteElement"          // ()
//   | "OpenComponentElement"      // (ConstantString)
//   | "OpenDynamicElement"        // ()
//   | "FlushElement"              // ()
//   | "CloseElement"              // ()
//   | "PopElement"                // ()
//   | "StaticAttr"                // (ConstantString, ConstantString, ConstantString)
//   | "Modifier"                  // (ConstantString, ConstantOther<ModifierManager>, ConstantExpression)
//   | "DynamicAttrNS"             // (ConstantString, ConstantString, number)
//   | "DynamicAttr"               // (ConstantString, number)
//   | "PutIterator"               // ()
//   | "EnterList"                 // (ConstantSlice)
//   | "ExitList"                  // ()
//   | "EnterWithKey"              // (ConstantSlice)
//   | "NextIter"                  // (number)
//   | "PutDynamicPartial"         // (Other<SymbolTable>)
//   | "PutPartial"                // (Other<PartialDefinition>)
//   | "EvaluatePartial"           // (Other<SymbolTable>, Other<Dict<PartialBlock>>)
//   ;

export type ConstantType = 'slice' | 'block' | 'reference' | 'string' | 'number' | 'expression';
export type ConstantReference =  number;
export type ConstantString = number;
export type ConstantExpression = number;
export type ConstantSlice = number;
export type ConstantBlock = number;
export type ConstantFunction = number;
export type ConstantArray = number;
export type ConstantOther = number;

export class Constants {
  // `0` means NULL

  private references: VersionedPathReference<Opaque>[] = [];
  private strings: string[] = [];
  private expressions: Opaque[] = [];
  private arrays: number[][] = [];
  private slices: Slice[] = [];
  private blocks: InlineBlock[] = [];
  private functions: Function[] = [];
  private others: Opaque[] = [];

  public NULL_REFERENCE: number;
  public UNDEFINED_REFERENCE: number;

  constructor() {
    this.NULL_REFERENCE = this.reference(NULL_REFERENCE);
    this.UNDEFINED_REFERENCE = this.reference(UNDEFINED_REFERENCE);
  }

  getReference<T extends Opaque>(value: ConstantReference): VersionedPathReference<T> {
    return this.references[value - 1] as VersionedPathReference<T>;
  }

  reference(value: VersionedPathReference<Opaque>): ConstantReference {
    let index = this.references.length;
    this.references.push(value);
    return index + 1;
  }

  getString(value: ConstantString): string {
    return this.strings[value - 1];
  }

  string(value: string): ConstantString {
    let index = this.strings.length;
    this.strings.push(value);
    return index + 1;
  }

  getExpression<T>(value: ConstantExpression): T {
    return this.expressions[value - 1] as T;
  }

  expression(value: CompiledExpression<Opaque> | CompiledArgs): ConstantExpression {
    let index = this.expressions.length;
    this.expressions.push(value);
    return index + 1;
  }

  getArray(value: ConstantArray): number[] {
    return this.arrays[value - 1];
  }

  array(values: number[]): ConstantArray {
    let index = this.arrays.length;
    this.arrays.push(values);
    return index + 1;
  }

  getSlice(value: ConstantSlice): Slice {
    return this.slices[value - 1];
  }

  slice(slice: Slice): ConstantSlice {
    // TODO: Put the entire program in one big array
    let index = this.slices.length;
    this.slices.push(slice);
    return index + 1;
  }

  getBlock(value: ConstantBlock): InlineBlock {
    return this.blocks[value - 1];
  }

  block(block: InlineBlock): ConstantBlock {
    let index = this.blocks.length;
    this.blocks.push(block);
    return index + 1;
  }

  getFunction<T extends Function>(value: ConstantFunction): T {
    return this.functions[value - 1] as T;
  }

  function(f: Function): ConstantFunction {
    let index = this.functions.length;
    this.functions.push(f);
    return index + 1;
  }

  getOther<T>(value: ConstantOther): T {
    return this.others[value - 1] as T;
  }

  other(other: Opaque): ConstantOther {
    let index = this.others.length;
    this.others.push(other);
    return index + 1;
  }
}

export type Operand1 = number;
export type Operand2 = number;
export type Operand3 = number;

export type OpcodeToJSON = (data: AppendOpcode, constants: Constants) => OpcodeJSON;
export type EvaluateOpcode = (vm: VM, opcode: Opcode) => void;

export class AppendOpcodes {
  private evaluateOpcode: EvaluateOpcode[] = fillNulls<EvaluateOpcode>(OpcodeName.EvaluatePartial + 1);

  add<Name extends OpcodeName>(name: Name, evaluate: EvaluateOpcode): void {
    this.evaluateOpcode[name as number] = evaluate;
  }

  construct<Name extends OpcodeName>(name: Name, _debug: Option<Object>, op1?: Operand1, op2?: Operand2, op3?: Operand3): AppendOpcode {
    return [(name as number)|0, (op1 || 0)|0, (op2 || 0)|0, (op3 || 0)|0];
  }

  evaluate(vm: VM, opcode: Opcode) {
    LOGGER.debug(`[VM] OPCODE: ${opcode.type}`);
    let func = this.evaluateOpcode[opcode.type];
    func(vm, opcode);
  }
}

export type AppendOpcode = [number, number, number, number];

export const APPEND_OPCODES = new AppendOpcodes();

export abstract class AbstractOpcode {
  public type: string;
  public _guid: number;

  constructor() {
    initializeGuid(this);
  }

  toJSON(): OpcodeJSON {
    return { guid: this._guid, type: this.type };
  }
}

export abstract class UpdatingOpcode extends AbstractOpcode {
  public tag: RevisionTag;

  next: Option<UpdatingOpcode> = null;
  prev: Option<UpdatingOpcode> = null;

  abstract evaluate(vm: UpdatingVM): void;
}

export type UpdatingOpSeq = ListSlice<UpdatingOpcode>;

export function inspect(opcodes: ReadonlyArray<AbstractOpcode>): string {
  let buffer: string[] = [];

  opcodes.forEach((opcode, i) => {
    _inspect(opcode.toJSON(), buffer, 0, i);
  });

  return buffer.join('');
}

function _inspect(opcode: OpcodeJSON, buffer: string[], level: number, index: number) {
  let indentation: string[] = [];

  for (let i=0; i<level; i++) {
    indentation.push('  ');
  }

  buffer.push(...indentation);
  buffer.push(`${index}. ${opcode.type}`);

  if (opcode.args || opcode.details) {
    buffer.push('(');

    if (opcode.args) {
      buffer.push(opcode.args.join(', '));
    }

    if (opcode.details) {
      let keys = Object.keys(opcode.details);

      if (keys.length) {
        if (opcode.args && opcode.args.length) {
          buffer.push(', ');
        }

        buffer.push(keys.map(key => `${key}=${opcode.details && opcode.details[key]}`).join(', '));
      }
    }

    buffer.push(')');
  }

  buffer.push('\n');

  if (opcode.children && opcode.children.length) {
    for (let i=0; i<opcode.children.length; i++) {
      _inspect(opcode.children[i], buffer, level+1, i);
    }
  }
}
