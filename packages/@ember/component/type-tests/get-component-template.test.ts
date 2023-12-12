import { getComponentTemplate } from '@ember/component';
import type { TemplateFactory } from '@glimmer/interfaces';
import { expectTypeOf } from 'expect-type';

expectTypeOf(getComponentTemplate({})).toEqualTypeOf<TemplateFactory | undefined>();

// @ts-expect-error requires param
getComponentTemplate();
