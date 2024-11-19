import type { Dict, RenderResult, SimpleElement } from '@glimmer/interfaces';
import { renderComponent, renderSync } from '@glimmer/runtime';

import type { DebugRehydrateTree } from './builder';

import { RehydrationDelegate } from './delegate';

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
    let context = this.clientContext;
    let tree = this.getElementBuilder(context.env, cursor) as DebugRehydrateTree;
    let component = this.clientRegistry.lookupComponent(name)!;

    let iterator = renderComponent(context, tree, {}, component.state, args);

    const result = renderSync(context.env, iterator);

    this.rehydrationStats = {
      clearedNodes: tree.clearedNodes,
    };

    return result;
  }

  renderComponentServerSide(name: string, args: Dict<unknown>): string {
    const element = this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    let context = this.serverContext;
    let builder = this.getElementBuilder(context.env, cursor);

    let component = this.serverRegistry.lookupComponent(name)!;

    let iterator = renderComponent(context, builder, {}, component.state, args);

    renderSync(context.env, iterator);

    return this.serialize(element);
  }
}
