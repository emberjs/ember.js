import Component from '@ember/component';
import { CoreView } from '@ember/-internals/views';
import { expectTypeOf } from 'expect-type';
import { Owner } from '@ember/-internals/owner';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
let component = new Component(owner);

expectTypeOf(component).toMatchTypeOf<CoreView>();
