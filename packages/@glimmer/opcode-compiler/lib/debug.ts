import { CompileTimeProgram, CompileTimeConstants } from './interfaces';
import { Option, Opaque, SymbolTable, Recast } from '@glimmer/interfaces';
import { Op, Register } from '@glimmer/vm';
import { DEBUG } from '@glimmer/local-debug-flags';
import { unreachable } from "@glimmer/util";

export interface DebugConstants {
  getString(value: number): string;
  getStringArray(value: number): string[];
  getArray(value: number): number[];
  getSymbolTable<T extends SymbolTable>(value: number): T;
  getSerializable<T>(s: number): T;
  resolveHandle<T>(s: number): T;
}

interface LazyDebugConstants {
  getOther<T>(s: number): T;
}

export function debugSlice(program: CompileTimeProgram, start: number, end: number) {
  if (DEBUG) {
    /* tslint:disable:no-console */
    let { constants } = program;

    // console is not available in IE9
    if (typeof console === 'undefined') { return; }

    // IE10 does not have `console.group`
    if (typeof console.group !== 'function') { return; }

    (console as any).group(`%c${start}:${end}`, 'color: #999');

    for (let i=start; i<end; i= i + 4) {
      let { type, op1, op2, op3 } = program.opcode(i);
      let [name, params] = debug(constants as Recast<CompileTimeConstants, DebugConstants>, type, op1, op2, op3);
      console.log(`${i}. ${logOpcode(name, params)}`);
    }

    console.groupEnd();
    /* tslint:enable:no-console */
  }
}

export function logOpcode(type: string, params: Option<Object>): string | void {
  if (DEBUG) {
    let out = type;

    if (params) {
      let args = Object.keys(params).map(p => ` ${p}=${json(params[p])}`).join('');
      out += args;
    }
    return `(${out})`;
  }
}

function json(param: Opaque) {
  if (DEBUG) {
    if (typeof param === 'function') {
      return '<function>';
    }

    let string;
    try {
      string = JSON.stringify(param);
    } catch(e) {
      return '<cannot generate JSON>';
    }

    if (string === undefined) {
      return 'undefined';
    }

    let debug = JSON.parse(string);
    if (typeof debug === 'object' && debug !== null && debug.GlimmerDebug !== undefined) {
      return debug.GlimmerDebug;
    }

    return string;
  }
}

