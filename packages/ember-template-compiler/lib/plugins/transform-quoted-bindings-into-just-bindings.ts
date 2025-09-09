import { INTERNAL_PLUGINS } from '@ember/template-compiler/-internal-primitives';
import type { ASTPluginBuilder } from '@glimmer/syntax';

export default INTERNAL_PLUGINS.TransformQuotedBindingsIntoJustBindings as ASTPluginBuilder;
