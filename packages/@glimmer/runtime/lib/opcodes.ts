import { Opaque, Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, unreachable, typePos } from '@glimmer/util';
import { Op, Register } from '@glimmer/vm';
import { Tag } from '@glimmer/reference';
import { VM, UpdatingVM } from './vm';
import { Opcode, Program } from './environment';
import { Constants, LazyConstants } from './environment/constants';
import { DEBUG, CI } from '@glimmer/local-debug-flags';

export interface OpcodeJSON {
  type: number | string;
  guid?: Option<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
}

export function debugSlice(program: Program, start: number, end: number) {
  if (!CI && DEBUG) {
    /* tslint:disable:no-console */
    let { constants } = program;

    // console is not available in IE9
    if (typeof console === 'undefined') { return; }

    // IE10 does not have `console.group`
    if (typeof console.group !== 'function') { return; }

    (console as any).group(`%c${start}:${end}`, 'color: #999');

    for (let i=start; i<end; i= i + 4) {
      let { type, op1, op2, op3 } = program.opcode(i);
      let [name, params] = debug(constants, type, op1, op2, op3);
      console.log(`${i}. ${logOpcode(name, params)}`);
    }

    console.groupEnd();
    /* tslint:enable:no-console */
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

function debug(c: Constants, op: Op, op1: number, op2: number, op3: number): [string, object] {
  if (!CI && DEBUG) {
    switch (op) {
      case Op.Bug: throw unreachable();

      case Op.Helper: return ['Helper', { helper: c.resolveSpecifier(op1) }];
      case Op.SetVariable: return ['SetVariable', { symbol: op1 }];
      case Op.SetBlock: return ['SetBlock', { symbol: op1 }];
      case Op.GetVariable: return ['GetVariable', { symbol: op1 }];
      case Op.GetProperty: return ['GetProperty', { key: c.getString(op1) }];
      case Op.GetBlock: return ['GetBlock', { symbol: op1 }];
      case Op.HasBlock: return ['HasBlock', { block: op1 }];
      case Op.HasBlockParams: return ['HasBlockParams', { block: op1 }];
      case Op.Concat: return ['Concat', { size: op1 }];
      case Op.Constant: return ['Constant', { value: (c as LazyConstants).getOther(op1) }];
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
      case Op.PushComponentManager: return ['PushComponentManager', { definition: c.resolveSpecifier(op1) }];
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
      /* tslint:disable */
      let [name, params] = debug(vm.constants, opcode.type, opcode.op1, opcode.op2, opcode.op3);
      console.log(`${typePos(vm['pc'])}. ${logOpcode(name, params)}`);
      // console.log(...debug(vm.constants, type, opcode.op1, opcode.op2, opcode.op3));
      /* tslint:enable */
    }

    func(vm, opcode);

    if (!CI && DEBUG) {
      /* tslint:disable */
      console.log('%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O', 'color: orange', vm['pc'], vm['ra'], vm['fp'], vm['sp'], vm['s0'], vm['s1'], vm['t0'], vm['t1']);
      console.log('%c -> eval stack', 'color: red', vm.stack.toArray());
      console.log('%c -> scope', 'color: green', vm.scope()['slots'].map(s => s && s['value'] ? s['value']() : s));
      console.log('%c -> elements', 'color: blue', vm.elements()['cursorStack']['stack'].map((c: any) => c.element));
      /* tslint:enable */
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
  public abstract tag: Tag;

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
