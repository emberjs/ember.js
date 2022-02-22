import Component from '@ember/component';
import { CoreView } from '@ember/-internals/views';
import { expectTypeOf } from 'expect-type';
import { View } from '@ember/-internals/glimmer/lib/renderer';

const MyComponent = Component.extend();

let component = MyComponent.create();

expectTypeOf(component).toMatchTypeOf<CoreView>();
expectTypeOf(component).toMatchTypeOf<View>();

expectTypeOf(component.tagName).toEqualTypeOf<string | null>();
expectTypeOf(component.classNames).toEqualTypeOf<string[]>();
expectTypeOf(component.classNameBindings).toEqualTypeOf<string[]>();
expectTypeOf(component.attributeBindings).toEqualTypeOf<string[] | undefined>();
