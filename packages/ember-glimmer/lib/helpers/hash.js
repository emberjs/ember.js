/**
@module ember
@submodule ember-glimmer
*/
import { set } from 'ember-metal';
import { PrimitiveReference } from '../utils/references';

class HashReference extends PrimitiveReference {

  constructor(args) {
    super();

    this.tag = args.tag;
    this.args = args;

    this.hash = null;
  }

  value() {
    let { args, hash } = this;
    let { keys, values } = args;

    if (!hash) {
      this.hash = hash = args.value();

      let lastRevisions = this._lastRevisions = new Array(keys.length);
      for (let i = 0; i < keys.length; i++) {
        let ref = values[i];
        lastRevisions[i] = ref.tag.value();
      }
    } else {
      let { _lastRevisions:lastRevisions } = this;

      for (let i = 0; i < keys.length; i++) {
        let ref = values[i];
        let rev = lastRevisions[i];
        if (!ref.tag.validate(rev)) {
          let key = keys[i];
          lastRevisions[i] = ref.tag.value();
          set(hash, key, ref.value());
        }
      }
    }

    return hash;
  }

  get(path) {
    let { args } = this;
    return args.get(path);
  }
}

/**
   Use the `{{hash}}` helper to create a hash to pass as an option to your
   components. This is specially useful for contextual components where you can
   just yield a hash:

   ```handlebars
   {{yield (hash
      name='Sarah'
      title=office
   )}}
   ```

   Would result in an object such as:

   ```js
   { name: 'Sarah', title: this.get('office') }
   ```

   Where the `title` is bound to updates of the `office` property.

   @method hash
   @for Ember.Templates.helpers
   @param {Object} options
   @return {Object} Hash
   @since 2.3.0
   @public
 */

export default function(vm, args) {
  return new HashReference(args.named);
}
