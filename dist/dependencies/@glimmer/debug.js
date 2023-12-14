import { decodeHandle, decodeImmediate, fillNulls, assertNever, isObject, isUserException, isCompilable, zip, exhausted, enumerate, LOCAL_LOGGER, unreachable, inDevmode, stringifyDebugLabel } from '@glimmer/util';
import { CURRIED_MODIFIER, CURRIED_HELPER, CURRIED_COMPONENT, $v0, $t1, $t0, $s1, $s0, $sp, $fp, $ra, $pc, OpSize } from '@glimmer/vm';
import { INTERNAL_REFERENCE, unwrapReactive, readReactive } from '@glimmer/reference';

/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const LOCAL_DEBUG = false ;
const LOCAL_TRACE_LOGGING = hasFlag();
const LOCAL_EXPLAIN_LOGGING = hasFlag();
const LOCAL_INTERNALS_LOGGING = hasFlag();
const LOCAL_SUBTLE_LOGGING = hasFlag();
if (LOCAL_INTERNALS_LOGGING || LOCAL_EXPLAIN_LOGGING) {
  console.group('%cLogger Flags:', 'font-weight: normal; color: teal');
  log('LOCAL_DEBUG', LOCAL_DEBUG, 'Enables debug logging for people working on this repository. If this is off, none of the other flags will do anything.');
  log('LOCAL_TRACE_LOGGING', LOCAL_TRACE_LOGGING, `Enables trace logging. This is most useful if you're working on the internals, and includes a trace of compiled templates and a trace of VM execution that includes state changes. If you want to see all of the state, enable LOCAL_SUBTLE_LOGGING.`);
  log('LOCAL_EXPLAIN_LOGGING', LOCAL_EXPLAIN_LOGGING, 'Enables trace explanations (like this one!)');
  log('LOCAL_INTERNALS_LOGGING', LOCAL_INTERNALS_LOGGING, `Enables logging of internal state. This is most useful if you're working on the debug infrastructure itself.`);
  log('LOCAL_SUBTLE_LOGGING', LOCAL_SUBTLE_LOGGING, 'Enables more complete logging, even when the result would be extremely verbose and not usually necessary. Subtle logs are dimmed when enabled.');
  log('audit_logging', getFlag(), 'Enables specific audit logs. These logs are useful during an internal refactor and can help pinpoint exactly where legacy code is being used (e.g. infallible_deref and throwing_deref).');
  log('focus_highlight', getFlag(), `Enables focus highlighting of specific trace logs. This makes it easy to see specific aspects of the trace at a glance.`);
  console.log();
  console.groupEnd();
  function log(flag, value, explanation) {
    const {
      formatted,
      style
    } = format(value);
    const header = [`%c[${flag}]%c %c${formatted}`, `font-weight: normal; background-color: ${style}; color: white`, ``, `font-weight: normal; color: ${style}`];
    if (LOCAL_EXPLAIN_LOGGING) {
      console.group(...header);
      console.log(`%c${explanation}`, 'color: grey');
      console.groupEnd();
    } else {
      console.log(...header);
    }
  }
  function format(flagValue) {
    if (flagValue === undefined || flagValue === false) {
      return {
        formatted: 'off',
        style: 'grey'
      };
    } else if (flagValue === true) {
      return {
        formatted: 'on',
        style: 'green'
      };
    } else if (typeof flagValue === 'string') {
      return {
        formatted: flagValue,
        style: 'blue'
      };
    } else if (Array.isArray(flagValue)) {
      if (flagValue.length === 0) {
        return {
          formatted: 'none',
          style: 'grey'
        };
      }
      return {
        formatted: `[${flagValue.join(', ')}]`,
        style: 'teal'
      };
    } else {
      assertNever();
    }
  }
  function assertNever(_never) {
    throw new Error('unreachable');
  }
}

// This function should turn into a constant `return false` in `!DEBUG`,
// which should inline properly via terser, swc and esbuild.
//
// https://tiny.katz.zone/BNqN3F
function hasFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return false;
  }
}
function getFlagValues(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return [];
  }
}
function getFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return undefined;
  }
}

const todo = ({
  label,
  value
}) => ['error:operand', value, {
  label
}];

// eslint-disable-next-line @typescript-eslint/no-explicit-any

class Disassembler {
  static build(builder) {
    return builder(new Disassembler()).#disms;
  }
  #disms;
  constructor() {
    this.#disms = {};
  }
  addNullable(names, dism) {
    for (const name of names) {
      this.#disms[name] = dism;
      this.#disms[`${name}?`] = dism;
    }
    return this;
  }
  add(names, dism) {
    const add = (name, dism) => this.#disms[name] = dism;
    for (const name of names) {
      add(name, dism);
    }
    return this;
  }
}
Disassembler.build(d => {
  return d.add(['imm/u32', 'imm/i32', 'imm/u32{todo}', 'imm/i32{todo}'], ({
    value
  }) => ['number', value]).add(['const/i32[]'], ({
    value,
    constants
  }) => ['array', constants.getArray(value), {
    kind: Number
  }]).add(['const/bool'], ({
    value
  }) => ['boolean', !!value]).add(['imm/bool'], ({
    value,
    constants
  }) => ['boolean', constants.getValue(decodeHandle(value))]).add(['handle'], ({
    constants,
    value
  }) => ['constant', constants.getValue(value)]).add(['imm/pc'], ({
    value
  }) => ['instruction', value]).add(['const/any[]'], ({
    value,
    constants
  }) => ['array', constants.getArray(value)]).add(['const/primitive'], ({
    value,
    constants
  }) => ['primitive', decodePrimitive(value, constants)]).add(['register'], ({
    value
  }) => ['register', decodeRegister(value)]).add(['const/any'], ({
    value,
    constants
  }) => ['dynamic', constants.getValue(value)]).add(['variable'], ({
    value,
    meta
  }) => {
    return ['variable', value, {
      name: meta?.debugSymbols?.at(value) ?? null
    }];
  }).add(['register/instruction'], ({
    value
  }) => ['instruction', value]).add(['imm/enum<curry>'], ({
    value
  }) => ['enum<curry>', decodeCurry(value)]).addNullable(['const/str'], ({
    value,
    constants
  }) => ['string', constants.getValue(value)]).addNullable(['const/str[]'], ({
    value,
    constants
  }) => ['array', constants.getArray(value), {
    kind: String
  }]).add(['imm/block:handle'], todo).add(['const/definition'], todo).add(['const/fn'], todo).add(['instruction/absolute'], todo).add(['instruction/relative'], todo).add(['register/sN'], todo).add(['register/stack'], todo).add(['register/tN'], todo).add(['register/v0'], todo);
});

class Define {
  static done(define) {
    return define.#spec;
  }
  #spec;
  constructor(spec) {
    this.#spec = spec;
  }
  ops(...ops) {
    this.#spec.ops = ops;
    return this;
  }
  reads(...reads) {
    this.#spec.reads = reads;
    return this;
  }
  changes(...changes) {
    this.#spec.changes = changes;
    return this;
  }
  changesFrame() {
    this.#initializedStack().pushes = 'frame:change';
    return this;
  }
  #initializedStack() {
    if (!this.#spec.stack || typeof this.#spec.stack === 'string') {
      this.#spec.stack = {
        params: [],
        pushes: []
      };
    }
    return this.#spec.stack;
  }
  unchanged() {
    this.#spec.stack = {
      params: [],
      pushes: []
    };
    return this;
  }
  pushes(...pushes) {
    this.#initializedStack().pushes = pushes;
    return this;
  }
  pops(name, param) {
    this.#initializedStack().params.push([`pop:${name}`, param]);
    return this;
  }
  peeks(name, ...args) {
    this.#initializedStack().params.push([`peek:${name}`, ...args]);
    return this;
  }
}
function define$2(name, build) {
  const builder = new Define({
    name,
    ops: [],
    stack: {
      params: [],
      pushes: []
    },
    reads: [],
    changes: [],
    throws: false
  });
  const define = build(builder);
  return Define.done(define);
}
define$2.throws = (name, build) => {
  const builder = new Define({
    name,
    ops: [],
    stack: {
      params: [],
      pushes: []
    },
    reads: [],
    changes: [],
    throws: true
  });
  const define = build(builder);
  return Define.done(define);
};

/* eslint-disable @typescript-eslint/no-explicit-any */

const UNCHANGED = Symbol('UNCHANGED');
const Ok = value => ['ok', value];
const Fail = expected => ['fail', {
  type: 'leaf',
  expected
}];
function define$1(types) {
  return Object.entries(types).reduce((acc, [name, build]) => ({
    ...acc,
    [name]: build(name)
  }), {});
}
const IsReference = {
  name: 'reference',
  coerce: value => {
    return isObject(value) && INTERNAL_REFERENCE in value ? Ok(value) : Fail('reference');
  }
};
define$1({
  'imm/bool': pipe(isBool, value => !!value),
  'imm/i32': coerce(isI32),
  args: instance(Object),
  'args/captured': IsInterface({
    positional: IsArray(IsReference),
    named: IsDict(IsReference)
  })
});
function IsArray(kind) {
  return () => ({
    name: `${kind.name}[]`,
    coerce: (value, vm) => {
      let errors = {};
      if (!Array.isArray(value)) {
        return Fail(`${kind.name}[]`);
      }
      for (let [i, item] of enumerate(value)) {
        let result = kind.coerce(item, vm);
        if (result[0] === 'fail') {
          errors[i] = result[1];
        }
      }
      if (Object.keys(errors).length > 0) {
        return ['fail', {
          type: 'list',
          errors
        }];
      } else {
        return Ok(value);
      }
    }
  });
}
function IsDict(kind) {
  return () => ({
    name: `Dict<${kind.name}>`,
    coerce: (value, vm) => {
      let errors = {};
      if (!isObject(value)) {
        return Fail(`Dict<${kind.name}>`);
      }
      for (let [key, item] of Object.entries(value)) {
        let result = kind.coerce(item, vm);
        if (result[0] === 'fail') {
          errors[key] = result[1];
        }
      }
      if (Object.keys(errors).length > 0) {
        return ['fail', {
          type: 'list',
          errors
        }];
      } else {
        return Ok(value);
      }
    }
  });
}
function pipe(check, then = value => value) {
  return name => ({
    name,
    coerce: value => {
      if (check(value)) {
        return Ok(then(value));
      } else {
        return Fail(name);
      }
    }
  });
}
function coerce(check) {
  return name => ({
    name,
    coerce: value => {
      if (check(value)) {
        return Ok(value);
      } else {
        return Fail(name);
      }
    }
  });
}
function instance(Class) {
  return name => ({
    name,
    coerce: item => item instanceof Class ? Ok(item) : Fail(`instanceof ${Class.name}`)
  });
}
function IsInterface(record) {
  return name => ({
    name,
    coerce: (item, vm) => {
      let errors = {};
      for (let [key, type] of Object.entries(record)) {
        let [result, err] = type(key).coerce(item, vm);
        if (result === 'fail') {
          errors[key] = err;
        }
      }
      if (Object.keys(errors).length > 0) {
        return ['fail', {
          type: 'record',
          errors
        }];
      } else {
        return Ok(item);
      }
    }
  });
}
function isBool(value) {
  return value === 0 || value === 1;
}
function isI32(value) {
  return typeof value === 'number' && value <= 0x7fffffff;
}

