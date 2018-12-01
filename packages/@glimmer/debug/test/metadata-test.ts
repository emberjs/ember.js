import {
  OpcodeMetadataParser,
  ParsedReference,
  Stack,
  PREFIX,
  ParsedOp,
  OperandType,
  Register,
  ParsedRegister,
} from '@glimmer/debug';

QUnit.module('[debug] Opcode Metadata Parser');

QUnit.test('parse simple PushFrame', assert => {
  assertOp(
    assert,
    strip`
  Operation: Push a stack frame

  Format:
    (PushFrame)
  Operand Stack:
    ... →
    ..., $ra, $fp
`,
    op('PushFrame'),
    'Push a stack frame',
    {
      before: [PREFIX],
      after: [PREFIX, register('$ra'), register('$fp')],
    }
  );
});

QUnit.test('parse simple opcode with one simple parameter', assert => {
  assertOp(
    assert,
    strip`
      Operation:
        Jump to the specified offset if the value at
        the top of the stack is true.

      Format:
        (JumpIf to:u32)
      Operand Stack:
        ..., VersionedPathReference →
        ...
    `,
    op('JumpIf', ['to', 'u32']),
    'Jump to the specified offset if the value at the top of the stack is true.',
    {
      before: [PREFIX, reference('VersionedPathReference')],
      after: [PREFIX],
    }
  );
});

QUnit.test('parse simple opcode with two simple parameters', assert => {
  assertOp(
    assert,
    strip`
     Operation: Duplicate and push item from an offset in the stack.
     Format:
       (Dup register:register offset:u32)
     Operand Stack:
       ..., Opaque →
       ..., Opaque, Opaque
    `,
    op('Dup', ['register', 'register'], ['offset', 'u32']),
    'Duplicate and push item from an offset in the stack.',
    {
      before: [PREFIX, reference('Opaque')],
      after: [PREFIX, reference('Opaque'), reference('Opaque')],
    }
  );
});

export function assertOp(
  assert: typeof QUnit.assert,
  syntax: string,
  op: ParsedOp,
  desc: string,
  stack: Stack
) {
  let actual = new OpcodeMetadataParser(syntax).parse();

  assert.deepEqual(actual.opcode, op, 'opcode signature');
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
