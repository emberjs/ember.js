import type { Cursor, RenderResult as GlimmerRenderResult, Template } from '@glimmer/interfaces';
import type { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import { capabilities, setComponentManager, setComponentTemplate } from '@ember/component';
import { renderComponent } from '@ember/renderer';

import type { DebugBounds } from '../render-delegate';

/**
 * Renders a loose template whose `this` is `context`, through public API only: a definition
 * object with a custom component manager (`createComponent` returns the context, `getContext`
 * returns it) and the template attached with `setComponentTemplate`. The template is therefore
 * a component's layout, not a root template (spec 09 "No `renderTemplate`").
 *
 * Each call uses a fresh definition, since `setComponentTemplate` works once per object.
 */
export function renderLooseTemplate(
  renderer: BaseRenderer,
  owner: object,
  template: Template,
  context: object,
  cursor: Cursor
): { destroy(): void; bounds(): DebugBounds } {
  let definition = {};

  setComponentManager(
    () => ({
      capabilities: capabilities('3.13'),
      createComponent: () => context,
      getContext: (instance: object) => instance,
    }),
    definition
  );
  setComponentTemplate(() => template, definition);

  let before = new Set<unknown>(renderer.state.roots);
  let result = renderComponent(definition, { into: cursor as unknown as Element, owner });
  let root = renderer.state.roots.find((r) => !before.has(r));

  return {
    destroy: () => result.destroy(),
    // The root's output is exactly the template's output; there is no wrapper element.
    bounds: () => {
      let glimmerResult = (root as { result?: GlimmerRenderResult } | undefined)?.result;
      if (glimmerResult === undefined) throw new Error('the template has rendered');
      return glimmerResult;
    },
  };
}
