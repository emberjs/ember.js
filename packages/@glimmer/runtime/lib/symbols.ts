// These symbols represent "friend" properties that are used inside of
// the VM in other classes, but are not intended to be a part of
// Glimmer's API.

export const INNER_VM = Symbol('INNER');
export const DESTRUCTOR_STACK = Symbol('DESTRUCTOR_STACK');
export const HEAP = Symbol('HEAP');
export const CONSTANTS = Symbol('CONSTANTS');
export const ARGS = Symbol('ARGS');
export const PC = Symbol('PC');
