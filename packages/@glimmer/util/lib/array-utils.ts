import { HAS_NATIVE_WEAKMAP } from './weakmap';

export const EMPTY_ARRAY: any[] = (HAS_NATIVE_WEAKMAP ? Object.freeze([]) : []) as any;
