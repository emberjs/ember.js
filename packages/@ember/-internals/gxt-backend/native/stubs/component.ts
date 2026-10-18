// gxt NATIVE layer — alias target for `@ember/-internals/glimmer/lib/component`
// (the classic `@ember/component` Component class). Documented legacy drop
// (curly lifecycle, classNames/attributeBindings, tagName, two-way bindings,
// this.attrs). Throws on USE, never at import, so modules that merely re-export
// it (the native `@ember/component` barrel) load.
import { documentedDrop } from '../not-implemented';

const INSTEAD = 'Use @glimmer/component (or a template-only component) instead.';

export default class Component {
  static extend(): never {
    documentedDrop('Classic `@ember/component` Component', INSTEAD);
  }
  static create(): never {
    documentedDrop('Classic `@ember/component` Component', INSTEAD);
  }
  constructor() {
    documentedDrop('Classic `@ember/component` Component', INSTEAD);
  }
}
