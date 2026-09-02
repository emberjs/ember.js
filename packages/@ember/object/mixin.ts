/**
@module @ember/object/mixin
*/
import { InternalMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

export { applyMixin, mixin } from '@ember/object/mixin-internal';

/**
  The `Mixin` class allows you to create mixins, whose properties can be
  added to other classes. For instance,

  ```javascript
  import Mixin from '@ember/object/mixin';

  const EditableMixin = Mixin.create({
    edit() {
      console.log('starting to edit');
      this.set('isEditing', true);
    },
    isEditing: false
  });
  ```

  ```javascript
  import EmberObject from '@ember/object';
  import EditableMixin from '../mixins/editable';

  // Mix mixins into classes by passing them as the first arguments to
  // `.extend.`
  class Comment extends EmberObject.extend(EditableMixin) {
    post = null
  }

  let comment = Comment.create({
    post: somePost
  });

  comment.edit(); // outputs 'starting to edit'
  ```

  Note that Mixins are created with `Mixin.create`, not
  `Mixin.extend`.

  Note that mixins extend a constructor's prototype so arrays and object literals
  defined as properties will be shared amongst objects that implement the mixin.
  If you want to define a property in a mixin that is not shared, you can define
  it either as a computed property or have it be created on initialization of the object.

  ```javascript
  // filters array will be shared amongst any object implementing mixin
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';

  const FilterableMixin = Mixin.create({
    filters: A()
  });
  ```

  ```javascript
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';
  import { computed } from '@ember/object';

  // filters will be a separate array for every object implementing the mixin
  const FilterableMixin = Mixin.create({
    filters: computed(function() {
      return A();
    })
  });
  ```

  ```javascript
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';

  // filters will be created as a separate array during the object's initialization
  const Filterable = Mixin.create({
    filters: null,

    init() {
      this._super(...arguments);
      this.set("filters", A());
    }
  });
  ```

  @class Mixin
  @public
*/
export default class Mixin extends InternalMixin {
  /**
    @method create
    @for @ember/object/mixin
    @static
    @param arguments*
    @public
  */
  static override create<M extends typeof InternalMixin>(...args: any[]): InstanceType<M> {
    deprecateUntil(
      `Using mixins is deprecated. Refactor to composition patterns or class decorators.`,
      DEPRECATIONS.DEPRECATE_MIXINS
    );
    return super.create<M>(...args);
  }
}
