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

console.log(buildMetas('MACHINE_METADATA', parsed.machine));
