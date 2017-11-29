import { Opaque } from '@glimmer/interfaces';

export const NAME_KEY: string;
export function getOwner(obj: any): any;
export function symbol(debugName: string): string;
export function assign(original: any, ...args: any[]): any;
export const OWNER: string;

export function generateGuid(obj: Opaque, prefix?: string): string;
export function guidFor(obj: Opaque): string;
export function uuid(): number;