function define(nameDef, ops, stackCheck) {
  let [name, mnemonic] = nameDef.split(' as ');
  return {
    name,
    mnemonic,
    before: null,
    stack: stackCheck,
    ops: ops.map(op),
    operands: ops.length
  };
}
// @note OPERAND_TYPES
const OPERAND_TYPES = [
// imm means immediate
'imm/u32', 'imm/i32',
// encoded as 0 or 1
'imm/bool',
// the operand is an i32 or u32, but it has a more specific meaning that should be captured here
'imm/u32{todo}', 'imm/i32{todo}', 'imm/enum<curry>', 'imm/block:handle', 'imm/pc', 'handle', 'const/i32[]', 'const/str?', 'const/any[]', 'const/str[]?', 'const/bool', 'const/fn', 'const/any',
// could be an immediate
'const/primitive', 'const/definition', 'register',
// $pc, $ra
'register/instruction',
// $sp, $fp
'register/stack',
// $s0, $s1, $t0, $t1, $v0
'register/sN', 'register/tN', 'register/v0', 'variable', 'instruction/relative', 'instruction/absolute'];
function isOperandType(s) {
  return OPERAND_TYPES.includes(s) || OPERAND_TYPES.includes(`${s}?`);
}
function op(input) {
  let [name, type] = input.split(':');
  if (isOperandType(type)) {
    return {
      name,
      type
    };
  } else {
    throw new Error(`Expected operand, found ${JSON.stringify(input)}`);
  }
}
function stackDelta(change) {
  return {
    type: 'stack:delta',
    value: change
  };
}
const stack = {
  peeks: stackPeeks,
  params: stackParams,
  dynamic: stackDynamic,
  delta: stackDelta
};
function intoReturnType(from) {
  return Array.isArray(from) ? from : [from];
}
function stackPeeks(params) {
  return {
    type: 'stack:peeks',
    value: params,
    pushes: returns => ({
      type: 'multi',
      options: [{
        type: 'stack:peeks',
        value: params
      }, {
        type: 'stack:returns',
        value: intoReturnType(returns)
      }]
    })
  };
}
function stackParams(params) {
  const paramsOption = {
    type: 'stack:params',
    value: params
  };
  return {
    returns: returns => ({
      type: 'multi',
      options: [paramsOption, {
        type: 'stack:returns',
        value: intoReturnType(returns)
      }]
    }),
    pushes: returns => ({
      type: 'multi',
      options: [paramsOption, {
        type: 'stack:returns',
        value: [UNCHANGED, ...intoReturnType(returns)]
      }]
    }),
    dynamic: dynamic => ({
      type: 'multi',
      options: [paramsOption, {
        type: 'stack:dynamic',
        value: dynamic
      }]
    })
  };
}
function stackDynamic(dynamic) {
  return {
    type: 'stack:dynamic',
    value: dynamic ?? null
  };
}

// @active
function toOptions(options) {
  let operands = [];
  const stackInfo = new StackInfo();
  for (let option of options) {
    if (Array.isArray(option)) {
      operands = option;
      continue;
    }
    switch (option.type) {
      case 'multi':
        stackInfo.add(...option.options);
        break;
      default:
        stackInfo.add(option);
    }
  }
  return [operands, stackInfo.toStackCheck()];
}
class StackInfo {
  #params = [];
  #returns = [];
  #delta;
  #dynamic = undefined;
  add(...options) {
    for (const option of options) {
      switch (option.type) {
        case 'stack:unchecked':
          this.#dynamic = {
            reason: option.reason
          };
          break;
        case 'stack:params':
          this.#params.push(...option.value.map(param => ({
            type: 'pop',
            value: param
          })));
          break;
        case 'stack:peeks':
          this.#params.push(...option.value.map(param => ({
            type: 'peek',
            value: param
          })));
          break;
        case 'stack:returns':
          this.#returns = option.value;
          break;
        case 'stack:delta':
          this.#delta = option.value;
          break;
        case 'stack:dynamic':
          this.#dynamic = option.value;
          break;
        default:
          assertNever(option);
      }
    }
  }
  toStackCheck() {
    const dynamic = this.#dynamic;
    if (dynamic === undefined) {
      if (this.#delta) {
        return () => ({
          type: 'delta',
          delta: this.delta
        });
      } else {
        return () => ({
          type: 'operations',
          peek: this.#peeks.length,
          pop: this.#pops.length,
          push: this.#returns.length,
          delta: this.delta
        });
      }
    }
    if (typeof dynamic === 'function') {
      return dynamic;
    } else {
      return () => ({
        type: 'unchecked',
        delta: undefined,
        ...dynamic
      });
    }
  }
  get #pops() {
    return this.#params.filter(p => p.type === 'pop').map(p => p.value);
  }
  get #peeks() {
    return this.#params.filter(p => p.type === 'peek').map(p => p.value);
  }
  get delta() {
    if (this.#delta) {
      return this.#delta;
    } else {
      return this.#returns.length - this.#pops.length;
    }
  }
}
const RESERVED = Symbol('RESERVED');
class MetadataBuilder {
  static build(build) {
    let builder = new MetadataBuilder(fillNulls(OpSize));
    return build(builder).#done();
  }
  #inserting = 0;
  #metadata;
  constructor(metadata) {
    this.#metadata = metadata;
  }
  stack = stack;
  from = stackParams;
  add = (name, ...options) => {
    if (name === RESERVED) {
      this.#inserting++;
    } else {
      const normalizedOptions = name === RESERVED ? [[], () => ({
        type: 'unchecked',
        reason: 'reserved',
        delta: undefined
      })] : toOptions(options);
      this.#push(name, normalizedOptions);
    }
    return this;
  };
  #push(name, options) {
    this.#metadata[this.#inserting++] = name === null ? null : define(name, ...options);
  }
  #done() {
    return this.#metadata;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any

function isReference(value) {
  return !!(value && typeof value === 'object' && INTERNAL_REFERENCE in value);
}

function opcodeMetadata(op) {
  return METADATA[op];
}
define$2('PushFrame', d => d.ops().pushes('register/ra', 'register/fp').reads('$fp', '$sp').changes('$fp'));
define$2('PopFrame', d => d.peeks('ra', 'register/ra', {
  from: '$fp'
}).peeks('fp', 'register/fp', {
  from: '$fp'
}).changesFrame().reads('$fp').changes('$ra', '$sp', '$fp'));
define$2('Jump', d => d.ops(['to', 'instruction/relative']).unchanged().reads('$pc').changes('$pc'));
define$2('ReturnTo', d => d.ops(['to', 'instruction/relative']).unchanged().reads('$pc').changes('$ra'));
define$2('Finally', d => d.ops(['catchPc', 'instruction/relative']).pops('handler', 'ref/function?').reads('$pc', '$sp', '$fp').changes('$up'));
define$2.throws('Begin', d => d.ops(['catchPc', 'instruction/relative']).pops('handler', 'ref/function?').pushes('ref/any').reads('$pc', '$sp', '$fp').changes('$up'));
define$2('InvokeVirtual', d => d.pops('block', 'handle/block').reads('$pc').changes('$ra', '$pc'));
define$2('InvokeStatic', d => d.ops(['handle', 'handle/block']).unchanged().reads('$pc').changes('$ra', '$pc'));
define$2('Start', d => d.unchanged());
define$2('Return', d => d.unchanged().reads('$ra').changes('$pc'));
define$2.throws('Helper', d => d.ops(['helper', 'const/function']).pops('args', 'args').peeks('args', 'stack/args').reads('owner', 'dynamic-scope/value').changes('destroyable', ['$v0', 'ref/any']));
define$2('GetVariable', d => d.ops(['symbol', 'variable']).pushes('ref/any').reads(['lexical-scope/value', 'variable']));
define$2('SetVariable', d => d.ops(['symbol', 'variable']).pops('expr', 'ref/any').changes(['lexical-scope/value', 'variable']));
define$2('SetBlock', d => d.ops(['symbol', 'variable/block']).pops('handle', 'block/compilable').pops('scope', 'scope').pops('table', 'table/block').changes(['lexical-scope/block', 'variable/block']));
define$2('RootScope', d => d.ops(['symbols', 'unsigned']).reads('owner').changes('scope'));
define$2('GetProperty', d => d.ops(['key', 'const/string']).pops('expr', 'ref/any').pushes('ref/any'));
define$2('GetBlock', d => d.ops(['block', 'variable/block']).pushes('block/scope?').reads(['lexical-scope/block', 'block/scope?']));
define$2('SpreadBlock', d =>
// @todo this could be an undefined reference
d.pops('block', 'block/scope?').pushes('table/block?', 'block/scope?', 'block/compilable?'));
define$2('HasBlock', d => d.pops('block', 'block/scope?').pushes('ref/boolean'));
define$2('HasBlockParams', d => d.pops('block', 'block/compilable?').pops('scope', 'block/scope?').pops('table', 'table/block?').pushes('ref/boolean'));

