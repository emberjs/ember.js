import CoreObject from '@ember/object/core';

export type TypeName =
  | 'undefined'
  | 'null'
  | 'string'
  | 'number'
  | 'boolean'
  | 'function'
  | 'array'
  | 'regexp'
  | 'date'
  | 'filelist'
  | 'class'
  | 'instance'
  | 'error'
  | 'object';

// ........................................
// TYPING & ARRAY MESSAGING
//
const TYPE_MAP: Record<string, TypeName> = {
  '[object Boolean]': 'boolean',
  '[object Number]': 'number',
  '[object String]': 'string',
  '[object Function]': 'function',
  '[object AsyncFunction]': 'function',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Object]': 'object',
  '[object FileList]': 'filelist',
} as const;

const { toString } = Object.prototype;

export default function typeOf(item: unknown): TypeName {
  if (item === null) {
    return 'null';
  }
  if (item === undefined) {
    return 'undefined';
  }
  let ret = TYPE_MAP[toString.call(item)] || 'object';

  if (ret === 'function') {
    if (CoreObject.detect(item)) {
      ret = 'class';
    }
  } else if (ret === 'object') {
    if (item instanceof Error) {
      ret = 'error';
    } else if (item instanceof CoreObject) {
      ret = 'instance';
    } else if (item instanceof Date) {
      ret = 'date';
    }
  }

  return ret;
}
