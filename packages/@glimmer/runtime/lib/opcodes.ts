import { Opaque, Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, unreachable } from '@glimmer/util';
import { Tag } from '@glimmer/reference';
import { VM, UpdatingVM } from './vm';
import { Opcode, Environment } from './environment';
import { Constants } from './environment/constants';
import { DEBUG, CI } from '@glimmer/local-debug-flags';

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

export function debugSlice(env: Environment, start: number, end: number) {
  if (!CI && DEBUG) {
    let { program, constants } = env;

    // console is not available in IE9
    if (typeof console === 'undefined') { return; }

    // IE10 does not have `console.group`
    if (typeof console.group !== 'function') { return; }

    (console as any).group(`%c${start}:${end}`, 'color: #999');

    for (let i=start; i<=end; i+=4) {
      let { type, op1, op2, op3 } = program.opcode(i);
      let [name, params] = debug(constants, type, op1, op2, op3);
      console.log(`${i}. ${logOpcode(name, params)}`);
    }

    console.groupEnd();
  }
}

function logOpcode(type: string, params: Option<Object>): string | void {
  if (!CI && DEBUG) {
    let out = type;

    if (params) {
      let args = Object.keys(params).map(p => ` ${p}=${json(params[p])}`).join('');
      out += args;
    }
    return `(${out})`;
  }
}

function json(param: Opaque) {
  if (typeof param === 'function') {
    return '<function>';
  }

  let string = JSON.stringify(param);
  if (string === undefined) return 'undefined';

  let debug = JSON.parse(string);
  if (typeof debug === 'object' && debug && debug['GlimmerDebug']) {
    return debug['GlimmerDebug'];
  }

  return string;
}

