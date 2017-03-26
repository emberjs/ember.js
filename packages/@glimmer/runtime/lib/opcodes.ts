import { Opaque, Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, unreachable } from '@glimmer/util';
import { Tag } from '@glimmer/reference';
import { VM, UpdatingVM } from './vm';
import { Opcode, Environment } from './environment';
import { Constants } from './environment/constants';

export interface OpcodeJSON {
  type: number | string;
  guid?: Option<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
}

/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

export enum Register {
  // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
  'pc',

  // $1 or $ra (return address): pointer into `program` for the return
  'ra',

  // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
  'fp',

  // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
  'sp',

  // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
  's0',
  's1',

  // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
  't0',
  't1'
}

export const enum Op {
  /*
    Documentation TODO:

    Document the local variable layout in the stack
    diagram before-and-after.

    Document updating opcodes emitting from unreachable
    append opcode.

    Document the element stack, block stack and List
    block stack.
   */

  /**
   * This opcode should never be reached.
   */
  Bug,

  /// EXPRESSIONS

  /**
   * Operation: Evaluate a Helper.
   * Format:
   *   (Helper helper:#Function)
   * Operand Stack:
   *   ..., Arguments →
   *   ..., VersionedPathReference
   **/
  Helper,

  /**
   * Operation: Push function onto the stack.
   * Format:
   *   (Function function:#Function)
   * Operand Stack:
   *   ... →
   *   ..., #Function
   */
  Function,

  /**
   * Operation:
   *   Bind a variable represented by a symbol from
   *   a caller supplied argument.
   * Format:
   *   (SetVariable symbol:u32 offsetFromBase:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  BindVariable,

  /**
   * Operation:
   *   Bind the variable represented by a symbol from
   *   the value at the top of the stack.
   * Format:
   *   (SetVariable symbol:u32)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  SetVariable,

  /**
   * Operation:
   *   Push the contents of the variable represented by
   *   a symbol (a positional or named argument) onto
   *   the stack.
   * Format:
   *   (PushSymbol symbol:u32)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference
   */
  GetVariable,

  /**
   * Operation:
   *   Pop a VersionedPathReference from the top of the
   *   stack, and push a VersionedPathReference constructed
   *   by `.get(property)`.
   * Format:
   *   (GetProperty property:#string)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ..., VersionedPathReference
   */
  GetProperty,

  /**
   * Operation: Push the specified constant block onto the stack.
   * Format:
   *   (PushBlock block:Option<#InlineBlock>)
   * Operand Stack:
   *   ... →
   *   ..., Option<InlineBlock>
   */
  PushBlock,

  /**
   * Operation: Push the specified bound block onto the stack.
   * Format:
   *   (GetBlock block:u32)
   * Operand Stack:
   *   ... →
   *   ..., InlineBlock
   */
  GetBlock,

  /**
   * Operation:
   *   Push TRUE onto the stack if the specified block
   *   is bound and FALSE if it is not.
   * Format:
   *   (HasBlock block:u32)
   * Operand Stack:
   *   ... →
   *   ..., boolean
   */
  HasBlock,

  /**
   * Operation:
   *   Push TRUE onto the stack if the specified block
   *   is bound *and* has at least one specified formal
   *   parameter, and FALSE otherwise.
   * Format:
   *   (HasBlockParams block:u32)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference (boolean)
   */
  HasBlockParams,

  /**
   * Operation:
   *   Pop count `VersionedPathReference`s off the stack and
   *   construct a new ConcatReference from them (in reverse
   *   order).
   * Format:
   *   (Concat count:u32)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...] →
   *   ..., ConcatReference
   */
  Concat,

  /**
   * Operation:
   *   Push a number onto the stack.
   * Format:
   *   (Immediate number:u32)
   * Operand Stack:
   *   ... →
   *   ..., number
   */
  Immediate,

  /**
   * Operation:
   *   Push an Object constant onto the stack that is not
   *   a JavaScript primitive.
   * Format:
   *   (PushConstant constant:#Object)
   * Operand Stack:
   *   ... →
   *   ..., Opaque
   */
  Constant,

  /**
   * Operation:
   *   Wrap a JavaScript primitive in a reference and push it
   *   onto the stack.
   * Format:
   *   (PushPrimitive constant:#Primitive)
   * Operand Stack:
   *   ... →
   *   ..., Primitive
   * Description:
   *   The two high bits of the constant reference describe
   *   the kind of primitive:
   *
   *   00: number
   *   01: string
   *   10: true | false | null | undefined
   */
  PrimitiveReference,

  /**
   * Operation: Duplicate and push item from an offset in the stack.
   * Format:
   *   (Dup register:u32, offset:u32)
   * Operand Stack:
   *   ..., Opaque →
   *   ..., Opaque, Opaque
   */
  Dup,

  /**
   * Operation: Pop N items off the stack and throw away the value.
   * Format:
   *   (Pop)
   * Operand Stack:
   *   ..., Opaque, ..., Opaque →
   *   ...
   */
  Pop,

  /**
   * Operation: Load a value into a register
   * Format:
   *   (Load register:u32)
   * Operand Stack:
   *   ..., Opaque →
   *   ...
   */
  Load,

  /**
   * Operation: Fetch a value from a register
   * Format:
   *   (Fetch register:u32)
   * Operand Stack:
   *   ... →
   *   ..., Opaque
   */
  Fetch,

  /// PRELUDE & EXIT

  /**
   * Operation: Push a new root scope onto the scope stack.
   *
   * Format:
   *   (RootScope symbols:u32 bindCallerScope:bool)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
   *   A root scope has no parent scope, and therefore inherits no lexical
   *   variables. If `bindCallerScope` is `true`, the current scope remembers
   *   the caller scope (for yielding blocks).
   */
  RootScope,

  /**
   * Operation: Push a new child scope onto the scope stack.
   *
   * Format:
   *   (ChildScope)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
   *   A child scope inherits from the current parent scope, and therefore
   *   shares its lexical variables.
   */
  ChildScope,

  /**
   * Operation: Pop the current scope from the scope stack.
   * Format:
   *   (PopScope)
   * Operand Stack:
   *   ... →
   *   ...
   */
  PopScope,

  /**
   * Operation: Return to the previous frame.
   * Format:
   *   (Return)
   * Operand Stack:
   *   ..., address:number →
   *   ...
   */
  Return,

  /// HTML

  /**
   * Operation: Append a Text node with value `contents`
   * Format:
   *   (Text contents:#string)
   * Operand Stack:
   *   ... →
   *   ...
   */
  Text,

  /**
   * Operation: Append a Comment node with value `contents`
   * Format:
   *   (Comment contents:#string)
   * Operand Stack:
   *   ... →
   *   ...
   */
  Comment,

  /**
   * Operation: Append a Dynamic node based on .
   * Format:
   *   (DynamicContent contents:#DynamicContent)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   * Description:
   *   Dynamic content can produce any kind of Node or an
   *   fragment of HTML. If the VersionedPathReference
   *   changes to a different kind of content, the original
   *   node(s) are cleared and replaced with the value of
   *   the new content.
   *
   *   The dynamic content can also produce a component
   *   definition, which requires more fancy footwork.
   */
  DynamicContent,

  /**
   * Operation: Open a new Element named `tag`.
   * Format:
   *   (OpenElement tag:#string)
   * Operand Stack:
   *   ... →
   *   ...
   */
  OpenElement,

  /**
   * Operation:
   *   Open a new Element named `tag` with special operations provided
   *   on the stack.
   * Format:
   *   (OpenElementWithOperations tag:#string)
   * Operand Stack:
   *   ..., ElementOperations →
   *   ...
   */
  OpenElementWithOperations,

  /**
   * Operation:
   *   Open a new Element with a name on the stack and with special
   *   operations provided on the stack.
   * Format:
   *   (OpenDynamicElement)
   * Operand Stack:
   *   ..., string, ElementOperations →
   *   ...
   */
  OpenDynamicElement,

  /**
   * Operation: Add an attribute to the current Element.
   * Format:
   *   (StaticAttr name:#string value:#string namespace:Option<#string>)
   * Operand Stack:
   *   ... →
   *   ...
   */
  StaticAttr,

  /**
   * Operation:
   *   Add an attribute to the current element using the value
   *   at the top of the stack.
   *
   * Format:
   *   (DynamicAttr name:#string trusting:boolean)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   * Description:
   *   If `trusting` is false, the host may sanitize the attribute
   *   based upon known risks.
   */
  DynamicAttr,

  /**
   * Operation:
   *   Add an attribute to the current element using the value
   *   at the top of the stack.
   *
   * Format:
   *   (DynamicAttrNS name:#string namespace:#string trusting:boolean)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   * Description:
   *   If `trusting` is false, the host may sanitize the attribute
   *   based upon known risks.
   */
  DynamicAttrNS,

  /**
   * Operation: Finish setting attributes on the current element.
   *
   * Format:
   *   (FlushElement)
   * Operand Stack:
   *   ... →
   *   ...
   */
  FlushElement,

  /**
   * Operation: Close the current element.
   *
   * Format:
   *   (CloseElement)
   * Operand Stack:
   *   ... →
   *   ...
   */
  CloseElement,

  /// MODIFIER
  Modifier,                  // (ConstantString, ConstantOther<ModifierManager>, ConstantExpression)

  /// WORMHOLE
  PushRemoteElement,         // ()
  PopRemoteElement,          // ()

  /// DYNAMIC SCOPE

  /**
   * Operation: Bind stack values as dynamic variables.
   * Format:
   *   (BindDynamicScope names:#Array<#string>)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...] →
   *   ...
   * Description:
   *   This is used to expose `-with-dynamic-vars`, and is a
   *   niche feature.
   */
  BindDynamicScope,

  PushDynamicScope,          // ()
  PopDynamicScope,           // ()

  /// VM

  /**
   * Operation: Compile the InlineBlock at the top of the stack.
   * Format:
   *   (CompileDynamicBlock)
   * Operand Stack:
   *   ..., InlineBlock →
   *   ..., CompiledDynamicBlock
   */
  CompileDynamicBlock,

  /**
   * Operation: Evaluate the specified block.
   * Format:
   *   (InvokeStatic block:#InlineBlock)
   * Operand Stack:
   *   ... →
   *   ...
   */
  InvokeStatic,

  /**
   * Operation: Evaluate the block at the top of the stack.
   * Format:
   *   (InvokeDynamic invoker:#FunctionInvoker)
   * Operand Stack:
   *   ..., InlineBlock, [ VersionedPathReference... ], VersionedPathReference →
   *   ...
   */
  InvokeDynamic,

  /**
   * Operation: Jump to the specified offset.
   *
   * Format:
   *   (Jump to:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  Jump,

  /**
   * Operation:
   *   Jump to the specified offset if the value at
   *   the top of the stack is true.
   *
   * Format:
   *   (JumpIf to:u32)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  JumpIf,

  /**
   * Operation:
   *   Jump to the specified offset if the value at
   *   the top of the stack is false.
   *
   * Format:
   *   (JumpUnless to:u32)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  JumpUnless,

  /**
   * Operation: Push a stack frame
   *
   * Format:
   *   (PushFrame)
   * Operand Stack:
   *   ... →
   *   $ra, $fp
   */
  PushFrame,

  /**
   * Operation: Pop a stack frame
   *
   * Format:
   *   (PushFrame)
   * Operand Stack:
   *   $ra, $fp →
   *   ...
   */
  PopFrame,

  /**
   * Operation:
   *   Start tracking a new output block that could change
   *   if one of its inputs changes.
   *
   * Format:
   *   (Enter args:u32)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
   *   Soon after this opcode, one of Jump, JumpIf,
   *   or JumpUnless will produce an updating assertion.
   *   If that assertion fails, the appending VM will
   *   be re-entered, and the instructions from `from`
   *   to `to` will be executed.
   *
   *   TODO: Save and restore.
   */
  Enter,

  /**
   * Operation:
   *   Finish tracking the current block.
   *
   * Format:
   *   (Exit)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
   *   This finalizes the validators that the updating
   *   block must check to determine whether it's safe to
   *   skip running the contents.
   */
  Exit,

  /**
   * Operation: Convert the top of the stack into a boolean reference.
   *
   * Format:
   *   (Test test:#function)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., VersionedPathReference<bool>
   * Description:
   *   TODO: ToBoolean should be global in the env
   */
  Test,

  /// LISTS

  /**
   * Operation: Enter a list.
   *
   * Format:
   *   (EnterList address:u32)
   * Operand Stack:
   *   ..., Iterator →
   *   ...
   */
  EnterList,

  /**
   * Operation: Exit the current list.
   *
   * Format:
   *   (ExitList)
   * Operand Stack:
   *   ... →
   *   ...
   */
  ExitList,

  /**
   * Operation:
   *   Convert an operand and key into an iterator and
   *   presence reference.
   *
   * Format:
   *   (PutIterator)
   * Operand Stack:
   *   ..., key:string, list:VersionedPathReference →
   *   ..., iterator:ReferenceIterator, present:PresenceReference
   */
  PutIterator,

  /**
   * Operation:
   *   Set up the stack for iterating for a given key,
   *   or jump to `end` if there is nothing left to
   *   iterate.
   *
   * Format:
   *   (Iterate end:u32)
   * Operand Stack:
   *   Form 1: (something to iterate)
   *   ... →
   *   ..., VersionedPathReference, VersionedPathReference, string
   *   Form 2: (nothing left to iterate)
   *   ... →
   *   ...
   * Description:
   *   In Form 1, the stack will have (in reverse order):
   *
   *   - the key, as a string
   *   - the current iterated value
   *   - the memoized iterated value
   */
  Iterate,

  /// COMPONENTS

  /**
   * Operation: Push an appropriate component manager onto the stack.
   *
   * Format:
   *   (PushComponentManager #ComponentDefinition)
   * Operand Stack:
   *   ... →
   *   ..., ComponentDefinition, ComponentManager
   */
  PushComponentManager,

  /**
   * Operation:
   *   Push an appropriate component manager onto the stack from
   *   a runtime-resolved component definition.
   *
   * Format:
   *   (PushDynamicComponentManager)
   * Operand Stack:
   *   ... Reference<ComponentDefinition> →
   *   ..., ComponentDefinition, ComponentManager
   */
  PushDynamicComponentManager,

  /**
   * Operation: push component metadata onto the stack.
   *
   * Format:
   *   (InitializeComponentState)
   * Operand Stack:
   *   ..., ComponentDefinition<T>, ComponentManager<T> →
   *   ..., ComponentState
   */
  InitializeComponentState,

  /**
   * Operation: Push a user representation of args onto the stack.
   *
   * Format:
   *   (PushArgs positional:u32 synthetic:boolean)
   *
   * Operand Stack:
   *   ..., [VersionedPathReference ...], #Array<string> →
   *   ..., [VersionedPathReference ...], #Array<string>, Arguments
   *
   * Description:
   *   This arguments object is only necessary when calling into
   *   user-specified hooks. It is meant to be implemented as a
   *   transient proxy that reads into the stack as needed.
   *   Holding onto the Arguments after the call has completed is
   *   illegal.
   */
  PushArgs,

  /**
   * Operation: ...
   * Format:
   *   (PrepareArgs state:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  PrepareArgs,

  /**
   * Operation: Create the component and push it onto the stack.
   * Format:
   *   (CreateComponent flags:u32 state:u32)
   *   ... →
   *   ...
   * Description:
   * Operand Stack:
   *   Flags:
   *
   *   * 0b001: Has a default block
   *   * 0b010: Has an inverse block
   */
  CreateComponent,

  /**
   * Operation: Register a destructor for the current component
   *
   * Format:
   *   (RegisterComponentDestructor state:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  RegisterComponentDestructor,

  /**
   * Operation: Push a new ElementOperations for the current component.
   *
   * Format:
   *   (PushComponentOperations)
   * Operand Stack:
   *   ... →
   *   ...
   */
  PushComponentOperations,

  /**
   * Operation: Push the component's `self` onto the stack.
   *
   * Format:
   *   (GetComponentSelf state:u32)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference
   */
  GetComponentSelf,

  /**
   * Operation: Get a slice of opcodes to invoke.
   *
   * Format:
   *   (GetComponentLayout state:u32)
   * Operand Stack:
   *   ... →
   *   ..., Layout
   */
  GetComponentLayout,

  /**
   * Operation: Begin a new cache group
   *
   * Format:
   *   (BeginComponentTransaction)
   * Operand Stack:
   *   ..., ComponentManager<T>, T →
   *   ..., ComponentManager<T>, T
   */
  BeginComponentTransaction,

  /**
   * Operation: Commit the current cache group
   *
   * Format:
   *   (CommitComponentTransaction)
   * Operand Stack:
   *   ... →
   *   ...
   */
  CommitComponentTransaction,

  /**
   * Operation: Invoke didCreateElement on the current component manager
   *
   * Format:
   *   (DidCreateElement state:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  DidCreateElement,

  /**
   * Operation: Invoke didRenderLayout on the current component manager
   *
   * Format:
   *   (DidRenderLayout state:u32)
   * Operand Stack:
   *   ..., →
   *   ...
   */
  DidRenderLayout,

  /// PARTIALS

  /**
   * Operation: Extract the template from a partial definition
   *
   * Format:
   *   (GetPartialTemplate)
   * Operand Stack:
   *   ..., PartialDefinition →
   *   ..., Program
   */
  GetPartialTemplate,

  /**
   * Operation:
   *   Resolve {{foo}} inside a partial, which could be either a self-lookup
   *   or a local variable that is in-scope for the caller.
   *
   * Format:
   *   (ResolveMaybeLocal local:#string)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference
   */
  ResolveMaybeLocal,

  /// DEBUGGER

  /**
   * Operation: Activate the debugger
   *
   * Format:
   *   (Debugger symbols:#Array<string> evalInfo:#Array<number>)
   * Operand Stack:
   *   ... →
   *   ...
   */
  Debugger,

  /** The size of the opcode list */
  Size
}

export type Operand1 = number;
export type Operand2 = number;
export type Operand3 = number;

export type EvaluateOpcode = (vm: VM, opcode: Opcode) => void;

export class AppendOpcodes {
  private evaluateOpcode: EvaluateOpcode[] = fillNulls<EvaluateOpcode>(Op.Size).slice();

  add<Name extends Op>(name: Name, evaluate: EvaluateOpcode): void {
    this.evaluateOpcode[name as number] = evaluate;
  }

  evaluate(vm: VM, opcode: Opcode, type: number) {
    let func = this.evaluateOpcode[type];
    // console.log(...debug(vm.constants, type, opcode.op1, opcode.op2, opcode.op3));
    func(vm, opcode);
  }
}

export const APPEND_OPCODES = new AppendOpcodes();

export abstract class AbstractOpcode {
  public type: string;
  public _guid: number;

  constructor() {
    initializeGuid(this);
  }
}

export abstract class UpdatingOpcode extends AbstractOpcode {
  public tag: Tag;

  next: Option<UpdatingOpcode> = null;
  prev: Option<UpdatingOpcode> = null;

  abstract evaluate(vm: UpdatingVM): void;
}

export type UpdatingOpSeq = ListSlice<UpdatingOpcode>;
