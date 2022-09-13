import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const {
  ViewUtils: { isSimpleClick },
} = Ember;
expectTypeOf(isSimpleClick(new Event('wat'))).toBeBoolean();
