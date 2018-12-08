// @ts-check

const { normalizeAll, buildEnum, buildMetas } = require('../dist/@glimmer/debug');
const fs = require('fs');
const toml = require('toml');

function parse(file) {
  let opcodes = fs.readFileSync(file, { encoding: 'utf8' });
  let raw = toml.parse(opcodes);
  return normalizeAll(raw);
}

let parsed = parse('./packages/@glimmer/vm/lib/opcodes.toml');

// console.log(buildEnum('MachineOp', parsed.machine));
// console.log('');
// console.log(buildEnum('Op', parsed.syscall));

console.log(`
import { Op, MachineOp } from './opcodes';
import { Option } from '@glimmer/interfaces';
import { fillNulls } from '@glimmer/util';
import { NormalizedMetadata } from '@glimmer/debug';

export function opcodeMetadata(op: MachineOp | Op, isMachine: 0 | 1): Option<NormalizedMetadata> {
  let value = isMachine ? MACHINE_METADATA[op] : METADATA[op];

  return value || null;
}

const METADATA: Option<NormalizedMetadata>[] = fillNulls(Op.Size);
const MACHINE_METADATA: Option<NormalizedMetadata>[] = fillNulls(MachineOp.Size);
`);

console.log(buildMetas('MACHINE_METADATA', parsed.machine));
console.log(buildMetas('METADATA', parsed.syscall));
