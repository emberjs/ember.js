import { template, type EmberPrecompileOptions } from '@ember/template-compiler';
import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { expectTypeOf } from 'expect-type';

const hello = 'hello';

expectTypeOf(template('hello world')).toEqualTypeOf<TemplateOnlyComponent>();
expectTypeOf(template('hello world', { scope: () => ({}) })).toEqualTypeOf<TemplateOnlyComponent>();
expectTypeOf(
  template('{{hello}} world', { scope: () => ({ hello }) })
).toEqualTypeOf<TemplateOnlyComponent>();
