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
   *   ..., [VersionedPathReference ...], Arguments →
   *   ..., VersionedPathReference
   */
  Helper,

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
   *   Bind the block at the top of the stack.
   * Format:
   *   (SetBlock symbol:u32)
   * Operand Stack:
   *   ..., SymbolTable, Handle →
   *   ...
   */
  SetBlock,

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
  Primitive,

  /**
   * Operation: Convert the top of the stack into a primitive reference.
   *
   * Format:
   *   (PrimitiveReference)
   * Operand Stack:
   *   ..., Primitive →
   *   ..., VersionedPathReference<Primitive>
   */
  PrimitiveReference,

  /**
   * Operation: Convert the top of the stack into a number.
   *
   * Format:
   *   (ReifyU32)
   * Operand Stack:
   *   ..., VersionedPathReference<u32> →
   *   ..., VersionedPathReference<u32>, u32
   */
  ReifyU32,

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

  /**
   * Operation: Return to a place in the program given an offset
   * Format:
   *  (ReturnTo offset:i32)
   * Operand Stack:
   *    ... →
   */
  ReturnTo,

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
   * Operation: Append content as HTML.
   * Format:
   *   (AppendHTML)
   * Operand Stack:
   *   ..., VersionedPathReference<string> →
   *   ...
   */
  AppendHTML,

  /**
   * Operation: Append SafeHTML as HTML.
   * Format:
   *   (AppendSafeHTML)
   * Operand Stack:
   *   ..., VersionedPathReference<SafeHTML> →
   *   ...
   */
  AppendSafeHTML,

  /**
   * Operation: Append DocumentFragment.
   * Format:
   *   (AppendFragment)
   * Operand Stack:
   *   ..., VersionedPathReference<DocumentFragment> →
   *   ...
   */
  AppendDocumentFragment,

  /**
   * Operation: Append Node.
   * Format:
   *   (AppendFragment)
   * Operand Stack:
   *   ..., VersionedPathReference<Node> →
   *   ...
   */
  AppendNode,

  /**
   * Operation: Append an unknown value.
   * Format:
   *   (AppendOther)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ...
   */
  AppendOther,

  /**
   * Operation: Append content as text.
   * Format:
   *   (AppendText)
   * Operand Stack:
   *   ..., VersionedPathReference<string> →
   *   ...
   */
  AppendText,

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
   *   (DynamicAttr name:#string trusting:boolean namespace:Option<#string>)
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
   *   (ComponentAtr name:#string trusting:boolean namespace:Option<#string>)
   * Operand Stack:
   *   ..., VersionedPathReference →
   *   ...
   */
  ComponentAttr,

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
   *   (CompileBlock)
   * Operand Stack:
   *   ..., CompilableBlock →
   *   ..., Handle
   */
  CompileBlock,

  /**
   * Operation: Push a scope onto the stack.
   * Format:
   *   (PushBlockScope #Scope)
   * Operand Stack:
   *   ..., →
   *   ..., Scope
   */
  PushBlockScope,

  /**
   * Operation: Push a symbol table onto the stack.
   * Format:
   *   (PushSymbolTable #SymbolTable)
   * Operand Stack:
   *   ..., →
   *   ..., SymbolTable
   */
  PushSymbolTable,

  /**
   * Operation: Evaluate the handle at the top of the stack.
   * Format:
   *   (InvokeVirtual)
   * Operand Stack:
   *   ..., Handle, →
   *   ...
   */
  InvokeVirtual,

  /**
   * Operation: Evaluate the handle.
   * Format:
   *   (InvokeStatic handle:u32)
   * Operand Stack:
   *   ... →
   *   ...
   */
  InvokeStatic,

  /**
   * Operation: Yield to a block.
   * Format:
   *   (InvokeYield)
   * Operand Stack:
   *   ..., [VersionedPathReference ...], Arguments, SymbolTable, Handle →
   *   ...
   */
  InvokeYield,

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
   * Operation:
   *   Jump to the specified offset if the value at
   *   the top of the stack is the same as the
   *   comparison.
   *
   * Format:
   *   (JumpEq to:i32 comparison:i32)
   * Operand Stack:
   *   ..., u32 →
   *   ..., u32
   */
  JumpEq,

  /**
   * Operation:
   *   Validate that the value at the top of the stack
   *   hasn't changed.
   *
   * Format:
   *   (AssertSame)
   * Operand Stack:
   *   ..., VersionedPathReference<u32> →
   *   ..., VersionedPathReference<u32>
   */
  AssertSame,

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
   *   JumpUnless, or JumpEq will produce an updating
   *   assertion. If that assertion fails, the appending
   *   VM will be re-entered, and the instructions from `from`
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
   *   (ToBoolean)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., VersionedPathReference<bool>
   */
  ToBoolean,

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
   * Operation: Test whether a reference contains a component definition.
   *
   * Format:
   *   (Main state:register)
   * Operand Stack:
   *   ..., Invocation, ComponentDefinition →
   *   ...
   */
  Main,

  /**
   * Operation: Test whether a reference contains a component definition.
   *
   * Format:
   *   (IsComponent)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., VersionedPathReference<boolean>
   */
  IsComponent,

  /**
   * Operation: Push the content type onto the stack.
   *
   * Format:
   *   (ContentType)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., VersionedPathReference<Opaque>, VersionedPathReference<ContentType>
   */
  ContentType,

  /**
   * Operation: Curry a component definition for a later invocation.
   *
   * Format:
   *   (CurryComponent templateMeta:#Locator)
   * Operand Stack:
   *   ..., VersionedPathReference, [VersionedPathReference ...], Arguments →
   *   ..., { VersionedPathReference, Locator, CapturedArguments }
   */
  CurryComponent,

  /**
   * Operation: Push an appropriate component manager onto the stack.
   *
   * Format:
   *   (PushComponentManager #ComponentSpec)
   * Operand Stack:
   *   ... →
   *   ..., { ComponentDefinition, ComponentManager }
   */
  PushComponentDefinition,

  /**
   * Operation:
   *   Pushes the ComponentInstance onto the stack that is
   *   used during the invoke.
   *
   * Format:
   *   (PushDynamicComponentInstance)
   * Operand Stack:
   *   ..., ComponentDefinition →
   *   ..., { ComponentDefinition, manager: null, layout: null, state: null, handle: null, table: null }
   */

  PushDynamicComponentInstance,

  /**
   * Operation:
   *   Pushes a curried component definition on to the stack
   *
   * Format:
   *   (PushCurriedComponent)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., ComponentDefinition
   */
  PushCurriedComponent,

  /**
   * Operation:
   *   Push a resolved component definition onto the stack
   *
   * Format:
   *   (ResolveDynamicComponent templateMeta:#Locator)
   * Operand Stack:
   *   ..., VersionedPathReference<Opaque> →
   *   ..., ComponentDefinition
   */
  ResolveDynamicComponent,

  /**
   * Operation: Push a user representation of args onto the stack.
   *
   * Format:
   *   (PushArgs names:#Array<#string> positionalCount:u32 synthetic:#boolean)
   *
   * Operand Stack:
   *   ..., [VersionedPathReference ...]  →
   *   ..., [VersionedPathReference ...], Arguments
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
   * Operation: Push empty args onto the stack
   *
   * Format:
   *   (EmptyArgs)
   *
   * OperandStack:
   *   ... →
   *   ..., Arguments
   */
  PushEmptyArgs,

  /**
   * Operation: Pops Arguments from the stack and clears the next N args.
   *
   * Format:
   *   (PopArgs)
   *
   * Operand Stack:
   *   ..., [VersionedPathReference ...], Arguments  →
   *   ...
   *
   * Description:
   * The arguments object contains the information of how many user
   * supplied args the component was invoked with. To clear them from
   * the stack we must pop it from the stack and call `clear` on it
   * to remove the argument values from the stack.
   */
  PopArgs,

  /**
   * Operation: ...
   * Format:
   *   (PrepareArgs state:register)
   * Operand Stack:
   *   ... →
   *   ...
   */
  PrepareArgs,

  /**
   * Operation: Replaces Arguments on the stack with CapturedArguments
   * Format:
   *   (CaptureArgs)
   *
   * Operand Stack:
   *   ..., Arguments  →
   *   ..., CapturedArguments
   *
   * Description:
   * The Arguments object is mutated in place because it is usually consumed immediately
   * after being pushed on to the stack. In some situations, such as with curried components,
   * information about more than one Argument may need to exist on the stack at once. In those
   * cases, the CaptureArgs instruction pops an Arguments object off the stack and replaces it
   * with the immutable CapturedArgs snapshot.
   */
  CaptureArgs,

  /**
   * Operation: Create the component and push it onto the stack.
   * Format:
   *   (CreateComponent flags:u32 state:register)
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
   *   (RegisterComponentDestructor state:register)
   * Operand Stack:
   *   ... →
   *   ...
   */
  RegisterComponentDestructor,

  /**
   * Operation: Push a new ElementOperations for the current component.
   *
   * Format:
   *   (PutComponentOperations)
   * Operand Stack:
   *   ... →
   *   ...
   */
  PutComponentOperations,

  /**
   * Operation: Push the component's `self` onto the stack.
   *
   * Format:
   *   (GetComponentSelf state:register)
   * Operand Stack:
   *   ... →
   *   ..., VersionedPathReference
   */
  GetComponentSelf,

  /**
   * Operation: Push the component's `self` onto the stack.
   *
   * Format:
   *   (GetComponentTagName state:register)
   * Operand Stack:
   *   ... →
   *   ..., Option<string>
   */
  GetComponentTagName,

  /**
   * Operation: Get the component layout from the manager.
   *
   * Format:
   *   (GetComponentLayout state:register)
   * Operand Stack:
   *   ... →
   *   ..., ProgramSymbolTable, Handle
   */
  GetComponentLayout,

  /**
   * Operation:
   *   Populate the state register with the layout currently
   *   on the stack.
   *
   * Format:
   *   (PopulateLayout state:register)
   * Operand Stack:
   *   ..., ProgramSymbolTable, Handle →
   *   ...
   */
  PopulateLayout,

  /**
   * Operation: Invoke the layout returned by the manager.
   *
   * Format:
   *   (InvokeComponentLayout state:register)
   * Operand Stack:
   *   ... →
   *   ...
   */
  InvokeComponentLayout,

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
   *   (DidCreateElement state:register)
   * Operand Stack:
   *   ... →
   *   ...
   */
  DidCreateElement,

  /**
   * Operation: Invoke didRenderLayout on the current component manager
   *
   * Format:
   *   (DidRenderLayout state:register)
   * Operand Stack:
   *   ..., →
   *   ...
   */
  DidRenderLayout,

  /// PARTIALS

  /**
   * Operation: Lookup and invoke a partial template.
   *
   * Format:
   *   (InvokePartial templateMeta:#Locator symbols:#Array<#string> evalInfo:#Array<number>)
   * Operand Stack:
   *   ..., VersionedPathReference<string> →
   *   ...
   */
  InvokePartial,

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
