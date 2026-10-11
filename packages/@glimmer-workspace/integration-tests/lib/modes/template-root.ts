import type { Cursor, RenderResult, Template } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { RendererRoot, RendererState } from '@ember/-internals/glimmer/lib/base-renderer';
import { unwrapTemplate } from '@glimmer/debug-util';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
} from '@glimmer/destroyable';
import { renderMain } from '@glimmer/runtime';

/**
 * A root for Ember's renderer that renders a loose top-level template with an
 * arbitrary `self` (no wrapper component), the way `ClassicRootState` does for
 * Ember's own top-level templates. Ember has no public API for this, so it lives
 * with the other implementation-level code in `lib/modes/`.
 */
export class TemplateRootState implements RendererRoot {
  readonly type = 'template';

  #result: RenderResult | undefined;

  constructor(
    private state: RendererState,
    private template: Template,
    private self: Reference,
    private cursor: Cursor
  ) {}

  isFor(_possibleRoot: unknown): boolean {
    return false;
  }

  render(): void {
    if (isDestroying(this)) return;

    let result = this.#result;

    if (result === undefined) {
      let { state } = this;
      let iterator = renderMain(
        state.context,
        state.owner,
        this.self,
        state.builder(state.env, this.cursor),
        unwrapTemplate(this.template).asLayout()
      );

      this.#result = associateDestroyableChild(this, iterator.sync());
    } else if (!isDestroying(result)) {
      result.rerender({ alwaysRevalidate: false });
    }
  }

  destroy(): void {
    destroy(this);
  }

  get destroyed(): boolean {
    return isDestroyed(this);
  }

  get result(): RenderResult | undefined {
    return this.#result;
  }
}
