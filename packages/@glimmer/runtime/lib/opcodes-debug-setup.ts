import type { DebugOp, SomeDisassembledOperand } from '@glimmer/debug/lib/debug';
import { DebugLogger } from '@glimmer/debug/lib/render/logger';
import { debugOp, describeOp, describeOpcode } from '@glimmer/debug/lib/debug';
import { frag } from '@glimmer/debug/lib/render/fragment';
import { opcodeMetadata } from '@glimmer/debug/lib/opcode-metadata';
import { recordStackSize } from '@glimmer/debug/lib/stack-check';
import { VmSnapshot } from '@glimmer/debug/lib/vm/snapshot';
import type { DebugVmSnapshot, Dict, Maybe, RuntimeOp } from '@glimmer/interfaces';
import { unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';
import { $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0 } from '@glimmer/vm/lib/registers';

import type { AppendOpcodes, DebugState } from './opcodes';
import { registerDebugOpcodeSetup } from './opcodes';

registerDebugOpcodeSetup((opcodes: AppendOpcodes): void => {
  opcodes.debugBefore = (debug: DebugVmSnapshot, opcode: RuntimeOp): DebugState => {
    let opcodeSnapshot = {
      type: opcode.type,
      size: opcode.size,
      isMachine: opcode.isMachine,
    } as const;

    let snapshot = new VmSnapshot(opcodeSnapshot, debug);
    let params: Maybe<Dict<SomeDisassembledOperand>> = undefined;
    let op: DebugOp | undefined = undefined;
    let closeGroup: (() => void) | undefined;

    if (LOCAL_TRACE_LOGGING) {
      const logger = DebugLogger.configured();

      let pos = debug.registers[$pc] - opcode.size;

      op = debugOp(debug.context.program, opcode, debug.template);

      closeGroup = logger
        .group(frag`${pos}. ${describeOp(opcode, debug.context.program, debug.template)}`)
        .expanded();

      let debugParams = [];
      for (let [name, param] of Object.entries(op.params)) {
        const value = param.value;
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
          debugParams.push(name, '=', value);
        }
      }
      LOCAL_LOGGER.debug(...debugParams);
    }

    recordStackSize(debug.registers[$sp]);
    return {
      op,
      closeGroup,
      params,
      opcode: opcodeSnapshot,
      debug,
      snapshot,
    };
  };

  opcodes.debugAfter = (postSnapshot: DebugVmSnapshot, pre: DebugState) => {
    let post = new VmSnapshot(pre.opcode, postSnapshot);
    let diff = pre.snapshot.diff(post);
    let {
      opcode: { type },
    } = pre;

    let sp = diff.registers[$sp];

    let meta = opcodeMetadata(type);
    let actualChange = sp.after - sp.before;
    if (
      meta &&
      meta.check !== false &&
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      typeof meta.stackChange! === 'number' &&
      meta.stackChange !== actualChange
    ) {
      throw new Error(
        `Error in ${pre.op?.name}:\n\n${pre.debug.registers[$pc]}. ${
          pre.op ? describeOpcode(pre.op.name, pre.params) : unwrap(opcodeMetadata(type)).name
        }\n\nStack changed by ${actualChange}, expected ${meta.stackChange}`
      );
    }

    if (LOCAL_TRACE_LOGGING) {
      const logger = DebugLogger.configured();

      logger.log(diff.registers[$pc].describe());
      logger.log(diff.registers[$ra].describe());
      logger.log(diff.registers[$s0].describe());
      logger.log(diff.registers[$s1].describe());
      logger.log(diff.registers[$t0].describe());
      logger.log(diff.registers[$t1].describe());
      logger.log(diff.registers[$v0].describe());
      logger.log(diff.stack.describe());
      logger.log(diff.destructors.describe());
      logger.log(diff.scope.describe());

      if (diff.constructing.didChange || diff.blocks.change) {
        const done = logger.group(`tree construction`).expanded();
        try {
          logger.log(diff.constructing.describe());
          logger.log(diff.blocks.describe());
          logger.log(diff.cursors.describe());
        } finally {
          done();
        }
      }

      pre.closeGroup?.();
    }
  };
});
