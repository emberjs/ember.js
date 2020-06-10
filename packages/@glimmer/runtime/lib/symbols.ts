import { symbol } from '@glimmer/util';

// These symbols represent "friend" properties that are used inside of
// the VM in other classes, but are not intended to be a part of
// Glimmer's API.

export const INNER_VM: unique symbol = symbol('INNER_VM');
export const DESTROYABLE_STACK: unique symbol = symbol('DESTROYABLE_STACK');
export const STACKS: unique symbol = symbol('STACKS');
export const REGISTERS: unique symbol = symbol('REGISTERS');
export const HEAP: unique symbol = symbol('HEAP');
export const CONSTANTS: unique symbol = symbol('CONSTANTS');
export const ARGS: unique symbol = symbol('ARGS');
export const PC: unique symbol = symbol('PC');
