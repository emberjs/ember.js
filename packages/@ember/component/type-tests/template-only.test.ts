import templateOnlyComponent, { type TemplateOnlyComponent } from '@ember/component/template-only';
import { expectTypeOf } from 'expect-type';

expectTypeOf(templateOnlyComponent()).toEqualTypeOf<TemplateOnlyComponent<unknown>>();

templateOnlyComponent('myModule');
templateOnlyComponent('myModule', 'myName');

// @ts-expect-error invalid params
templateOnlyComponent(1);
