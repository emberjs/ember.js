import { setComponentTemplate } from '@ember/component';
import type { TemplateFactory } from 'htmlbars-inline-precompile';
import { expectTypeOf } from 'expect-type';

// Good enough for testing
let factory = {} as TemplateFactory;

expectTypeOf(setComponentTemplate(factory, {})).toEqualTypeOf<object>();