// @active
const METADATA = MetadataBuilder.build(({
  add,
  stack
}) => add(`PushFrame as pushf`, stack.params([]).returns(['register/instruction', 'register/stack'])).add(`PopFrame as popf`, stack.dynamic({
  reason: 'frames pop an arbitrary number of stack elements'
})).add(`Jump as goto`, ['to:imm/u32']).add(`ReturnTo as setra`, ['offset:imm/pc']).add(`UnwindTypeFrame as unwind`).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(RESERVED).add(`PushBegin as push<-begin`, ['catch:imm/pc'], stack.params(['handler:reference/any']).returns(['reference/any'])).add(`Begin as begin`).add(`Catch as catch`).add(`Finally as finally`).add(`InvokeVirtual as vcall`, stack.delta(-1)).add(`InvokeStatic as scall`, ['offset:imm/u32']).add(`Start as start`).add(`Return as ret`).add(`Helper as ncall`, [`helper:handle`], stack.params(['args:args']).returns([])).add(`SetNamedVariables as vsargs`, [`register:register`]).add(`SetBlocks as vbblocks`, [`register:register`]).add(`SetVariable as sbvar`, [`symbol:variable`], stack.delta(-1)).add(`SetBlock as sbblock`, [`symbol:variable`], stack.delta(-3)).add(`GetVariable as symload`, [`symbol:variable`], stack.params([]).returns(['reference/any'])).add(`GetProperty as replace<-prop`, [`property:const/str`], stack.params(['obj:reference/any']).returns(['reference/any'])).add(`GetBlock as push<-scope`, [`block:variable`], stack.delta(+1)).add(`SpreadBlock as push2<-block`, stack.delta(+2)).add(`HasBlock as store<-hasblock`).add(`HasBlockParams as pop2->hasparam`, stack.params(['block:block/handle', 'scope:scope', 'table:block/table?']).returns(['bool'])).add(`Concat as concat`, ['count:imm/u32'], stack.dynamic(({
  op1
}) => ({
  type: 'operations',
  peek: 0,
  pop: op1,
  push: 1,
  delta: -op1 + 1
}))).add(`Constant as rconstload`, ['constant:const/any'], stack.delta(+1)).add(`ConstantReference as rconstrefload`, ['constant:const/any'], stack.delta(+1)).add(`Primitive as pconstload`, ['constant:const/primitive'], stack.delta(+1)).add(`PrimitiveReference as ptoref`, []).add(`ReifyU32 as reifyload`, stack.delta(+1)).add(`Dup as push_dup`, ['register:register', 'offset:imm/u32'], stack.delta(+1)).add(`Pop as pop`, ['count:imm/u32'], stack.dynamic(({
  op1
}) => ({
  type: 'operations',
  pop: op1,
  push: 0,
  peek: 0,
  delta: -op1
}))).add(`Load as stack->store`, ['register:register'], stack.delta(-1)).add(`Fetch as load->stack`, ['register:register'], stack.delta(+1)).add(`RootScope as rscopepush`, ['size:imm/u32']).add(`VirtualRootScope as vrscopepush`, ['register:register']).add(`ChildScope as cscopepush`, []).add(`PopScope as popscope`)

// apnd_* get the values from a register (and therefore leave the stack untouched)
// apnd_dyn* get the values from the stack (and therefore decrement the stack)
.add(`Text as apnd_text`, ['contents:const/str']).add(`Comment as apend_comment`, ['contents:const/str']).add(`AppendHTML as apnd_dynhtml`, stack.delta(-1)).add(`AppendSafeHTML as apnd_dynshtml`, stack.delta(-1)).add(`AppendDocumentFragment as apnd_dynfrag`, stack.delta(-1)).add(`AppendNode as apnd_dynnode`, [], stack.delta(-1)).add(`AppendText as apnd_dyntext`, [], stack.delta(-1)).add(`OpenElement as apnd_tag`, ['tag:const/str']).add(`OpenDynamicElement as apnd_dyntag`, [], stack.delta(-1)).add(`PushRemoteElement as apnd_remotetag`, stack.delta(-3)).add(`StaticAttr as apnd_attr`, ['name:const/str', 'value:const/str', 'namespace:const/str?']).add(`DynamicAttr as apnd_dynattr`, ['name:const/str', 'value:const/str'], stack.params(['value:reference/any']).returns([])).add(`ComponentAttr as apnd_compattr`, ['name:const/str', 'value:const/str', 'namespace:const/str?'], stack.params(['value:reference/any']).returns([])).add(`FlushElement as apnd_flush`, []).add(`CloseElement as apnd_close`, []).add(`PopRemoteElement as apnd_remoteclose`, [])
// @audit what's this parameter?
.add(`Modifier as apnd_modifier`, ['helper:const/fn'], stack.delta(-1)).add(`BindDynamicScope as setdynscope`, ['names:const/str[]'], stack.dynamic(({
  op1
}, state) => {
  const names = state.constant.constants.getArray(op1);
  return {
    type: 'operations',
    pop: names.length,
    push: 0,
    peek: 0,
    delta: -names.length
  };
})).add(`PushDynamicScope as dynscopepush`).add(`PopDynamicScope as dynscopepop`).add(`CompileBlock as cmpblock`, stack.params(['template:block/template']).returns(['block/handle'])).add(`PushBlockScope as push<-scope`, stack.params([]).returns(['scope'])).add(`PushSymbolTable as push<-table`, stack.params([]).returns(['table'])).add(`InvokeYield as invoke`, stack.params(['table:block/table', 'scope:scope', 'block:block/handle?', 'args:args'])
// ra, fp
.returns(['register/stack', 'register/stack'])).add(`JumpIf as pop->cgoto`, ['target:register/instruction'], stack.params(['condition:reference/bool']).returns([])).add(`JumpUnless as pop->cngoto`, ['target:register/instruction'], stack.params(['condition:reference/bool']).returns([])).add(`JumpEq as gotoeq`, ['target:register/instruction', 'comparison:instruction/relative'], stack.peeks(['other:i32'])).add(`AssertSame as assert_eq`, stack.params(['reference:reference/any']).returns(UNCHANGED)).add(`Enter as enter`, ['count:imm/u32', 'begin:imm/bool']).add(`Exit as exit1`).add(`ToBoolean as tobool(top)`, stack.params(['value:reference/any']).returns(['reference/bool'])).add(`EnterList as list/start`, ['start:instruction/relative', 'else:instruction/absolute'], stack.params(['key:reference/fn', 'list:reference/any']).dynamic({
  reason: 'the stack only changes if the iterator is non-empty'
})).add(`ExitList as list/done`).add(`Iterate as list/item`, ['breaks:instruction/absolute'], stack.params(['iterator:glimmer/iterator']).dynamic({
  reason: 'the behavior is different depending on the result of iterating the iterator'
})).add(`Main as call/main`, ['register:register/sN'], stack.params(['invocation:block/invocation', 'component:component/definition']).returns([])
// @todo characterize loading into $s0
).add(`ContentType as push<-ctype`, stack.peeks(['value:reference/any']).pushes(['enum/ctype'])).add(`Curry as v0<-curryref[pop2]`, ['type:imm/enum<curry>', 'strict?:const/bool'], stack.params(['args:args/captured', 'definition:reference/definition']).returns([])).add(`PushComponentDefinition as push<-def`, ['definition:const/definition'], stack.params([]).returns(['component/instance'])).add(`PushDynamicComponentInstance as push<-s0(definition)`, stack.params(['definition:component/definition']).returns(['component/instance'])).add(`ResolveDynamicComponent as push<-pop_definition`, stack.params(['definition:component/%definition']).returns(['component/definition'])).add(`ResolveCurriedComponent as push<-pop_curryref`, stack.params(['definition:component/%value']).returns(['component/definition'])).add(`PushArgs as push<-args`, ['names:const/str[]', 'block-names:const/str[]', 'flags:imm/u32{todo}'], stack.params([]).returns(['args'])).add(`PushEmptyArgs as push<-args0`, stack.params([]).returns(['args'])).add(`PrepareArgs as prepare<-args0`, stack.dynamic({
  reason: "The behavior of PrepareArgs is highly dynamic. It may be useful to verify it, but it's not worth the effort at the moment."
})).add(`CaptureArgs as push<-args0`, stack.params(['args:args']).returns(['args/captured'])).add(`CreateComponent as s0/component_create`, ['flags:imm/i32{todo}', 'instance:register/sN']).add(`RegisterComponentDestructor as `, ['instance:register/sN']).add(`PutComponentOperations as t0<-new_operations`).add(`GetComponentSelf as push<-self`, ['instance:register/sN', 'names:const/str[]?'], stack.params([]).returns(['value/dynamic'])).add(`GetComponentTagName as `, ['instance:register/sN'], stack.params([]).returns(['value/str'])).add(`GetComponentLayout as push<-layout`, ['instance:register/sN'], stack.params([]).returns(['block/table', 'block/handle'])).add(`SetupForEval as scope<-eval`, ['finished-instance:register/sN']).add(`PopulateLayout as instance<-block`, ['instance:register/sN'], stack.params(['table:block/table', 'block:block/handle']).returns([])).add(`InvokeComponentLayout as pc<-instance/handle`, ['finished-instance:register/sN'])
// cg means cache group
// push a block and a cache group
.add(`BeginComponentTransaction as blocks<-push_cg`, ['instance:register/sN'])
// pop the cache group
.add(`CommitComponentTransaction as blocks<-pop_cg`).add(`DidCreateElement as hook(cm_didcreate)`, ['instance:register/sN'])
// pop the block
.add(`DidRenderLayout as blocks<-pop`, ['instance:register/sN']).add(`Debugger as hook(debugger)`, ['symbols:const/str[]', 'info:const/i32[]']).add(`StaticComponentAttr as element<-attr<static>`, ['name:const/str', 'value:const/str', 'namespace:const/str?']).add(`DynamicContentType as `, stack.params(['value:reference/any']).pushes(['enum/ctype'])).add(`DynamicHelper as v0<-helper`, stack.params(['args:args', 'ref:reference/any']).returns([])).add(`DynamicModifier as element<-modifier`, stack.params(['args:args', 'ref:reference/any']).returns([])).add(`IfInline as push<-if[pop3]`, stack.params(['falsy:reference/any', 'truthy:reference/any', 'condition:reference/any']).returns(['reference/any'])).add(`Not as push<-not[pop1]`, stack.params(['ref:reference/any']).returns(['reference/bool'])).add(`GetDynamicVar as push<-dynvar[pop1]`, stack.params(['name:reference/any']).returns(['reference/any'])).add(`Log as v0<-log_ref[pop1]`, stack.params(['args:args']).returns([])).add(`PushUnwindTarget as push<-target`, stack.params(['target:register/instruction']).returns([])));

