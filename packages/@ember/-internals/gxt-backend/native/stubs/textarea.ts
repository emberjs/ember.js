// gxt NATIVE layer — alias target for
// `@ember/-internals/glimmer/lib/components/textarea`. `<Textarea>` /
// `{{textarea}}` are a documented drop in the native build.
import { documentedDrop } from '../not-implemented';

export default class Textarea {
  static toString(): string {
    return 'Textarea';
  }
  constructor() {
    documentedDrop('`<Textarea>`', 'Use a plain <textarea> with {{on "input"}} instead.');
  }
}
