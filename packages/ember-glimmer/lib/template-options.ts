import { TemplateOptions } from '@glimmer/opcode-compiler';
import { OwnedTemplateMeta } from 'ember-views';
import RuntimeResolver from './resolver';

// factory for DI
export default {
  create(): TemplateOptions<OwnedTemplateMeta> {
    return new RuntimeResolver().templateOptions;
  }
};
