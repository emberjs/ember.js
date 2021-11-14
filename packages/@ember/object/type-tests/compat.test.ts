import { dependentKeyCompat } from '@ember/object/compat';
import { expectTypeOf } from 'expect-type';

expectTypeOf(dependentKeyCompat).toMatchTypeOf<PropertyDecorator>();
