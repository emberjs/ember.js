import {
  OpcodeMetadata,
  OpcodeMetadataParser,
  OperandType,
  ParsedFile,
  ParsedMnemonic,
  ParsedOp,
  ParsedReference,
  ParsedRegister,
  PREFIX,
  Register,
  Stack,
  WholeOpcodeMetadataParser,
  isParsedOp,
  parseOperandType,
} from '@glimmer/debug';

QUnit.module('[debug] Opcode Metadata Parser');

QUnit.test('parse simple PushFrame', assert => {
  assertOp(
    assert,
    strip`
    # *pushf

    Format: (*PushFrame)
    Operation: Push a stack frame
    Operand Stack:
      ... →
      ..., $ra, $fp
    `,
    short('pushf', true),
    op('PushFrame'),
    'Push a stack frame',
    [[PREFIX], [PREFIX, register('$ra'), register('$fp')]]
  );
});

QUnit.test('parse simple opcode with one simple parameter', assert => {
  assertOp(
    assert,
    strip`
    # iftrue

    Format: (JumpIf to:u32)
    Operation:
      Jump to the specified offset if the value at
      the top of the stack is true.
    Operand Stack:
      ..., VersionedPathReference →
      ...
    `,
    short('iftrue'),
    op('JumpIf', ['to', 'u32']),
    'Jump to the specified offset if the value at the top of the stack is true.',
    [[PREFIX, reference('VersionedPathReference')], [PREFIX]]
  );
});

QUnit.test('parse simple opcode with two simple parameters', assert => {
  assertOp(
    assert,
    strip`
    # dup

    Format: (Dup register:register, offset:u32)
    Operation: Duplicate and push item from an offset in the stack.
    Operand Stack:
      ..., Opaque →
      ..., Opaque, Opaque
    `,
    short('dup'),
    op('Dup', ['register', 'register'], ['offset', 'u32']),
    'Duplicate and push item from an offset in the stack.',
    [[PREFIX, reference('Opaque')], [PREFIX, reference('Opaque'), reference('Opaque')]]
  );
});

QUnit.test('Whole opcode parser', assert => {
  let file = strip`
    # *pushf

    Format: (*PushFrame)
    Operation: Push a stack frame
    Operand Stack:
      ... →
      ..., $ra, $fp

    # iftrue

    Format: (JumpIf to:u32)
    Operation:
      Jump to the specified offset if the value at
      the top of the stack is true.
    Operand Stack:
      ..., VersionedPathReference →
      ...

    # dup

    Format: (Dup register:register, offset:u32)
    Operation: Duplicate and push item from an offset in the stack.
    Operand Stack:
      ..., Opaque →
      ..., Opaque, Opaque
  `;

  let out = new WholeOpcodeMetadataParser(file).parse();

  assertFile(assert, out, {
    machine: {
      pushf: opcode('*pushf', 'PushFrame', 'Push a stack frame', [
        [PREFIX],
        [PREFIX, register('$ra'), register('$fp')],
      ]),
    },
    syscall: {
      iftrue: opcode(
        'iftrue',
        ['JumpIf', 'to:u32'],
        'Jump to the specified offset if the value at the top of the stack is true.',
        [[PREFIX, reference('VersionedPathReference')], [PREFIX]]
      ),
      dup: opcode(
        'dup',
        ['Dup', 'register:register', 'offset:u32'],
        'Duplicate and push item from an offset in the stack.',
        [[PREFIX, reference('Opaque')], [PREFIX, reference('Opaque'), reference('Opaque')]]
      ),
    },
  });
});

export type ToParsedMnemonic = ParsedMnemonic | string;

function toParsedMnemonic(input: ToParsedMnemonic): ParsedMnemonic {
  if (typeof input === 'string') {
    if (input.charAt(0) === '*') {
      return {
        shorthand: input.slice(1),
        machine: true,
      };
    } else {
      return { shorthand: input, machine: false };
    }
  } else {
    return input;
  }
}

export type ToParsedOp = ParsedOp | string | [string, ...string[]];

function toParsedOp(toOp: ToParsedOp): ParsedOp {
  if (isParsedOp(toOp)) {
    return toOp;
  } else if (typeof toOp === 'string') {
    return op(toOp);
  } else {
    let [name, ...raw] = toOp;
    let operands = raw.map(o => {
      let [name, type] = o.split(':');
      return [name, parseOperandType(type)] as [string, OperandType];
    });
    return op(name, ...operands);
  }
}

export function opcode(short: ToParsedMnemonic, op: ToParsedOp, desc: string, stack: Stack) {
  return new OpcodeMetadata(desc, toParsedMnemonic(short), toParsedOp(op), stack);
}

export function assertFile(assert: typeof QUnit.assert, actual: ParsedFile, expected: ParsedFile) {
  assert.deepEqual(data(actual), data(expected));
}

export function assertOp(
  assert: typeof QUnit.assert,
  syntax: string,
  short: ParsedMnemonic,
  op: ParsedOp,
  desc: string,
  stack: Stack
) {
  let actual = new OpcodeMetadataParser(syntax).parse();

  assert.deepEqual(actual.opcode, op, 'opcode signature');
  assert.deepEqual(actual.mnemonic, short, 'opcode mnemonic');
  assert.equal(actual.desc, desc, 'opcode description');
  assert.deepEqual(actual.stack, stack, 'stack changes');
}

export function assertStack(assert: typeof QUnit.assert, actual: Stack, expected: Stack) {
  assert.deepEqual(actual, expected);
}

export function strip(strings: TemplateStringsArray, ...args: string[]) {
  let result = strings
    .map((str: string, i: number) => {
      return `${str
        .split('\n')
        .map(s => s.trim())
        .join('\n')}${args[i] ? args[i] : ''}`;
    })
    .join('');

  return result.slice(1, -1);
}

export function short(name: string, machine = false): ParsedMnemonic {
  return { shorthand: name, machine };
}

export function op(op: string, ...operands: Array<[string, OperandType]>): ParsedOp {
  return {
    op,
    operands: operands.map(([name, type]) => ({ name, type })),
  };
}

export function reference(type: string): ParsedReference {
  return {
    name: 'reference',
    type,
  };
}

export function register(type: Register): ParsedRegister {
  return {
    name: 'register',
    type,
  };
}

function data(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v));
}
