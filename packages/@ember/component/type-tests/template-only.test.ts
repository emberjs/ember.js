import templateOnlyComponent from '@ember/component/template-only';
import { TemplateOnlyComponentDefinition } from '@glimmer/runtime/dist/types/lib/component/template-only';
import { expectTypeOf } from 'expect-type';

expectTypeOf(templateOnlyComponent()).toEqualTypeOf<TemplateOnlyComponentDefinition>();

templateOnlyComponent('myModule');
templateOnlyComponent('myModule', 'myName');

// @ts-expect-error invalid params
templateOnlyComponent(1);
