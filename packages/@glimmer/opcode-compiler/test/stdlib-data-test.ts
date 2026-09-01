import type { StdlibRoutine, StdlibSource } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import {
  type RecordedProgram,
  RecordingConstants,
  recordProgram,
  syscallsIn,
} from '@glimmer/opcode-compiler/lib/aot/record';
import * as data from '@glimmer/opcode-compiler/lib/opcode-builder/stdlib-data';
import * as source from '@glimmer/opcode-compiler/lib/opcode-builder/helpers/stdlib';

QUnit.module('@glimmer/opcode-compiler - stdlib data');

const ROUTINES: Array<[StdlibRoutine, StdlibSource]> = [
  [data.MAIN, source.MAIN],
  [data.TRUSTING_NON_DYNAMIC_APPEND, source.TRUSTING_NON_DYNAMIC_APPEND],
  [data.CAUTIOUS_NON_DYNAMIC_APPEND, source.CAUTIOUS_NON_DYNAMIC_APPEND],
  [data.TRUSTING_APPEND, source.TRUSTING_APPEND],
  [data.CAUTIOUS_APPEND, source.CAUTIOUS_APPEND],
];

for (const [routine, builder] of ROUTINES) {
  QUnit.test(`${routine.name} matches a fresh build`, (assert) => {
    let constants = new RecordingConstants();
    let programs: RecordedProgram[] = [];
    let index = recordProgram((op) => builder.build(op), 0, {
      meta: source.STDLIB_META,
      constants,
      programs,
    });
    let program = expect(programs[index], 'the routine was recorded');

    assert.deepEqual(
      [...routine.words],
      program.words,
      'the committed words match; run bin/build-aot-stdlib.mjs after changing a routine or an opcode'
    );
    assert.deepEqual(
      routine.fixups.map(([at, target]) => [at, target().name]),
      program.stdlibRefs,
      'the committed fixups match'
    );
    assert.deepEqual(
      routine.handlers.map((handler) => handler.type),
      syscallsIn(program.words),
      'the committed handlers match'
    );
    assert.strictEqual(constants.entries.length, 0, 'stdlib routines use no constants');
  });
}
