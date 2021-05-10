import Backburner, { DeferredActionQueues, Timer } from 'backburner.js';

export const _backburner: Backburner;

export const run: Backburner['run'];
export const schedule: Backburner['schedule'];
export const later: Backburner['later'];
export const join: Backburner['join'];
export const cancel: Backburner['cancel'];
export const scheduleOnce: Backburner['scheduleOnce'];

export function _getCurrentRunLoop(): DeferredActionQueues;

export function once(method: Function): Timer;
export function once<T, U extends keyof T>(target: T, method: U, ...args: any[]): Timer;
export function once(target: unknown, method: unknown | Function, ...args: any[]): Timer;

export function bind<T extends Function>(target: T): T;
export function bind<T extends Function, U extends any[]>(
  target: unknown,
  method?: T,
  ...args: U
): T;
export function bind<T extends any[]>(target: unknown, method?: string, ...args: T): Function;
export function bind<T>(target: unknown, method?: T, ...args: unknown[]): T;
