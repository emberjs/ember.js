import { CompilableProgram, ComponentDefinition, WithStaticLayout } from '@glimmer/interfaces';
import { expect, unwrapTemplate } from '@glimmer/util';

export function getCompilable(definition: ComponentDefinition) {
  let { manager, state } = definition;

  let capabilities = manager.getCapabilities(state);
  let compilable: CompilableProgram | null = null;

  if (!capabilities.dynamicLayout) {
    let template = unwrapTemplate((manager as WithStaticLayout).getStaticLayout(state));
    compilable = capabilities.wrapped ? template.asWrappedLayout() : template.asLayout();
  }

  return expect(compilable, 'attempted to render a top level component without a static template');
}