const FORMATTERS = {
  value: '%O',
  string: '%s',
  integer: '%d',
  dom: '%o'
};
class Fragment {
  #type;
  constructor(type) {
    this.#type = type;
  }
  get width() {
    return this.leaves().reduce((sum, leaf) => {
      const {
        kind,
        value
      } = leaf.#type;
      switch (kind) {
        case 'integer':
        case 'string':
          return sum + String(value).length;
        case 'value':
        case 'dom':
          // @fixme this assumes one-digit references
          return sum + '[]'.length + 1;
      }
    }, 0);
  }
  isSubtle() {
    return this.leaves().every(leaf => leaf.#type.subtle);
  }
  map(ifPresent) {
    if (this.isEmpty()) return this;
    const fragment = ifPresent(this);
    return this.isSubtle() ? fragment.subtle() : fragment;
  }
  isEmpty(options = {
    showSubtle: true
  }) {
    return this.leaves().every(leaf => !leaf.#shouldShow(options));
  }
  leaves() {
    if (this.#type.kind === 'multi') {
      return this.#type.value.flatMap(f => f.leaves());
    } else if (this.#type.kind === 'string' && this.#type.value === '') {
      return [];
    } else {
      return [this];
    }
  }
  subtle(isSubtle = true) {
    if (this.isSubtle() === false && isSubtle === false) {
      return this;
    }
    const fragment = this.#subtle(isSubtle);
    return isSubtle ? fragment.styleAll('subtle') : fragment;
  }
  #subtle(isSubtle) {
    if (this.#type.kind === 'multi') {
      return new Fragment({
        ...this.#type,
        value: this.leaves().flatMap(f => f.subtle(isSubtle).leaves())
      });
    } else {
      return new Fragment({
        ...this.#type,
        subtle: isSubtle
      });
    }
  }
  styleAll(...allStyle) {
    if (allStyle.length === 0) return this;
    if (this.#type.kind === 'multi') {
      return new Fragment({
        ...this.#type,
        value: this.#type.value.flatMap(f => f.styleAll(...allStyle).leaves())
      });
    } else {
      return new Fragment({
        ...this.#type,
        style: mergeStyle(this.#type.style, styles(...allStyle))
      });
    }
  }
  stringify(options) {
    return this.leaves().filter(leaf => leaf.#shouldShow(options)).map(leaf => {
      const fragment = leaf.#type;
      if (fragment.kind === 'value') {
        return `<object>`;
      } else {
        return String(fragment.value);
      }
    }).join('');
  }
  #shouldShow(options) {
    return this.leaves().some(leaf => {
      const fragment = leaf.#type;
      if (fragment.subtle && !options.showSubtle) {
        return false;
      } else if (fragment.kind === 'string' && fragment.value === '') {
        return false;
      }
      return true;
    });
  }
  toLog(options) {
    const buffer = new LogFragmentBuffer(options);
    for (const leaf of this.leaves()) {
      leaf.appendTo(buffer);
    }
    return buffer.flush();
  }
  appendTo(buffer) {
    const fragment = this.#type;
    if (fragment.kind === 'value') {
      if (fragment.value === null || fragment.value === undefined) {
        return this.#asString(String(fragment.value), STYLES.null).appendTo(buffer);
      } else if (typeof fragment.value === 'string') {
        return this.#asString(JSON.stringify(fragment.value), STYLES.string).appendTo(buffer);
      } else if (typeof fragment.value === 'number') {
        return this.#asString(String(fragment.value), STYLES.number).appendTo(buffer);
      }
    }
    if (fragment.kind === 'multi') {
      for (const f of fragment.value) {
        f.appendTo(buffer);
      }
    } else {
      switch (fragment.kind) {
        case 'string':
        case 'integer':
          buffer.append(fragment.subtle ?? false, `%c${FORMATTERS[fragment.kind]}`, fragment.style, fragment.value);
          break;
        case 'dom':
        case 'value':
          {
            const error = getErrorInstance(fragment.value);
            const annotation = fragment.kind === 'value' && !error ? fragment.annotation : undefined;
            const index = buffer.nextFootnote;
            const style = ANNOTATION_STYLES[index % ANNOTATION_STYLES.length];
            if (annotation) {
              annotation.full.subtle(this.isSubtle()).styleAll({
                style
              }).appendTo(buffer);
            } else if (error) {
              buffer.append(fragment.subtle ?? false, `%c${error.message}`, style);
              buffer.append(true, `%c(${error.name})`, styles('specialVar'));
            } else {
              buffer.append(fragment.subtle ?? false, `%c[${buffer.nextFootnote}]`, style);
            }
            if (error) {
              buffer.enqueue.group(['%cStack', mergeStyle(STYLES.unbold, style)], [`%c${error.stack}`, styles('stack')], {
                collapsed: true
              });
              let cause = error.cause;
              while (cause) {
                if (isErrorInstance(cause)) {
                  buffer.enqueue.group([`%cCaused by`, styles('unbold', 'errorLabel')], [`%c${cause.message}`, styles('errorMessage')], [`%c${cause.stack}`, styles('stack')], {
                    subtle: fragment.subtle ?? false,
                    collapsed: true
                  });
                  cause = cause.cause;
                }
              }
            } else {
              buffer.enqueue.line(fragment.subtle ?? false, `%c[${annotation?.compact ?? buffer.nextFootnote}]%c %c${FORMATTERS[fragment.kind]}`, style, '', error ? STYLES.errorMessage : mergeStyle(fragment.style, style), fragment.value);
            }
            break;
          }
        default:
          assertNever(fragment);
      }
    }
  }
  #asString(value, style) {
    return new Fragment({
      kind: 'string',
      value,
      style,
      subtle: this.isSubtle()
    });
  }
}
class LogFragmentBuffer {
  #template = '';
  #options;
  #substitutions = [];
  #queued = [];
  constructor(options) {
    this.#options = options;
  }
  get nextFootnote() {
    return this.#queued.length;
  }
  enqueue = {
    line: (subtle, template, ...substitutions) => {
      this.#queued.push({
        type: 'line',
        subtle,
        template,
        substitutions
      });
    },
    group: (...args) => {
      const {
        collapsed,
        subtle
      } = !Array.isArray(args.at(-1)) ? {
        collapsed: false,
        subtle: false,
        ...args.pop()
      } : {
        collapsed: false,
        subtle: false
      };
      const [heading, ...children] = args;
      this.#queued.push({
        type: 'group',
        collapsed,
        heading: {
          type: 'line',
          subtle,
          template: heading[0],
          substitutions: heading.slice(1)
        },
        children: children.map(line => ({
          type: 'line',
          subtle,
          template: line[0],
          substitutions: line.slice(1)
        }))
      });
    }
  };
  append(subtle, template, ...substitutions) {
    if (subtle && !this.#options.showSubtle) return;
    this.#template += template;
    this.#substitutions.push(...substitutions);
  }
  #mapLine(line) {
    if (line.subtle && !this.#options.showSubtle) return [];
    return [{
      type: 'line',
      line: [line.template, ...line.substitutions]
    }];
  }
  #mapGroup(group) {
    return {
      type: 'group',
      collapsed: group.collapsed,
      heading: [group.heading.template, ...group.heading.substitutions],
      children: group.children.flatMap(queued => this.#mapEntry(queued))
    };
  }
  #mapEntry(entry) {
    if (entry.type === 'line') {
      return this.#mapLine(entry);
    } else {
      return [this.#mapGroup(entry)];
    }
  }
  flush() {
    return [{
      type: 'line',
      line: [this.#template, ...this.#substitutions]
    }, ...this.#queued.flatMap(queued => this.#mapEntry(queued))];
  }
}
function styles(...styles) {
  return styles.map(c => intoFormat(c).style).join('; ');
}
function mergeStyle(a, b) {
  if (a && b) {
    return `${a}; ${b}`;
  } else {
    return a || b;
  }
}
const ANNOTATION_STYLES = ['background-color: oklch(93% 0.03 300); color: oklch(34% 0.18 300)', 'background-color: oklch(93% 0.03 250); color: oklch(34% 0.18 250)', 'background-color: oklch(93% 0.03 200); color: oklch(34% 0.18 200)', 'background-color: oklch(93% 0.03 150); color: oklch(34% 0.18 150)', 'background-color: oklch(93% 0.03 100); color: oklch(34% 0.18 100)', 'background-color: oklch(93% 0.03 50); color: oklch(34% 0.18 50)', 'background-color: oklch(93% 0.03 0); color: oklch(34% 0.18 0)'];
function isErrorInstance(value) {
  return isObject(value) && value instanceof Error;
}
function getErrorInstance(value) {
  if (isErrorInstance(value)) {
    if (isUserException(value)) {
      return isErrorInstance(value.cause) ? value.cause : value;
    } else {
      return value;
    }
  }
}

// inspired by https://github.com/ChromeDevTools/devtools-frontend/blob/c2c17396c9e0da3f1ce6514c3a946f88a06b17f2/front_end/ui/legacy/themeColors.css#L65
const STYLES = {
  var: 'color: grey',
  varReference: 'color: blue; text-decoration: underline',
  varBinding: 'color: blue;',
  specialVar: 'color: blue',
  prop: 'color: grey',
  specialProp: 'color: red',
  token: 'color: green',
  def: 'color: blue',
  builtin: 'color: blue',
  punct: 'color: grey',
  kw: 'color: rgb(185 0 99 / 100%);',
  type: 'color: teal',
  number: 'color: blue',
  string: 'color: red',
  null: 'color: grey',
  specialString: 'color: darkred',
  atom: 'color: blue',
  attrName: 'color: orange',
  attrValue: 'color: blue',
  comment: 'color: green',
  meta: 'color: grey',
  register: 'color: purple',
  constant: 'color: purple',
  subtle: 'color: lightgrey',
  internals: 'color: lightgrey; font-style: italic',
  sublabel: 'font-style: italic; color: grey',
  error: 'color: red',
  label: 'text-decoration: underline',
  errorLabel: 'color: darkred; font-style: italic',
  errorMessage: 'color: darkred; text-decoration: underline',
  stack: 'color: grey; font-style: italic',
  unbold: 'font-weight: normal',
  pointer: 'background-color: lavender; color: indigo',
  pointee: 'background-color: lavender; color: indigo',
  focus: 'font-weight: bold',
  focusColor: 'background-color: lightred; color: darkred'
};
const as = Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, value => intoFragment(value).styleAll({
  style: v
})]));
function intoFormat(format) {
  if (typeof format === 'string') {
    return {
      style: STYLES[format]
    };
  } else {
    return format;
  }
}
function intoFragment(value) {
  const fragments = intoFragments(value);
  const [first, ...rest] = fragments;
  if (first !== undefined && rest.length === 0) {
    return first;
  }
  return new Fragment({
    kind: 'multi',
    value: fragments
  });
}
function intoFragments(value) {
  if (Array.isArray(value)) {
    return value.flatMap(intoFragments);
  } else if (typeof value === 'object' && value !== null) {
    return value.leaves();
  } else {
    return [intoLeafFragment(value)];
  }
}
function intoLeafFragment(value) {
  if (value === null) {
    return new Fragment({
      kind: 'value',
      value: null
    });
  } else if (typeof value === 'number') {
    return new Fragment({
      kind: 'integer',
      value
    });
  } else if (typeof value === 'string') {
    if (/^[\s\p{P}]*$/u.test(value)) {
      return new Fragment({
        kind: 'string',
        value,
        style: STYLES.punct
      });
    } else {
      return new Fragment({
        kind: 'string',
        value
      });
    }
  } else {
    return value;
  }
}
function value(value, options) {
  // const annotation = options && 'annotation' in options ? { }

  const normalize = () => {
    if (options === undefined) return;
    if ('annotation' in options) {
      return {
        compact: options.annotation,
        full: intoFragment(options.annotation)
      };
    } else {
      return {
        compact: options.short,
        full: intoFragment(options.full)
      };
    }
  };
  return new Fragment({
    kind: 'value',
    value,
    annotation: normalize()
  });
}
function dom(value) {
  return new Fragment({
    kind: 'dom',
    value
  });
}
function empty() {
  return new Fragment({
    kind: 'string',
    value: ''
  });
}
function join(frags, separator) {
  const sep = separator ? intoFragment(separator) : empty();
  if (frags.length === 0) {
    return empty();
  }
  let seenUnsubtle = false;
  let seenAny = false;
  const output = [];
  for (const frag of frags) {
    const fragment = intoFragment(frag);
    const isSubtle = fragment.isSubtle();
    const sepIsSubtle = isSubtle || !seenUnsubtle;

    // If the succeeding fragment is subtle, the separator is also subtle. If the succeeding
    // fragment is unstubtle, the separator is unsubtle only if we've already seen an unsubtle
    // fragment. This ensures that separators are not ultimately present if the next element is not
    // printed.

    if (seenAny) {
      output.push(...sep.subtle(sepIsSubtle).leaves());
    }
    output.push(...fragment.leaves());
    seenUnsubtle = !isSubtle;
    seenAny = true;
  }
  return new Fragment({
    kind: 'multi',
    value: output
  });
}
function group(...frags) {
  return new Fragment({
    kind: 'multi',
    value: frags.flatMap(f => intoFragment(f).leaves())
  });
}
function frag(strings, ...values) {
  const buffer = [];
  strings.forEach((string, i) => {
    buffer.push(...intoFragment(string).leaves());
    const dynamic = values[i];
    if (dynamic) {
      buffer.push(...intoFragment(dynamic).leaves());
    }
  });
  return new Fragment({
    kind: 'multi',
    value: buffer
  });
}
function subtle(strings, ...values) {
  return frag(strings, ...values).subtle();
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map(k => [k, obj[k]]));
}
function normalizeOptions(options) {
  let isSubtle;
  const subtleOption = options?.subtle;
  if (typeof subtleOption === 'boolean') {
    isSubtle = () => subtleOption;
  } else if (typeof subtleOption === 'function') {
    isSubtle = subtleOption;
  } else {
    isSubtle = () => false;
  }
  return {
    map: options?.as ?? (value => intoFragment(value)),
    isSubtle
  };
}
function entries(entries, options) {
  const {
    map,
    isSubtle
  } = normalizeOptions(options);
  return join(entries.map(([k, v]) => isSubtle(v) ? frag`${as.subtle(k)}: ${as.subtle(String(v))}`.subtle() : frag`${as.kw(k)}: ${map(v)}`), ', ');
}
function record(record, options) {
  return wrap('[ ', entries(Object.entries(record), options), ']');
}
function tuple(record, options) {
  return wrap('[ ', entries(Object.entries(record), options), ']');
}
/**
 * The prepend function returns a subtle fragment if the contents are subtle.
 */
