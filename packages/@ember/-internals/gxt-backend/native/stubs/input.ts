// gxt NATIVE layer — alias target for
// `@ember/-internals/glimmer/lib/components/input`. `<Input>` / `{{input}}` are
// a documented drop in the native build. Registered as `component:input` so a
// resolver lookup fails with this message instead of "component not found".
import { documentedDrop } from '../not-implemented';

export default class Input {
  static toString(): string {
    return 'Input';
  }
  constructor() {
    documentedDrop('`<Input>`', 'Use a plain <input> with {{on "input"}} instead.');
  }
}
