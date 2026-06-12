// Evaluating these modules registers the VM's opcode handlers with
// APPEND_OPCODES. The marker exports (rather than bare side-effect imports)
// ensure bundlers consider each module used and keep it, even when this
// package is marked side-effect-free (`sideEffects: false`).
import { expressionsOpcodesRegistered } from './compiled/opcodes/expressions';
import { componentOpcodesRegistered } from './compiled/opcodes/component';
import { contentOpcodesRegistered } from './compiled/opcodes/content';
import { debuggerOpcodesRegistered } from './compiled/opcodes/debugger';
import { domOpcodesRegistered } from './compiled/opcodes/dom';
import { vmOpcodesRegistered } from './compiled/opcodes/vm';
import { listsOpcodesRegistered } from './compiled/opcodes/lists';

export const opcodesBootstrapped =
  expressionsOpcodesRegistered &&
  componentOpcodesRegistered &&
  contentOpcodesRegistered &&
  debuggerOpcodesRegistered &&
  domOpcodesRegistered &&
  vmOpcodesRegistered &&
  listsOpcodesRegistered;