function prepend(before, contents) {
  return contents.map(f => frag`${before}${f}`);
}
/**
 * The append function returns a subtle fragment if the contents are subtle.
 */
function append(contents, after) {
  return contents.map(f => frag`${f}${after}`);
}
/**
 * The `wrap` function returns a subtle fragment if the contents are subtle.
 */
function wrap(start, contents, end) {
  return append(prepend(start, contents), end);
}
function nullableArray(items, options) {
  if (items === null) {
    return value(null);
  } else {
    return array(items, options);
  }
}

/**
 * A compact array makes the wrapping `[]` subtle if there's only one element.
 */
function compactArray(items, options) {
  const [first] = items;
  if (first === undefined) {
    return options.when?.empty ? intoFragment(options.when.empty) : frag`[]`.subtle();
  }
  const {
    map,
    isSubtle
  } = normalizeOptions(options);
  const contents = items.map(item => isSubtle(item) ? frag`${map(item)}`.subtle() : map(item));
  const body = join(contents, ', ');
  const unsubtle = contents.filter(f => !f.isSubtle());
  if (unsubtle.length === 0) {
    return intoFragment(options.when.allSubtle).subtle();
  } else if (unsubtle.length === 1) {
    return group(frag`[`.subtle(), body, frag`]`.subtle());
  } else {
    return wrap('[ ', body, ' ]');
  }
}
function array(items, options) {
  if (items.length === 0) {
    return frag`[]`;
  } else {
    const {
      map,
      isSubtle
    } = normalizeOptions(options);
    const contents = items.map(item => isSubtle(item) ? frag`${map(item)}`.subtle() : map(item));
    return wrap('[ ', join(contents, ', '), ' ]');
  }
}
function describeRef(ref) {
  const debug = inDevmode(ref.description);
  if (debug.read === 'infallible') {
    if (debug.serialization === 'String') {
      return frag`<${as.kw('readonly')} ${String(unwrapReactive(ref))}>`;
    }
  }
  const label = as.type(String(stringifyDebugLabel(ref)) ?? '');
  const result = readReactive(ref);
  switch (result.type) {
    case 'err':
      return frag`<${as.error('ref')} ${label} ${as.error('error')}=${value(result.value)}>`;
    case 'ok':
      {
        return frag`<${as.kw('ref')} ${join([label, value(result.value)], ' ')}>`;
      }
  }
}
function stackValue(element) {
  if (isReference(element)) {
    return describeRef(element);
  } else if (isCompilable(element)) {
    const table = element.symbolTable;
    if ('parameters' in table) {
      const blockParams = table.parameters.length === 0 ? empty() : frag` as |${join(table.parameters.map(s => element.meta.debugSymbols?.at(s - 1) ?? `?${s}`), ' ')}|`;
      return value(element, {
        full: frag`<${as.kw('block')}${blockParams}>`,
        short: 'block'
      });
    } else {
      return frag` <${as.kw('template')} ${element.meta.moduleName ?? '(unknown module)'}>`;
    }
  } else {
    return value(element);
  }
}
function updatingOpcodes(opcodes) {
  return array(opcodes, {
    as: updatingOpcode
  });
}
function updatingOpcode(opcode) {
  const name = as.kw(opcode.constructor.name);
  return opcode.debug ? frag`<${name} ${stackValue(opcode.debug)}>` : name;
}
function eqCursor(a, b) {
  return a.parent === b.parent && a.next === b.next;
}
function cursor({
  parent,
  next
}) {
  if (next) {
    return frag`<${as.kw('insert')} before ${stackValue(next)}>`;
  } else {
    return frag`<${as.kw('append to')} ${stackValue(parent)}>`;
  }
}
function scopeValue(element) {
  if (Array.isArray(element)) {
    return frag`<${as.kw('block')}>`;
  } else if (element === null) {
    return value(null);
  } else {
    return stackValue(element);
  }
}
function bounds(bounds) {
  const parent = bounds.parentElement();
  const {
    first,
    last
  } = bounds;
  if (first === null) {
    return frag`<${as.kw('bounds')} (empty) ${dom(parent)}>`;
  } else if (first === last) {
    return frag`<${as.kw('bounds')} ${dom(first)}>`;
  } else {
    return frag`<${as.kw('bounds')} ${dom(first)}..${last ? dom(last) : as.kw('unfinished')}>`;
  }
}
function partialBounds(bounds) {
  return frag`<${as.kw('partial')}:${as.sublabel(bounds.type)} ${dom(bounds.node)}>`;
}
function eqBlock(a, b) {
  return a.constructor === b.constructor && a.parentElement() === b.parentElement();
}
function stackChange(before, after, options) {
  if (eqStack(before, after)) {
    return frag`${as.subtle('(unchanged)')} ${nullableArray(after, options)}`.subtle();
  }
  return describeDiff(diffStacks(before ?? [], after ?? []), options);
}
function changeArray(a, b, {
  eq = Object.is,
  as,
  or = value
}) {
  if (b === undefined || b === null) {
    return or(b);
  }
  return array(b, {
    as,
    subtle: eq(a, b)
  });
}
function eqStack(a, b) {
  if (a === null || b === null) {
    return a === b;
  }
  return a.length === b.length && a.every((a, i) => Object.is(a, b[i]));
}
function eqStackStack(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  return a.length === b.length && a.every((a, i) => eqStack(a, b[i] ?? null));
}
function diffStacks(before, after, eq = Object.is) {
  if (eqStack(before, after)) {
    return {
      unused: after ?? [],
      popped: [],
      pushed: [],
      peeked: []
    };
  }
  let diverged = false;
  const same = [];
  const popped = [];
  const pushed = [];
  for (const [a, b] of zip(before ?? [], after ?? [])) {
    if (a === undefined || b === undefined) {
      diverged = true;
      if (b === undefined) {
        popped.push(a);
      } else {
        pushed.push(b);
      }
      continue;
    } else if (diverged || !eq(a, b)) {
      popped.push(a);
      pushed.push(b);
    } else {
      same.push(b);
    }
  }
  return {
    unused: same,
    peeked: [],
    popped,
    pushed
  };
}
function describeDiff({
  unused,
  peeked,
  pushed,
  popped
}, options) {
  return join([array(unused, options).subtle(), labelled('peeks', compactArray(peeked, {
    ...options,
    when: {
      allSubtle: 'no peeks'
    }
  })), labelled('pops', compactArray(popped, {
    ...options,
    when: {
      allSubtle: 'no pops'
    }
  })), labelled('pushes', compactArray(pushed, {
    ...options,
    when: {
      allSubtle: 'no pushes'
    }
  }))], ' ');
}
function labelled(label, value) {
  return prepend(frag`${as.sublabel(label)} `, value);
}

