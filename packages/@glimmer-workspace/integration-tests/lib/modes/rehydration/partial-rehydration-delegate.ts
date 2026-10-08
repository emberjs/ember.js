import type { Dict, SimpleElement } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util';
import { renderComponent } from '@ember/renderer';

import type { RenderHandle } from '../../render-delegate';
import type { TestOwner } from '../owner';

import { RehydrationDelegate } from './delegate';

export class PartialRehydrationDelegate extends RehydrationDelegate {
  registerTemplateOnlyComponent(name: string, layout: string) {
    this.registerComponent('TemplateOnly', 'TemplateOnly', name, layout);
  }

  renderComponentClientSide(name: string, args: Dict, element: SimpleElement): RenderHandle {
    let component = this.componentFor(this.clientOwner, name);

    // Through the renderer's `render` rather than the public `renderComponent`: the latter
    // replaces the previous render into the same element, by rendering before its first node
    // (`nextSibling` set), which rehydration does not support; the chaos tests render into one
    // element once per iteration. It also clears an element target on its first render, which
    // would wipe the server HTML that is to be rehydrated.
    let root = this.clientRenderer.render(component, {
      into: { element, nextSibling: null },
      args,
    });

    this.rehydrationStats = {
      clearedNodes: this.lastClientTree!.clearedNodes,
    };

    return {
      rerender: () => this.clientRenderer.rerender(),
      destroy: () => root.destroy(),
    };
  }

  private componentFor(owner: TestOwner, name: string): object {
    return expect(owner.factoryFor(`component:${name}`), `component ${name} is registered`).class;
  }

  renderComponentServerSide(name: string, args: Dict): string {
    const element = this.serverDoc.createElement('div');
    let component = this.componentFor(this.serverOwner, name);

    renderComponent(component, {
      into: { element, nextSibling: null } as unknown as Element,
      owner: this.serverOwner,
      args,
    });

    this.serverRendered = true;

    return this.serialize(element);
  }
}
