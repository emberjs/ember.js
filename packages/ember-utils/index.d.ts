import { Opaque } from '@glimmer/interfaces';

export function symbol(debugName: string): string;
export function assign(original: any, ...args: any[]): any;

export function generateGuid(obj: Opaque, prefix?: string): string;
export function guidFor(obj: Opaque): string;
export function uuid(): number;

export const HAS_NATIVE_SYMBOL: boolean;
export const HAS_NATIVE_PROXY: boolean;

export function isProxy(value: any | null | undefined): boolean;
export function setProxy(value: object): void;

export const WeakSet: WeakSetConstructor;