class SerializeBlockContext {
  #block;
  constructor(block) {
    this.#block = block;
  }
  serialize(param) {
    switch (param.type) {
      case 'number':
      case 'boolean':
      case 'string':
      case 'primitive':
        return this.#stringify(param.value, 'stringify');
      case 'array':
        return param.value?.map(value => this.#stringify(value, 'unknown')) ?? null;
      case 'dynamic':
      case 'constant':
        return stackValue(param.value);
      case 'register':
        return this.#stringify(param.value, 'register');
      case 'instruction':
        return this.#stringify(param.value, 'pc');
      case 'variable':
        {
          const value = param.value;
          if (value === 0) {
            return frag`{${as.kw('this')}}`;
          } else if (this.#block?.debugSymbols && this.#block.debugSymbols.length >= value) {
            // @fixme something is wrong here -- remove the `&&` to get test failures
            return frag`${as.varReference(this.#block.debugSymbols[value - 1])}${frag`:${value}`.subtle()}`;
          } else {
            return frag`{${as.register('$fp')}+${value}}`;
          }
        }
      case 'error:opcode':
        return `{raw:${param.value}}`;
      case 'error:operand':
        return `{err:${param.options.label.name}=${param.value}}`;
      case 'enum<curry>':
        return `<curry:${param.value}>`;
      default:
        exhausted(param);
    }
  }
  #stringify(value, type) {
    switch (type) {
      case 'stringify':
        return JSON.stringify(value);
      case 'constant':
        return `${this.#stringify(value, 'unknown')}`;
      case 'register':
        return value;
      case 'variable':
        {
          if (value === 0) {
            return `{this}`;
          } else if (this.#block?.debugSymbols && this.#block.debugSymbols.length >= value) {
            return `{${this.#block.debugSymbols[value - 1]}:${value}}`;
          } else {
            return `{$fp+${value}}`;
          }
        }
      case 'pc':
        return `@${value}`;
      case 'unknown':
        {
          switch (typeof value) {
            case 'function':
              return '<function>';
            case 'number':
            case 'string':
            case 'bigint':
            case 'boolean':
              return JSON.stringify(value);
            case 'symbol':
              return `${String(value)}`;
            case 'undefined':
              return 'undefined';
            case 'object':
              {
                if (value === null) return 'null';
                if (Array.isArray(value)) return `<array[${value.length}]>`;
                let name = value.constructor.name;
                switch (name) {
                  case 'Error':
                  case 'RangeError':
                  case 'ReferenceError':
                  case 'SyntaxError':
                  case 'TypeError':
                  case 'WeakMap':
                  case 'WeakSet':
                    return `<${name}>`;
                  case 'Object':
                    return `<${name}>`;
                }
                if (value instanceof Map) {
                  return `<Map[${value.size}]>`;
                } else if (value instanceof Set) {
                  return `<Set[${value.size}]>`;
                } else {
                  return `<${name}>`;
                }
              }
          }
        }
    }
  }
}

class DebugState {
  #state;
  constructor(state) {
    this.#state = state;
  }
  target(relative) {
    return this.#state.currentPc + relative;
  }
  derefHandle(handle) {
    return this.constants.getValue(decodeHandle(handle));
  }
  derefArrayHandle(handle) {
    return this.constants.getArray(decodeHandle(handle));
  }
  get stack() {
    return this.rawStack;
  }
  get rawStack() {
    return this.#state.frame.stack;
  }
  get snapshot() {
    return this.#state;
  }
  get constants() {
    return this.#state.constant.constants;
  }
  get heap() {
    return this.#state.constant.heap;
  }
  get dom() {
    return this.#state.dom;
  }
  get frame() {
    return this.#state.frame;
  }

  /**
   * The next instruction to be executed
   */
  get nextPc() {
    return this.#state.$pc;
  }
  get sp() {
    return this.#state.$sp;
  }
  get fp() {
    return this.#state.$fp;
  }
  get symbols() {
    return this.#state.constant.block?.debugSymbols ?? [];
  }
  get registers() {
    return {
      frame: pick(this.#state, ['$pc', '$fp', '$sp', '$ra']),
      saved: pick(this.#state, ['$s0', '$s1']),
      temporaries: pick(this.#state, ['$t0', '$t1']),
      return: this.#state.$v0,
      returnTo: pick(this.#state, ['$v0', '$up'])
    };
  }
}
class DebugOpState {
  #op;
  #debug;
  #metadata;
  #block;
  constructor(constants, op, block) {
    this.#op = op;
    const {
      name,
      params
    } = debug();
    this.#debug = {
      name,
      params
    };
    this.#metadata = opcodeMetadata(op.type);
    this.#block = new SerializeBlockContext(block);
  }
  get metadata() {
    return this.#metadata;
  }
  stack(before) {
    return this.#metadata.stack(this.#op, before.snapshot);
  }
  expectedStackDelta(before) {
    return this.stack(before)?.delta;
  }

  /**
   * The current instruction, computed by subtracting the size of the opcode from the next
   * instruction.
   */

  pos(before) {
    return before.nextPc - this.#op.size;
  }
  get name() {
    return this.#debug.name;
  }
  get params() {
    return this.#debug.params;
  }
  get dynamicParams() {
    const entries = Object.entries(this.#debug.params).filter(entry => entry[1].isDynamic);
    if (entries.length === 0) {
      return null;
    } else {
      return Object.fromEntries(entries);
    }
  }
  describe() {
    const {
      name,
      params
    } = this.#debug;
    let args = Object.entries(params).map(([p, v]) => frag`${as.attrName(p)}=${this.#serialize(v)}`);
    return frag`(${join([as.kw(name), ...args], ' ')})`;
  }
  #serialize(value) {
    return this.#block.serialize(value);
  }
}
class DiffState {
  // readonly #prev: DebugState | undefined;
  #before;
  #after;
  constructor(prev, before, after) {
    // this.#prev = prev;
    this.#before = before;
    this.#after = after;
  }
  #change(compare, create) {
    if (this.#before === undefined) {
      return create(compare(this.#after.snapshot));
    }
    const prev = compare(this.#before.snapshot);
    const current = compare(this.#after.snapshot);
    if (Object.is(prev, current)) {
      return create(current).subtle().styleAll('subtle');
    } else {
      return create(current);
    }
  }
  log(logger, op) {
    logger.log(this.ra);
    logger.log(this.return);
    logger.labelled('saved', this.saved);
    logger.labelled('temporaries', this.temporaries);
    logger.log(tuple(this.#after.registers.frame, {
      as: intoFragment
    }).subtle());
    logger.log(this.up);
    if (op && this.#before) {
      logger.labelled('frame', this.frame(op.stack(this.#before)));
    }
    logger.labelled('scope', this.scope);
    logger.labelled('updating', this.updating);
    logger.labelled('destructors', this.destructors);
    logger.labelled('cursors', this.cursors);
    logger.labelled('constructing', this.constructing);
    logger.labelled('blocks', this.blocks);
  }
  change(compare, create) {
    if (this.#before === undefined) {
      return create(compare(this.#after.snapshot));
    }
    const prev = compare(this.#before.snapshot);
    const current = compare(this.#after.snapshot);
    if (Object.is(prev, current)) {
      return create(prev).subtle().styleAll('subtle');
    } else {
      return create(prev);
    }
  }
  get return() {
    return this.#formatState('$v0', {
      as: value,
      desc: 'return value'
    });
  }
  get pc() {
    return this.#formatState('$pc', {
      as: intoFragment
    }).subtle();
  }
  get up() {
    return this.#formatState('$up', {
      as: value
    });
  }
  get ra() {
    return this.#formatState('$ra', {
      as: intoFragment
    });
  }
  get saved() {
    const s0 = this.#formatState('$s0', {
      as: value
    });
    const s1 = this.#formatState('$s1', {
      as: value
    });
    return array([s0, s1]);
  }
  get temporaries() {
    const t0 = this.#formatState('$t0', {
      as: value
    });
    const t1 = this.#formatState('$t1', {
      as: value
    });
    return array([t0, t1]);
  }
  get destructors() {
    const befores = this.#before?.snapshot.frame.destructors ?? null;
    const afters = this.#after?.snapshot.frame.destructors ?? null;
    return describeDiff(diffStacks(befores, afters), {
      as: stackValue
    });
  }
  get updating() {
    const befores = this.#before?.snapshot.frame.updating ?? null;
    const afters = this.#after?.snapshot.frame.updating ?? null;
    let fragments = [];
    for (const [i, before] of enumerate(befores ?? [])) {
      const after = afters.at(i);
      if (after === undefined) {
        fragments.push(['pops list', i, array(before, {
          as: updatingOpcode
        })]);
        continue;
      }
      if (eqStack(before, after)) {
        fragments.push(['retains', i, compactArray(after, {
          as: updatingOpcode,
          when: {
            allSubtle: ''
          }
        }).subtle()]);
        continue;
      }
      fragments.push(['changes', i, describeDiff(diffStacks(before, after), {
        as: updatingOpcode
      })]);
    }
    const pushAfter = befores?.length ?? 0;
    const pushes = afters.slice(pushAfter);
    for (const [i, push] of enumerate(pushes)) {
      fragments.push(['pushes', i + pushAfter, compactArray(push, {
        as: updatingOpcode,
        when: {
          empty: as.specialString('new list'),
          allSubtle: ''
        }
      })]);
    }
    const body = fragments.map(([kind, originalIndex, fragment]) => {
      const isSubtle = kind === 'changes' && pushes.length === 0;
      return prepend(frag`  ${String(originalIndex)}. ${kind} `.subtle(isSubtle), fragment);
    });
    const needsWrapper = fragments.some(([type]) => {
      return type === 'pops list' || type === 'pushes';
    });
    if (needsWrapper) {
      return wrap('[\n', join(body, ',\n'), '\n]');
    } else {
      return group(frag`[\n`.subtle(), join(body, ',\n'), frag`\n]`.subtle());
    }
  }
  get scope() {
    const before = this.#before?.snapshot.frame.scope ?? null;
    const after = this.#after?.snapshot.frame.scope ?? null;
    return changeArray(before, after, {
      eq: eqStack,
      as: scopeValue,
      or: value
    });
  }
  get cursors() {
    const before = this.#before?.snapshot.dom.inserting ?? null;
    const after = this.#after?.snapshot.dom.inserting ?? null;
    return describeDiff(diffStacks(before, after, eqCursor), {
      as: cursor
    });
  }
  get constructing() {
    const before = this.#before?.snapshot.dom.constructing ?? null;
    const after = this.#after?.snapshot.dom.constructing ?? null;
    if (before === null && after === null || before === after) {
      return subtle`(unchanged) ${value(before)}`;
    }
    if (before === null) {
      return frag`${subtle`null -> `}${value(after)}`;
    }
    if (after === null) {
      return frag`${subtle`${value(before)} -> `}null`;
    }
    return frag`${subtle`${value(before)} -> `}${value(after)}`;
  }
  get blocks() {
    const before = this.#before?.snapshot.dom.blocks ?? null;
    const after = this.#after?.snapshot.dom.blocks ?? null;
    return describeDiff(diffStacks(before ?? [], after ?? [], eqBlock), {
      as: bounds
    });
  }
  frame(spec) {
    const before = this.#before?.stack ?? [];
    const after = this.#after?.stack ?? [];
    if (spec.type === 'delta' || spec.type === 'unchecked') {
      if (eqStack(before, after)) {
        return frag`${as.subtle('(unchanged)')} ${value(before)}`.subtle();
      }
      return describeDiff(diffStacks(before, after), {
        as: stackValue
      });
    }
    const {
      before: beforePopped,
      after: popped
    } = partitionFromEnd(before, spec.pop);
    const {
      before: unused,
      after: peeked
    } = partitionFromEnd(beforePopped, spec.peek);
    const pushed = partitionFromEnd(after, spec.push).after;
    return describeDiff({
      unused,
      peeked,
      pushed,
      popped
    }, {
      as: stackValue
    });
  }

  /**
   * If the state has changed, returns a fragment that describes the change. Otherwise, returns a
   * subtle fragment describing the state.
   */
  #formatState(key, {
    as: map,
    desc
  }) {
    return this.#change(state => state[key], value => {
      const description = desc ? frag` (${desc})`.styleAll('comment') : '';
      return frag`${as.kw(key)}${description}: ${map(value)}`;
    });
  }
}
function partitionFromEnd(array, position) {
  if (position === 0) {
    return {
      before: array,
      after: []
    };
  } else {
    return {
      before: array.slice(0, -position),
      after: array.slice(-position)
    };
  }
}

