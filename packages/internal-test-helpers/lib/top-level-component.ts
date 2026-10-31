import { get, set } from '@ember/object';
import GlimmerComponent from '@glimmer/component';
import { dirtyTagFor } from '@glimmer/validator';

/**
  The `this` of the templates that `render()` receives in a rendering test.

  It keeps the `get`, `set` and `rerender` methods so that a test can change
  the context in one line.
*/
export default class TopLevelComponent extends GlimmerComponent {
  get(path: string): unknown {
    return get(this, path);
  }

  set(path: string, value: unknown): unknown {
    return set(this, path, value);
  }

  /**
    Starts an update pass of the renderer.
    Nothing in the templates reads this tag.
  */
  rerender(): void {
    dirtyTagFor(this, 'rerender');
  }
}