export function debug(c: DebugConstants, op: Op, op1: number, op2: number, op3: number): [string, object] {
  if (DEBUG) {
    switch (op) {
      case Op.Bug: throw unreachable();

      case Op.Helper: return ['Helper', { helper: c.resolveHandle(op1) }];
      case Op.SetVariable: return ['SetVariable', { symbol: op1 }];
      case Op.SetBlock: return ['SetBlock', { symbol: op1 }];
      case Op.GetVariable: return ['GetVariable', { symbol: op1 }];
      case Op.GetProperty: return ['GetProperty', { key: c.getString(op1) }];
      case Op.GetBlock: return ['GetBlock', { symbol: op1 }];
      case Op.HasBlock: return ['HasBlock', { block: op1 }];
      case Op.HasBlockParams: return ['HasBlockParams', { block: op1 }];
      case Op.Concat: return ['Concat', { size: op1 }];
      case Op.Constant: return ['Constant', { value: (c as Recast<DebugConstants, LazyDebugConstants>).getOther(op1) }];
      case Op.Primitive: return ['Primitive', { primitive: op1 }];
      case Op.PrimitiveReference: return ['PrimitiveReference', {}];
      case Op.Dup: return ['Dup', { register: Register[op1], offset: op2 }];
      case Op.Pop: return ['Pop', { count: op1 }];
      case Op.Load: return ['Load', { register: Register[op1] }];
      case Op.Fetch: return ['Fetch', { register: Register[op1] }];

      /// PRELUDE & EXIT
      case Op.RootScope: return ['RootScope', { symbols: op1, bindCallerScope: !!op2 }];
      case Op.ChildScope: return ['ChildScope', {}];
      case Op.PopScope: return ['PopScope', {}];
      case Op.Return: return ['Return', {}];
      case Op.ReturnTo: return ['ReturnTo', { offset: op1 }];

      /// HTML
      case Op.Text: return ['Text', { text: c.getString(op1) }];
      case Op.Comment: return ['Comment', { comment: c.getString(op1) }];
      case Op.DynamicContent: return ['DynamicContent', { trusting: !!op1 }];
      case Op.OpenElement: return ['OpenElement', { tag: c.getString(op1) }];
      case Op.OpenElementWithOperations: return ['OpenElementWithOperations', { tag: c.getString(op1) }];
      case Op.OpenDynamicElement: return ['OpenDynamicElement', {}];
      case Op.StaticAttr: return ['StaticAttr', { name: c.getString(op1), value: c.getString(op2), namespace: op3 ? c.getString(op3) : null }];
      case Op.DynamicAttr: return ['DynamicAttr', { name: c.getString(op1), trusting: !!op2, namespace: op3 ? c.getString(op3) : null }];
      case Op.ComponentAttr: return ['ComponentAttr', { name: c.getString(op1), trusting: !!op2, namespace: op3 ? c.getString(op3) : null }];
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
      case Op.CompileBlock: return ['CompileBlock', {}];
      case Op.InvokeStatic: return ['InvokeStatic', {}];
      case Op.InvokeYield: return ['InvokeYield', {}];
      case Op.Jump: return ['Jump', { to: op1 }];
      case Op.JumpIf: return ['JumpIf', { to: op1 }];
      case Op.JumpUnless: return ['JumpUnless', { to: op1 }];
      case Op.PushFrame: return ['PushFrame', {}];
      case Op.PopFrame: return ['PopFrame', {}];
      case Op.Enter: return ['Enter', { args: op1 }];
      case Op.Exit: return ['Exit', {}];
      case Op.ToBoolean: return ['ToBoolean', {}];

      /// LISTS
      case Op.EnterList: return ['EnterList', { start: op1 }];
      case Op.ExitList: return ['ExitList', {}];
      case Op.PutIterator: return ['PutIterator', {}];
      case Op.Iterate: return ['Iterate', { end: op1 }];

      /// COMPONENTS
      case Op.IsComponent: return ['IsComponent', {}];
      case Op.CurryComponent: return ['CurryComponent', { meta: c.getSerializable(op1) }];
      case Op.PushComponentSpec: return ['PushComponentSpec', { definition: c.resolveHandle(op1) }];
      case Op.PushDynamicComponentManager: return ['PushDynamicComponentManager', { meta: c.getSerializable(op1) }];
      case Op.PushArgs: return ['PushArgs', { names: c.getStringArray(op1), positionals: op2, synthetic: !!op3 }];
      case Op.PrepareArgs: return ['PrepareArgs', { state: Register[op1] }];
      case Op.CreateComponent: return ['CreateComponent', { flags: op1, state: Register[op2] }];
      case Op.RegisterComponentDestructor: return ['RegisterComponentDestructor', {}];
      case Op.PutComponentOperations: return ['PutComponentOperations', {}];
      case Op.GetComponentSelf: return ['GetComponentSelf', { state: Register[op1] }];
      case Op.GetComponentTagName: return ['GetComponentTagName', { state: Register[op1] }];
      case Op.GetComponentLayout: return ['GetComponentLayout', { state: Register[op1] }];
      case Op.InvokeComponentLayout: return ['InvokeComponentLayout', {}];
      case Op.BeginComponentTransaction: return ['BeginComponentTransaction', {}];
      case Op.CommitComponentTransaction: return ['CommitComponentTransaction', {}];
      case Op.DidCreateElement: return ['DidCreateElement', { state: Register[op1] }];
      case Op.DidRenderLayout: return ['DidRenderLayout', {}];

      /// PARTIALS
      case Op.InvokePartial: return ['InvokePartial', { templateMeta: c.getSerializable(op1), symbols: c.getStringArray(op2), evalInfo: c.getArray(op3) }];
      case Op.ResolveMaybeLocal: return ['ResolveMaybeLocal', { name: c.getString(op1)} ];

      /// DEBUGGER
      case Op.Debugger: return ['Debugger', { symbols: c.getStringArray(op1), evalInfo: c.getArray(op2) }];

      /// STATEMENTS

      case Op.Size: throw unreachable();
    }

    throw unreachable();
  }

  return ['', {}];
}