function logOpcodeSlice(context, start, end) {
  if (LOCAL_TRACE_LOGGING) {
    const logger = new DebugLogger(LOCAL_LOGGER, {
      showSubtle: LOCAL_SUBTLE_LOGGING
    });
    LOCAL_LOGGER.group(`%c${start}:${end}`, 'color: #999');
    const constants = context.program.constants;
    let heap = context.program.heap;
    let opcode = context.program.createOp(heap);
    let _size = 0;
    for (let i = start; i <= end; i = i + _size) {
      opcode.offset = i;
      const op = new DebugOpState(constants, getOpSnapshot(opcode), context.meta);
      logger.log(frag`${i}. ${op.describe()}`);
      _size = opcode.size;
    }
    opcode.offset = -_size;
    LOCAL_LOGGER.groupEnd();
  }
}

// expands object types one level deep

/**
 * A dynamic operand has a value that can't be easily represented as an embedded string.
 */

class DisassembledOperand {
  static of(raw) {
    return new DisassembledOperand(raw);
  }
  #raw;
  constructor(raw) {
    this.#raw = raw;
  }
  get type() {
    return this.#raw[0];
  }
  get value() {
    return this.#raw[1];
  }
  get options() {
    return this.#raw[2];
  }
}
function getOpSnapshot(op) {
  return {
    size: op.size,
    type: op.type,
    op1: op.op1,
    op2: op.op2,
    op3: op.op3
  };
}
function debug(constants, op, meta) {
  unreachable(`BUG: Don't try to debug opcodes while trace is disabled`);
}
function decodeCurry(curry) {
  switch (curry) {
    case CURRIED_COMPONENT:
      return 'component';
    case CURRIED_HELPER:
      return 'helper';
    case CURRIED_MODIFIER:
      return 'modifier';
    default:
      throw Error(`Unexpected curry value: ${curry}`);
  }
}
function decodeRegister(register) {
  switch (register) {
    case $pc:
      return '$pc';
    case $ra:
      return '$ra';
    case $fp:
      return '$fp';
    case $sp:
      return '$sp';
    case $s0:
      return '$s0';
    case $s1:
      return '$s1';
    case $t0:
      return '$t0';
    case $t1:
      return '$t1';
    case $v0:
      return '$v0';
    default:
      return `$bug${register}`;
  }
}
function decodePrimitive(primitive, constants) {
  if (primitive >= 0) {
    return constants.getValue(decodeHandle(primitive));
  }
  return decodeImmediate(primitive);
}

function isUnchecked(check) {
  return typeof check !== 'function';
}
function strip(strings, ...args) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    let string = strings[i];
    let dynamic = args[i] !== undefined ? String(args[i]) : '';
    out += `${string}${dynamic}`;
  }

  // eslint-disable-next-line regexp/no-super-linear-backtracking
  out = /^\s*?\n?([\s\S]*?)\s*$/u.exec(out)[1];
  let min = 9007199254740991; // Number.MAX_SAFE_INTEGER isn't available on IE11

  for (let line of out.split('\n')) {
    let leading = /^\s*/u.exec(line)[0].length;
    min = Math.min(min, leading);
  }
  let stripped = '';
  for (let line of out.split('\n')) {
    stripped += line.slice(min) + '\n';
  }
  return stripped;
}
const META_KIND = ['METADATA', 'MACHINE_METADATA'];
function buildSingleMeta(kind, all, key) {
  let e = kind === 'MACHINE_METADATA' ? 'MachineOp' : 'Op';
  return `${kind}[${e}.${all[key].name}] = ${stringify(all[key], 0)};`;
}
function stringify(o, pad) {
  if (typeof o !== 'object' || o === null) {
    if (typeof o === 'string') {
      return `'${o}'`;
    }
    return JSON.stringify(o);
  }
  if (Array.isArray(o)) {
    return `[${o.map(v => stringify(v, pad)).join(', ')}]`;
  }
  let out = ['{'];
  for (let key of Object.keys(o)) {
    out.push(`${' '.repeat(pad + 2)}${key}: ${stringify(o[key], pad + 2)},`);
  }
  out.push(`${' '.repeat(pad)}}`);
  return out.join('\n');
}
function buildMetas(kind, all) {
  let out = [];
  for (let key of Object.keys(all)) {
    out.push(buildSingleMeta(kind, all, key));
  }
  return out.join('\n\n');
}

/**
 * Takes an operand and dynamically computes the stack change.
 *
 * If the function returns a number, that number is used as the stack change
 * (and stack parameters are ignored).
 *
 * If the return value is an array:
 *
 * - If the first value is `UNCHANGED`, the stack change is the length of the
 *   return values after `UNCHANGED`.
 * - Otherwise, the stack change is the length of the return values minus
 *   the length of the parameters.
 */

