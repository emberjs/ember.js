import type EmberArray from '@ember/array';
import { A, type NativeArray } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';
import type MutableArray from '@ember/array/mutable';

import { expectTypeOf } from 'expect-type';

class Foo {}

let foo = new Foo();

let content = A([foo]);

// We can't infer the correct type through `create`;
let proxy = ArrayProxy.create({ content }) as ArrayProxy<Foo, NativeArray<Foo>>;

expectTypeOf(proxy).toMatchTypeOf<EmberArray<Foo>>();
expectTypeOf(proxy).toMatchTypeOf<MutableArray<Foo>>();

expectTypeOf(proxy.content).toEqualTypeOf<NativeArray<Foo> | null>();
expectTypeOf(proxy.arrangedContent).toEqualTypeOf<NativeArray<Foo> | null>();
