/* eslint-disable no-new-wrappers */

import { typeOf } from '@ember/utils';
import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';

expectTypeOf(typeOf(null)).toEqualTypeOf<
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
  | 'object'
>();

typeOf(undefined); // 'undefined'
typeOf('michael'); // 'string'
typeOf(new String('michael')); // 'string'
typeOf(101); // 'number'
typeOf(new Number(101)); // 'number'
typeOf(true); // 'boolean'
typeOf(new Boolean(true)); // 'boolean'
typeOf(A); // 'function'
typeOf(A()); // 'array'
typeOf([1, 2, 90]); // 'array'
typeOf(/abc/); // 'regexp'
typeOf(new Date()); // 'date'
typeOf((({} as Event).target as HTMLInputElement).files); // 'filelist'
typeOf(EmberObject.extend()); // 'class'
typeOf(EmberObject.create()); // 'instance'
typeOf(new Error('teamocil')); // 'error'
typeOf({ a: 'b' }); // 'object'

// @ts-expect-error it requires an argument
typeOf();
