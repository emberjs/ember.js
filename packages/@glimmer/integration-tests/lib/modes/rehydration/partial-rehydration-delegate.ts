import { Dict, RenderResult } from '@glimmer/interfaces';
import { renderComponent, renderSync } from '@glimmer/runtime';
import { RehydrationDelegate } from './delegate';
import { SimpleElement } from '@simple-dom/interface';
import { DebugRehydrationBuilder } from './builder';

export class PartialRehydrationDelegate extends RehydrationDelegate {
  registerTemplateOnlyComponent(name: string, layout: string) {
    this.registerComponent('TemplateOnly', 'TemplateOnly', name, layout);
  }

  renderComponentClientSide(
    name: string,
    args: Dict<unknown>,
    element: SimpleElement
  ): RenderResult {
    let cursor = { element, nextSibling: null };
    let { program, runtime } = this.clientEnv;
    let builder = this.getElementBuilder(runtime.env, cursor) as DebugRehydrationBuilder;
    let component = this.clientRegistry.lookupComponent(name)!;

    let iterator = renderComponent(runtime, builder, program, {}, component.state, args);

    const result = renderSync(runtime.env, iterator);

    this.rehydrationStats = {
      clearedNodes: builder.clearedNodes,
    };

    return result;
  }

  renderComponentServerSide(name: string, args: Dict<unknown>): string {
    const element = this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    let { program, runtime } = this.serverEnv;
    let builder = this.getElementBuilder(runtime.env, cursor);

    let component = this.serverRegistry.lookupComponent(name)!;

    let iterator = renderComponent(runtime, builder, program, {}, component.state, args);

    renderSync(runtime.env, iterator);

    return this.serialize(element);
  }
}
