import type { Dict, SimpleElement } from '@glimmer/interfaces';
import { renderComponent } from '@ember/renderer';

import type { RenderHandle } from '../../render-delegate';

import { RehydrationDelegate } from './delegate';

export class PartialRehydrationDelegate extends RehydrationDelegate {
  registerTemplateOnlyComponent(name: string, layout: string) {
    this.registerComponent('TemplateOnly', 'TemplateOnly', name, layout);
  }

  renderComponentClientSide(name: string, args: Dict, element: SimpleElement): RenderHandle {
    let component = this.clientRegistry.lookupComponent(name)!;

    // Through the renderer's `render` rather than the public `renderComponent`: the latter
    // replaces the previous render into the same element, by rendering before its first node
    // (`nextSibling` set), which rehydration does not support; the chaos tests render into one
    // element once per iteration. It also clears an element target on its first render, which
    // would wipe the server HTML that is to be rehydrated.
    let root = this.clientRenderer.render(component.state, {
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

  renderComponentServerSide(name: string, args: Dict): string {
    const element = this.serverDoc.createElement('div');
    let component = this.serverRegistry.lookupComponent(name)!;

    renderComponent(component.state, {
      into: { element, nextSibling: null } as unknown as Element,
      owner: this.serverOwner,
      args,
    });

    return this.serialize(element);
  }
}
