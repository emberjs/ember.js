import { TemplateOptions } from '@glimmer/opcode-compiler';
import { OwnedTemplateMeta } from 'ember-views';
import RuntimeResolver from './resolver';
import { CREATE } from 'container';

// factory for DI
export default {
  [CREATE](): TemplateOptions<OwnedTemplateMeta> {
    return new RuntimeResolver().templateOptions;
  }
};
