import type { Dict, RenderResult, SimpleElement } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util';
import { renderComponent, renderSync } from '@glimmer/runtime';

import type { TestOwner } from '../owner';
import type { DebugRehydrateTree } from './builder';

import { RehydrationDelegate } from './delegate';

export class PartialRehydrationDelegate extends RehydrationDelegate {
  registerTemplateOnlyComponent(name: string, layout: string) {
    this.registerComponent('TemplateOnly', 'TemplateOnly', name, layout);
  }

  renderComponentClientSide(name: string, args: Dict, element: SimpleElement): RenderResult {
    let cursor = { element, nextSibling: null };
    let context = this.clientContext;
    let tree = this.getElementBuilder(context.env, cursor) as DebugRehydrateTree;
    let component = this.componentFor(this.clientOwner, name);

    let iterator = renderComponent(context, tree, this.clientOwner, component, args);

    const result = renderSync(context.env, iterator);

    this.rehydrationStats = {
      clearedNodes: tree.clearedNodes,
    };

    return result;
  }

  private componentFor(owner: TestOwner, name: string): object {
    return expect(owner.factoryFor(`component:${name}`), `component ${name} is registered`).class;
  }

  renderComponentServerSide(name: string, args: Dict): string {
    const element = this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    let context = this.serverContext;
    let builder = this.getElementBuilder(context.env, cursor);

    let component = this.componentFor(this.serverOwner, name);

    let iterator = renderComponent(context, builder, this.serverOwner, component, args);

    renderSync(context.env, iterator);
    this.serverRendered = true;

    return this.serialize(element);
  }
}