class DebugLogger {
  #logger;
  #options;
  constructor(logger, options) {
    this.#logger = logger;
    this.#options = options;
  }
  #logEntry(entry) {
    switch (entry.type) {
      case 'line':
        {
          this.#logger.debug(...entry.line);
          break;
        }
      case 'group':
        {
          if (entry.collapsed) {
            this.#logger.groupCollapsed(...entry.heading);
          } else {
            this.#logger.group(...entry.heading);
          }
          for (const line of entry.children) {
            this.#logEntry(line);
          }
          this.#logger.groupEnd();
        }
    }
  }
  #lines(type, lines) {
    const [first, ...rest] = lines;
    if (first) {
      this.#logger[type](...first.line);
      for (const entry of rest) {
        this.#logEntry(entry);
      }
    }
  }
  internals(...args) {
    this.#lines('groupCollapsed', frag`🔍 ${intoFragment('internals').styleAll('internals')}`.toLog(this.#options));
    this.#lines('debug', frag`${args}`.toLog(this.#options));
    this.#logger.groupEnd();
  }
  log(...args) {
    const fragment = frag`${args}`;
    if (!fragment.isEmpty(this.#options)) this.#lines('debug', fragment.toLog(this.#options));
  }
  labelled(label, ...args) {
    const fragment = frag`${args}`;
    const styles = ['kw'];
    const {
      focus,
      focusColor
    } = getFlagValues().includes(label) ? {
      focus: ['focus'],
      focusColor: ['focusColor']
    } : {
      focus: [],
      focusColor: []
    };
    this.log(prepend(frag`${as.label(label)} `.styleAll(...styles, ...focus, ...focusColor), fragment.styleAll(...focus)));
  }
  group(...args) {
    return {
      expanded: () => {
        this.#lines('group', frag`${args}`.styleAll('unbold').toLog(this.#options));
        return () => this.#logger.groupEnd();
      },
      collapsed: () => {
        this.#lines('groupCollapsed', frag`${args}`.styleAll('unbold').toLog(this.#options));
        return () => this.#logger.groupEnd();
      }
    };
  }
}

/**
 * Snapshot the current state of the VM for debugging. This function should **never** save off live
 * references to objects managed by the VM, as the state from the `before` debug stage can be used
 * in the `after` debug stage (for example, to perform stack verification).
 */
function snapshotVM(vm) {
  const debug = vm.debug;
  const dom = debug.dom;
  const stack = debug.stack.all();
  return {
    $pc: debug.pc,
    $sp: debug.sp,
    $ra: debug.ra,
    $fp: debug.fp,
    $up: debug.up,
    $s0: vm.s0,
    $s1: vm.s1,
    $t0: vm.t0,
    $t1: vm.t1,
    $v0: vm.v0,
    currentPc: debug.currentPc,
    // these values don't need to be snapshotted since they (by definition) can't change.
    constant: {
      ...debug.constant,
      block: debug.block.metadata
    },
    dom: {
      constructing: dom.constructing,
      inserting: snapshotCursors(dom.inserting),
      blocks: [...dom.blocks]
    },
    frame: {
      scope: debug.scope ? [...debug.scope] : [],
      stack: stack.frame,
      before: stack.before,
      updating: Object.freeze(debug.updating.map(s => [...s])),
      destructors: [...debug.destroyable]
    },
    threw: debug.threw
  };
}
function snapshotCursors(cursors) {
  return cursors.map(cursor => {
    const {
      element,
      nextSibling
    } = cursor;
    if (nextSibling) {
      return new class InsertAt {
        parent = element;
        next = nextSibling;
      }();
    } else {
      return new class AppendTo {
        parent = element;
      }();
    }
  });
}

function WrapCheck(checker) {
  class Wrapped {
    validate(value) {
      return checker().validate(value);
    }
    expected() {
      return checker().expected();
    }
  }
  return new Wrapped();
}
class TypeofChecker {
  constructor(expectedType) {
    this.expectedType = expectedType;
  }
  validate(value) {
    return typeof value === this.expectedType;
  }
  expected() {
    return `typeof ${this.expectedType}`;
  }
}
class NumberChecker extends TypeofChecker {
  constructor() {
    super('number');
  }
  validate(value) {
    return super.validate(value) && Number.isFinite(value);
  }
  expected() {
    return `a finite number`;
  }
}
class PrimitiveChecker {
  validate(value) {
    return typeof value !== 'string' || typeof value === 'number' || typeof value === 'string' || value === undefined || value === null;
  }
  expected() {
    return `a primitive`;
  }
}
class NullChecker {
  validate(value) {
    return value === null;
  }
  expected() {
    return `null`;
  }
}
class SyscallRegisterChecker {
  validate(value) {
    switch (value) {
      case $s0:
      case $s1:
      case $t0:
      case $t1:
      case $v0:
        return true;
      default:
        return false;
    }
  }
  expected() {
    return `a syscall register ($s0, $s1, $t0, $t1, or $v0)`;
  }
}
class InstanceofChecker {
  constructor(Class) {
    this.Class = Class;
  }
  validate(value) {
    return value ? value instanceof this.Class : false;
  }
  expected() {
    return `an instance of ${this.Class.name}`;
  }
}
class MaybeChecker {
  constructor(checker, emptyValue) {
    this.checker = checker;
    this.emptyValue = emptyValue;
  }
  validate(value) {
    if (this.emptyValue.includes(value)) return true;
    return this.checker.validate(value);
  }
  expected() {
    return `${this.checker.expected()} or null`;
  }
}
class OrChecker {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
  validate(value) {
    return this.left.validate(value) || this.right.validate(value);
  }
  expected() {
    return `${this.left.expected()} or ${this.right.expected()}`;
  }
}
class ExactValueChecker {
  constructor(value, desc) {
    this.value = value;
    this.desc = desc;
  }
  validate(obj) {
    return obj === this.value;
  }
  expected() {
    return this.desc;
  }
}
class PropertyChecker {
  constructor(checkers) {
    this.checkers = checkers;
  }
  validate(obj) {
    if (typeof obj !== 'object') return false;
    if (obj === null || obj === undefined) return false;
    return Object.entries(this.checkers).every(([k, checker]) => k in obj ? checker.validate(obj[k]) : false);
  }
  expected() {
    let pairs = Object.entries(this.checkers).map(([k, checker]) => {
      return `${k}: ${checker.expected()}`;
    });
    return `{ ${pairs.join(',')} }`;
  }
}
class ArrayChecker {
  constructor(checker) {
    this.checker = checker;
  }
  validate(obj) {
    if (obj === null || obj === undefined) return false;
    if (!Array.isArray(obj)) return false;
    return obj.every(item => this.checker.validate(item));
  }
  expected() {
    return `Array<${this.checker.expected()}>`;
  }
}
class DictChecker {
  constructor(checker) {
    this.checker = checker;
  }
  validate(value) {
    let isDict = typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === null;
    if (!isDict) return false;
    let {
      checker
    } = this;
    for (let key in value) {
      if (!checker.validate(value[key])) {
        return false;
      }
    }
    return true;
  }
  expected() {
    return `a primitive`;
  }
}
class OpaqueChecker {
  type;
  validate(_obj) {
    return true;
  }
  expected() {
    return `any`;
  }
}
class ObjectChecker {
  validate(obj) {
    return typeof obj === 'function' || typeof obj === 'object' && obj !== null;
  }
  expected() {
    return `an object or function (valid WeakMap key)`;
  }
}
class SafeStringChecker {
  validate(value) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @todo
      typeof value === 'object' && value !== null && typeof value.toHTML === 'function'
    );
  }
  expected() {
    return `SafeString`;
  }
}
function CheckInstanceof(Class) {
  return new InstanceofChecker(Class);
}
function CheckNullable(checker) {
  return new MaybeChecker(checker, [null]);
}
function CheckOptional(checker) {
  return new MaybeChecker(checker, [undefined]);
}
function CheckMaybe(checker) {
  return new MaybeChecker(checker, [null, undefined]);
}
function CheckInterface(obj) {
  return new PropertyChecker(obj);
}
function CheckArray(obj) {
  return new ArrayChecker(obj);
}
function CheckDict(obj) {
  return new DictChecker(obj);
}
const CheckSyscallRegister = new SyscallRegisterChecker();
function defaultMessage(value, expected) {
  const actual = value === null ? `null` : typeof value === 'string' ? value : `some ${typeof value}`;
  return `Got ${actual}, expected:${expected.includes('\n') ? `\n${expected}` : ` ${expected}`}`;
}
function check(value, checker, message) {
  if (!message) {
    if (typeof checker === 'function') {
      message = defaultMessage;
    } else {
      const got = checker.got;
      if (!got) {
        message = defaultMessage;
      } else {
        message = (value, expected) => {
          return defaultMessage(got(value) ?? value, expected);
        };
      }
    }
  }
  if (typeof checker === 'function') {
    checker(value);
    return value;
  }
  if (checker.validate(value)) {
    return value;
  } else {
    throw new Error(message(value, checker.expected()));
  }
}
let size = 0;
function recordStackSize(sp) {
  size = sp;
}
function expectStackChange(stack, expected, name) {
  let actual = stack.sp - size;
  if (actual === expected) return;
  throw new Error(`Expected stack to change by ${expected}, but it changed by ${actual} in ${name}`);
}
const CheckPrimitive = new PrimitiveChecker();
const CheckFunction = new TypeofChecker('function');
const CheckNumber = new NumberChecker();
const CheckBoolean = new TypeofChecker('boolean');
const CheckHandle = CheckNumber;
const CheckString = new TypeofChecker('string');
const CheckNull = new NullChecker();
const CheckUnknown = new OpaqueChecker();
const CheckSafeString = new SafeStringChecker();
const CheckObject = new ObjectChecker();
function CheckOr(left, right) {
  return new OrChecker(left, right);
}
function CheckValue(value, desc = String(value)) {
  return new ExactValueChecker(value, desc);
}
const CheckBlockSymbolTable = CheckInterface({
  parameters: CheckArray(CheckNumber)
});
const CheckProgramSymbolTable = CheckInterface({
  hasDebug: CheckBoolean,
  symbols: CheckArray(CheckString)
});
const CheckElement = CheckInterface({
  nodeType: CheckValue(1),
  tagName: CheckString,
  nextSibling: CheckUnknown
});
const CheckDocumentFragment = CheckInterface({
  nodeType: CheckValue(11),
  nextSibling: CheckUnknown
});
const CheckNode = CheckInterface({
  nodeType: CheckNumber,
  nextSibling: CheckUnknown
});

export { CheckArray, CheckBlockSymbolTable, CheckBoolean, CheckDict, CheckDocumentFragment, CheckElement, CheckFunction, CheckHandle, CheckInstanceof, CheckInterface, CheckMaybe, CheckNode, CheckNull, CheckNullable, CheckNumber, CheckObject, CheckOptional, CheckOr, CheckPrimitive, CheckProgramSymbolTable, CheckSafeString, CheckString, CheckSyscallRegister, CheckUnknown, CheckValue, DebugLogger, DebugOpState, DebugState, DiffState, DisassembledOperand, META_KIND, SerializeBlockContext, WrapCheck, array, as, bounds, buildMetas, buildSingleMeta, changeArray, check, compactArray, cursor, debug, describeDiff, diffStacks, dom, empty, eqBlock, eqCursor, eqStack, eqStackStack, expectStackChange, frag, getOpSnapshot, intoFragment, isUnchecked, join, labelled, logOpcodeSlice, nullableArray, opcodeMetadata, partialBounds, pick, prepend, record, recordStackSize, scopeValue, snapshotVM, stackChange, stackValue, strip, tuple, updatingOpcode, updatingOpcodes, value, wrap };
