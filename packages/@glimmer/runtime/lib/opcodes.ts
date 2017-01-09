import { Opaque, Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, unreachable } from '@glimmer/util';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { VM, UpdatingVM } from './vm';
import { NULL_REFERENCE, UNDEFINED_REFERENCE } from './references';
import { InlineBlock } from './scanner';
import { Opcode, Environment } from './environment';

export interface OpcodeJSON {
  type: number | string;
  guid?: Option<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
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

  /// EXPRESSIONS

  /**
   * Operation: Evaluate a Helper.
   * Format:
   *   (Helper helper:#Function)
   * Operand Stack:
   *   ..., ReifiedArgs →
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
   * Operation: Push the current Self onto the stack.
   * Format:
   *   (PushSelf)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference
   */
  Self,

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
   * Operation: Push the specified constant blocks onto the stack.
   * Format:
   *   (PushBlocks default:Option<#InlineBlock> inverse:Option<#InlineBlock>)
   * Operand Stack:
   *   Form 1:
   *   ... →
   *   ..., InlineBlock
   *   Form 2:
   *   ... →
   *   ..., InlineBlock, InlineBlock
   */
  PushBlocks,

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
   * Operation: Push a JavaScript primitive onto the stack.
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
  Primitive,

  /**
   * Operation:
   *   Set the value at the top of the stack as a local.
   * Format:
   *   (SetLocal offset:u32)
   * Operand Stack:
   *   ..., Opaque →
   *   ...
   */
  SetLocal,

  /**
   * Operation:
   *   Push the local at `offset` onto the stack.
   * Format:
   *   (GetLocal offset:u32)
   * Operand Stack:
   *   ... →
   *   ..., Opaque
   */
  GetLocal,

  /**
   * Operation: Pop the stack and throw away the value.
   * Format:
   *   (Pop)
   * Operand Stack:
   *   ..., Opaque →
   *   ...
   */
  Pop,

  /// EVAL

  PushEvalNames,             // (number)
  GetEvalName,               // (ConstantString)
  GetEvalBlock,              // (ConstantString)
  PutEvalledExpr,            // ()
  PutEvalledArgs,            // ()
  BindPartialArgs,           // (number)
  PutDynamicPartial,         // (Other<SymbolTable>)
  PutPartial,                // (Other<PartialDefinition>)
  EvaluatePartial,           // (Other<SymbolTable>, Other<Dict<PartialBlock>>)

  /// REIFY
  PushReifiedArgs,           // (number /* positional */, ConstantArray<string> /* names */, number /* block flags */)

  /// PRELUDE & EXIT

  /**
   * Operation: Reserve space for `count` locals
   * Format:
   *   (ReserveLocals count:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  ReserveLocals,

  /**
   * Operation: Release any reserved locals
   * Format:
   *   (ReleaseLocals)
   * Operand Stack:
   *   ... →
   *   ...
   */
  ReleaseLocals,

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
   * Operation:
   *   Push a new root scope onto the scope stack for a layout that is
   *   on the stack.
   *
   * Format:
   *   (VirtualRootScope bindCallerScope:bool)
   * Operand Stack:
   *   ..., Layout →
   *   ..., Layout
   * Description:
   *   A root scope has no parent scope, and therefore inherits no lexical
   *   variables. If `bindCallerScope` is `true`, the current scope remembers
   *   the caller scope (for yielding blocks).
   */
  VirtualRootScope,

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
   * Operation: Bind `self` from the stack into the current scope.
   * Format:
   *   (BindSelf)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  BindSelf,

  /**
   * Operation:
   *   Bind `count` positional args from the stack into the
   *   specified symbols in the current scope.
   * Format:
   *   (BindPositionalArgs count:u32)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...] →
   *   ...
   */
  BindPositionalArgs,

  /**
   * Operation:
   *  Bind `count` named args from the stack into the
   *  specified symbols and associate them with the
   *  same-index name in the current scope.
   * Format:
   *   (BindNamedArgs names:#Array<#string>, symbols:#Array<u32>)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...] →
   *   ...
   */
  BindNamedArgs,

  /**
   * Operation: Bind a named argument to the layout on the stack.
   * Format:
   *   (BindVirtualNamed layout:local symbol:#string)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  BindVirtualNamed,

  /**
   * Operation: Bind a block to the layout on the stack.
   * Format:
   *   (BindVirtualBlock layout:local block:u32)
   * Operand Stack:
   *   ..., InlineBlock →
   *   ...
   * Description:
   *   0: default
   *   1: inverse
   */
  BindVirtualBlock,

  /**
   * Operation:
   *  Bind `count` blocks from the stack into the
   *  specified symbols and associate them with the
   *  same-index name in the current scope.
   * Format:
   *   (BindBlocks names:#Array<#string>, symbols:#Array<u32>)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...] →
   *   ...
   */
  BindBlocks,

  /**
   * Operation:
   *   Bind the caller's scope into the current scope before pushing
   *   a new scope onto the scope stack.
   * Format:
   *   (BindCallerScope)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
   *   Should this change to using the caller's bp, which is already
   *   saved off?
   */
  BindCallerScope,

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
   * Operation: Evaluate the specified block.
   * Format:
   *   (InvokeStatic #InlineBlock)
   * Operand Stack:
   *   ... →
   *   ...
   */
  InvokeStatic,

  /**
   * Operation: Evaluate the block at the top of the stack.
   * Format:
   *   (InvokeVirtual)
   * Operand Stack:
   *   ..., InlineBlock →
   *   ...
   */
  InvokeVirtual,


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
   *   (Jump to:u32)
   * Operand Stack:
   *   ..., boolean →
   *   ...
   */
  JumpIf,

  /**
   * Operation:
   *   Jump to the specified offset if the value at
   *   the top of the stack is false.
   *
   * Format:
   *   (Jump to:u32)
   * Operand Stack:
   *   ..., boolean →
   *   ...
   */
  JumpUnless,

  /**
   * Operation:
   *   Start tracking a new output block that could change
   *   if one of its inputs changes.
   *
   * Format:
   *   (Enter from:u32 to:u32)
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
   * Operation: Convert the top of the stack into a boolean.
   *
   * Format:
   *   (ToBoolean test:#function)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ..., boolean
   * Description:
   *   TODO: ToBoolean should be global in the env
   */
  ToBoolean,

  /// LISTS

  /**
   * Operation: Enter a list.
   *
   * Format:
   *   (EnterList from:u32 to:u32)
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

  /**
   * Operation: Start iterating for a given key.
   *
   * Format:
   *   (StartIterate from:u32 to:u32)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   * Description:
   *   TODO: Merge with Iterate?
   */
  StartIterate,

  /// YIELD

  /**
   * Operation:
   *   Invoke the block that is at the top of the
   *   stack with `count` positional arguments.
   *
   * Format:
   *   (InvokeBlock count:u32)
   * Operand Stack:
   *   ..., [VersionedPathReference, [VersionedPathReference ...]], InlineBlock →
   *   ...
   */
  InvokeBlock,

  /**
   * Operation: Perform any post-call cleanup.
   *
   * Format:
   *   (DoneBlock)
   * Operand Stack:
   *   ... →
   *   ...
   */
  DoneBlock,

  /// COMPONENTS

  /**
   * Operation: Push an appropriate component manager onto the stack.
   *
   * Format:
   *   (PushComponentManager #ComponentDefinition)
   * Operand Stack:
   *   ... →
   *   ..., ComponentManager
   */
  PushComponentManager,

  /**
   * Operation: Set component metadata into a local.
   *
   * Format:
   *   (SetComponentState local:u32)
   * Operand Stack:
   *   ..., ComponentDefinition<T>, ComponentManager<T>, T →
   *   ...
   */
  SetComponentState,

  /**
   * Operation: Perform any post-call cleanup.
   *
   * Format:
   *   (PrepareComponentArgs)
   * Operand Stack:
   *   ..., ComponentManager →
   *   ..., ComponentManager
   */
  PrepareComponentArgs,

  /**
   * Operation: Push a user representation of args onto the stack.
   *
   * @Format:
   *   (PushComponentArgs positional:u32 named:u32 namedDict:#Dict<number>)
   *
   * Operand Stack:
   *   ... →
   *   ..., Arguments
   *
   * Description:
   *   This arguments object is only necessary when calling into
   *   user-specified hooks. It is meant to be implemented as a
   *   transient proxy that reads into the stack as needed.
   *   Holding onto the Arguments after the call has completed is
   *   illegal.
   */
  PushComponentArgs,

  /**
   * Operation: Create the component and push it onto the stack.
   * Format:
   *   (CreateComponent flags:u32 state:u32)
   * Operand Stack:
   *   ... →
   *   ...
   * Description:
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
   *   (RegisterComponentDestructor)
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
   * Operation: Get a slice of opcodes to invoke.
   *
   * Format:
   *   (GetComponentLayout)
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
   * Operation:
   *   Push the layout for the current component onto
   *   the stack.
   *
   * Format:
   *   (ComponentLayoutScope state:u32)
   * Operand Stack:
   *   ... →
   *   ..., InlineBlock
   */
  ComponentLayoutScope,

  /**
   * Operation: Invoke didRenderLayout on the current component manager
   *
   * Format:
   *   (DidRenderLayout manager:u32 component:u32)
   * Operand Stack:
   *   ..., →
   *   ...
   * Description:
   *   Expect the component manager and component instance to be stored
   *   in locals at offsets `manager` and `component`.
   */
  DidRenderLayout,

  PushDynamicComponent,       // ()
  OpenDynamicElement,        // ()

  /// TODO
  ShadowAttributes,          // Identical to `evaluate`

  /** The size of the opcode list */
  Size
}

export function debugSlice(env: Environment, start: number, end: number) {
  let { program, constants } = env;

  for (let i=start; i<=end; i+=4) {
    let { type, op1, op2, op3 } = program.opcode(i);
    let [name, params] = debug(constants, type, op1, op2, op3);
    console.log(`${i}. ${logOpcode(name, params)}`);
  }
}

function logOpcode(type: string, params: Option<Object>): string {
  let out = type;

  if (params) {
    let args = Object.keys(params).map(p => `${p}=${json(params[p])}`).join(' ');
    out += ` ${args}`;
  }
  return `(${out})`;
}

function json(param: Opaque) {
  let string = JSON.stringify(param);
  if (string === undefined) return 'undefined';

  let debug = JSON.parse(string);
  if (typeof debug === 'object' && debug && debug['GlimmerDebug']) {
    return debug['GlimmerDebug'];
  }

  return string;
}

function debug(c: Constants, op: Op, op1: number, op2: number, op3: number): any[] {
  switch (op) {
    case Op.Helper: return ['Helper', { helper: c.getFunction(op1) }];
    case Op.Self: return ['Self'];
    case Op.GetVariable: return ['GetVariable', { symbol: op1 }];
    case Op.SetVariable: return ['SetVariable', { symbol: op1 }];
    case Op.PushEvalNames: return ['PushEvalNames'];
    case Op.GetEvalName: return ['GetEvalName'];
    case Op.GetEvalBlock: return ['GetEvalBlock'];
    case Op.GetBlock: return ['GetBlock', { symbol: op1 }];
    case Op.HasBlock: return ['HasBlock'];
    case Op.HasBlockParams: return ['HasBlockParams'];
    case Op.PushBlock: return ['PushBlock', { block: c.getBlock(op1) }];
    case Op.PushBlocks: return ['PushBlocks', { default: c.getBlock(op1), inverse: c.getBlock(op2), flags: op3 }];
    case Op.GetProperty: return ['GetKey', { key: c.getString(op1) }];
    case Op.Concat: return ['Concat', { size: op1 }];
    case Op.Function: return ['Function', { function: c.getFunction(op1) }];
    case Op.Constant: return ['Constant', { value: c.getOther(op1) }];
    case Op.PutEvalledExpr: return ['PutEvalledExpr'];
    case Op.PutEvalledArgs: return ['PutEvalledArgs'];
    case Op.PushReifiedArgs: return ['PushReifiedArgs', { positional: op1, names: c.getArray(op2).map(n => c.getString(n)), flag: op3 }];
    case Op.Primitive: return ['Primitive', { primitive: op1 }];
    case Op.Pop: return ['Pop'];

    /// COMPONENTS

    case Op.SetComponentState: return ['SetComponentState', { local: op1 }];

    /// STATEMENTS
    case Op.ReserveLocals: return ['ReserveLocals', { count: op1 }];
    case Op.ReleaseLocals: return ['ReleaseLocals', { count: op1 }];
    case Op.RootScope: return ['RootScope', { symbols: op1, bindCallerScope: !!op2 }];
    case Op.VirtualRootScope: return ['VirtualRootScope', { bindCallerScope: !!op1 }];
    case Op.SetLocal: return ['SetLocal', { position: op1 }];
    case Op.GetLocal: return ['GetLocal', { position: op1 }];
    case Op.ChildScope: return ['PushChildScope'];
    case Op.PopScope: return ['PopScope'];
    case Op.PushDynamicScope: return ['PushDynamicScope'];
    case Op.PopDynamicScope: return ['PopDynamicScope'];
    case Op.BindPositionalArgs: return ['BindPositionalArgs'];
    case Op.BindSelf: return ['BindSelf'];
    case Op.BindVirtualBlock: return ['BindVirtualBlock', { name: c.getString(op1) }];
    case Op.BindVirtualNamed: return ['BindVirtualNamed', { name: c.getString(op1) }];
    case Op.BindNamedArgs: return ['BindNamedArgs'];
    case Op.BindBlocks: return ['BindBlocks', { names: c.getNames(op1), symbols: c.getArray(op2) }];
    case Op.BindPartialArgs: return ['BindPartialArgs'];
    case Op.BindCallerScope: return ['BindCallerScope'];
    case Op.BindDynamicScope: return ['BindDynamicScope'];
    case Op.Enter: return ['Enter', { start: op1, end: op2 }];
    case Op.Exit: return ['Exit'];
    case Op.InvokeStatic: return ['Evaluate', { block: c.getBlock(op1) }];
    case Op.InvokeVirtual: return ['EvaluateDynamic'];
    case Op.Jump: return ['Jump', { to: op1 }];
    case Op.JumpIf: return ['JumpIf', { to: op1 }];
    case Op.JumpUnless: return ['JumpUnless', { to: op1 }];
    case Op.ToBoolean: return ['ToBoolean'];
    case Op.InvokeBlock: return ['InvokeBlock'];
    case Op.DoneBlock: return ['DoneBlock'];
    case Op.PushDynamicComponent: return ['PushDynamicComponent'];
    case Op.DidCreateElement: return ['DidCreateElement'];
    case Op.ShadowAttributes: return ['ShadowAttributes'];
    case Op.DidRenderLayout: return ['DidRenderLayout'];
    case Op.CommitComponentTransaction: return ['CommitComponentTransaction'];
    case Op.Text: return ['Text', { text: c.getString(op1) }];
    case Op.Comment: return ['Comment', { comment: c.getString(op1) }];
    case Op.DynamicContent: return ['DynamicContent', { value: c.getOther(op1) }];
    case Op.OpenElement: return ['OpenElement'];
    case Op.PushRemoteElement: return ['PushRemoteElement'];
    case Op.PopRemoteElement: return ['PopRemoteElement'];
    case Op.OpenDynamicElement: return ['OpenDynamicElement'];
    case Op.FlushElement: return ['FlushElement'];
    case Op.CloseElement: return ['CloseElement'];
    case Op.StaticAttr: return ['StaticAttr', { name: c.getString(op1), value: c.getString(op2), namespace: op3 ? c.getString(op3) : null }];
    case Op.Modifier: return ['Modifier'];
    case Op.DynamicAttrNS: return ['DynamicAttrNS', { name: c.getString(op1), ns: c.getString(op2), trusting: !!op2 }];
    case Op.DynamicAttr: return ['DynamicAttr', { name: c.getString(op1), trusting: !!op2 }];
    case Op.PutIterator: return ['PutIterator'];
    case Op.EnterList: return ['EnterList', { start: op1, end: op2 }];
    case Op.ExitList: return ['ExitList'];
    case Op.Iterate: return ['Iterate', { breaks: op1, start: op2, end: op3 }];
    case Op.StartIterate: return ['StartIterate', { start: op1, end: op2 }];
    case Op.PutDynamicPartial: return ['PutDynamicPartial'];
    case Op.PutPartial: return ['PutPartial'];
    case Op.EvaluatePartial: return ['EvaluatePartial'];
  }

  throw unreachable();
}

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

  getArray(value: ConstantArray): number[] {
    return this.arrays[value - 1];
  }

  getNames(value: ConstantArray): string[] {
    return this.getArray(value).map(n => this.getString(n));
  }

  array(values: number[]): ConstantArray {
    let index = this.arrays.length;
    this.arrays.push(values);
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

export type EvaluateOpcode = (vm: VM, opcode: Opcode) => void;

export class AppendOpcodes {
  private evaluateOpcode: EvaluateOpcode[] = fillNulls<EvaluateOpcode>(Op.Size).slice();

  add<Name extends Op>(name: Name, evaluate: EvaluateOpcode): void {
    this.evaluateOpcode[name as number] = evaluate;
  }

  evaluate(vm: VM, opcode: Opcode, type: number) {
    let func = this.evaluateOpcode[type];
    let [name, params] = debug(vm.constants, opcode.type, opcode.op1, opcode.op2, opcode.op3);
    console.log(`${vm.frame['currentFrame']['ip'] - 4}. ${logOpcode(name, params)}`);

    // console.log(...debug(vm.constants, type, opcode.op1, opcode.op2, opcode.op3));
    func(vm, opcode);
    console.log('%c -> eval stack', 'color: red', vm.evalStack['stack'].length ? vm.evalStack['stack'].slice() : 'EMPTY');
    console.log('%c -> scope', 'color: green', vm.scope()['slots'].map(s => s && s['value'] ? s['value']() : s));
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
