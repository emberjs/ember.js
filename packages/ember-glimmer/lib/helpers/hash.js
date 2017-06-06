/**
@module ember
@submodule ember-glimmer
*/

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
  return args.named.capture();
}
