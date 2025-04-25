// These symbols represent "friend" properties that are used inside of
// the VM in other classes, but are not intended to be a part of
// Glimmer's API.

export const INNER_VM: unique symbol = Symbol('INNER_VM');
export const DESTROYABLE_STACK: unique symbol = Symbol('DESTROYABLE_STACK');
export const STACKS: unique symbol = Symbol('STACKS');
export const REGISTERS: unique symbol = Symbol('REGISTERS');
export const HEAP: unique symbol = Symbol('HEAP');
export const CONSTANTS: unique symbol = Symbol('CONSTANTS');
export const ARGS: unique symbol = Symbol('ARGS');
export const PC: unique symbol = Symbol('PC');