function debug(c: Constants, op: Op, op1: number, op2: number, op3: number): [string, object] {
  if (!CI && DEBUG) {
    switch (op) {
      case Op.Bug: throw unreachable();

      case Op.Helper: return ['Helper', { helper: c.getFunction(op1) }];
      case Op.Function: return ['Function', { function: c.getFunction(op1) }];
      case Op.SetVariable: return ['SetVariable', { symbol: op1 }];
      case Op.GetVariable: return ['GetVariable', { symbol: op1 }];
      case Op.GetProperty: return ['GetProperty', { key: c.getString(op1) }];
      case Op.PushBlock: return ['PushBlock', { block: c.getBlock(op1) }];
      case Op.GetBlock: return ['GetBlock', { symbol: op1 }];
      case Op.HasBlock: return ['HasBlock', { block: op1 }];
      case Op.HasBlockParams: return ['HasBlockParams', { block: op1 }];
      case Op.Concat: return ['Concat', { size: op1 }];
      case Op.Immediate: return ['Immediate', { value: op1 }];
      case Op.Constant: return ['Constant', { value: c.getOther(op1) }];
      case Op.PrimitiveReference: return ['PrimitiveReference', { primitive: op1 }];
      case Op.Dup: return ['Dup', { register: Register[op1], offset: op2 }];
      case Op.Pop: return ['Pop', { count: op1 }];
      case Op.Load: return ['Load', { register: Register[op1] }];
      case Op.Fetch: return ['Fetch', { register: Register[op1] }];

      /// PRELUDE & EXIT
      case Op.RootScope: return ['RootScope', { symbols: op1, bindCallerScope: !!op2 }];
      case Op.ChildScope: return ['ChildScope', {}];
      case Op.PopScope: return ['PopScope', {}];
      case Op.Return: return ['Return', {}];

      /// HTML
      case Op.Text: return ['Text', { text: c.getString(op1) }];
      case Op.Comment: return ['Comment', { comment: c.getString(op1) }];
      case Op.DynamicContent: return ['DynamicContent', { value: c.getOther(op1) }];
      case Op.OpenElement: return ['OpenElement', { tag: c.getString(op1) }];
      case Op.OpenElementWithOperations: return ['OpenElementWithOperations', { tag: c.getString(op1) }];
      case Op.OpenDynamicElement: return ['OpenDynamicElement', {}];
      case Op.StaticAttr: return ['StaticAttr', { name: c.getString(op1), value: c.getString(op2), namespace: op3 ? c.getString(op3) : null }];
      case Op.DynamicAttr: return ['DynamicAttr', { name: c.getString(op1), trusting: !!op2 }];
      case Op.DynamicAttrNS: return ['DynamicAttrNS', { name: c.getString(op1), ns: c.getString(op2), trusting: !!op2 }];
      case Op.FlushElement: return ['FlushElement', {}];
      case Op.CloseElement: return ['CloseElement', {}];

      /// MODIFIER
      case Op.Modifier: return ['Modifier', {}];

      /// WORMHOLE
      case Op.PushRemoteElement: return ['PushRemoteElement', {}];
      case Op.PopRemoteElement: return ['PopRemoteElement', {}];

      /// DYNAMIC SCOPE
      case Op.BindDynamicScope: return ['BindDynamicScope', {}];
      case Op.PushDynamicScope: return ['PushDynamicScope', {}];
      case Op.PopDynamicScope: return ['PopDynamicScope', {}];

      /// VM
      case Op.CompileDynamicBlock: return ['CompileDynamicBlock', {}];
      case Op.InvokeStatic: return ['InvokeStatic', { block: c.getBlock(op1) }];
      case Op.InvokeDynamic: return ['InvokeDynamic', { invoker: c.getOther(op1) }];
      case Op.Jump: return ['Jump', { to: op1 }];
      case Op.JumpIf: return ['JumpIf', { to: op1 }];
      case Op.JumpUnless: return ['JumpUnless', { to: op1 }];
      case Op.PushFrame: return ['PushFrame', {}];
      case Op.PopFrame: return ['PopFrame', {}];
      case Op.Enter: return ['Enter', { args: op1 }];
      case Op.Exit: return ['Exit', {}];
      case Op.Test: return ['ToBoolean', {}];

      /// LISTS
      case Op.EnterList: return ['EnterList', { start: op1 }];
      case Op.ExitList: return ['ExitList', {}];
      case Op.PutIterator: return ['PutIterator', {}];
      case Op.Iterate: return ['Iterate', { end: op1 }];

      /// COMPONENTS
      case Op.PushComponentManager: return ['PushComponentManager', { definition: c.getOther(op1) }];
      case Op.PushDynamicComponentManager: return ['PushDynamicComponentManager', {}];
      case Op.InitializeComponentState: return ['InitializeComponentState', {}];
      case Op.PushArgs: return ['PushArgs', { positional: op1, synthetic: !!op2 }];
      case Op.PrepareArgs: return ['PrepareArgs', { state: Register[op1] }];
      case Op.CreateComponent: return ['CreateComponent', { flags: op1, state: Register[op2] }];
      case Op.RegisterComponentDestructor: return ['RegisterComponentDestructor', {}];
      case Op.PushComponentOperations: return ['PushComponentOperations', {}];
      case Op.GetComponentSelf: return ['GetComponentSelf', { state: Register[op1] }];
      case Op.GetComponentLayout: return ['GetComponentLayout', { state: Register[op1] }];
      case Op.BeginComponentTransaction: return ['BeginComponentTransaction', {}];
      case Op.CommitComponentTransaction: return ['CommitComponentTransaction', {}];
      case Op.DidCreateElement: return ['DidCreateElement', { state: Register[op1] }];
      case Op.DidRenderLayout: return ['DidRenderLayout', {}];

      /// PARTIALS
      case Op.GetPartialTemplate: return ['CompilePartial', {}];
      case Op.ResolveMaybeLocal: return ['ResolveMaybeLocal', { name: c.getString(op1)} ];

      /// DEBUGGER
      case Op.Debugger: return ['Debugger', { symbols: c.getOther(op1), evalInfo: c.getArray(op2) }];

      /// STATEMENTS

      case Op.Size: throw unreachable();
    }

    throw unreachable();
  }

  return ['', {}];
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
    if (!CI && DEBUG) {
      let [name, params] = debug(vm.constants, opcode.type, opcode.op1, opcode.op2, opcode.op3);
      console.log(`${vm['pc'] - 4}. ${logOpcode(name, params)}`);
      // console.log(...debug(vm.constants, type, opcode.op1, opcode.op2, opcode.op3));
    }

    func(vm, opcode);

    if (!CI && DEBUG) {
      console.log('%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O', 'color: orange', vm['pc'], vm['ra'], vm['fp'], vm['sp'], vm['s0'], vm['s1'], vm['t0'], vm['t1']);
      console.log('%c -> eval stack', 'color: red', vm.stack.toArray());
      console.log('%c -> scope', 'color: green', vm.scope()['slots'].map(s => s && s['value'] ? s['value']() : s));
      console.log('%c -> elements', 'color: blue', vm.elements()['elementStack'].toArray());
    }
  }
}

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
  public tag: Tag;

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
