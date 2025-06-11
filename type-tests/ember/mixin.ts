import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

interface EditableMixin extends Ember.Mixin {
  edit(): void;
  isEditing: boolean;
}

const EditableMixin = Ember.Mixin.create({
  edit(this: EditableMixin & Ember.Object) {
    this.get('controller');
    console.log('starting to edit');
    this.set('isEditing', true);
  },
  isEditing: false,
});

interface EditableComment extends EditableMixin {}
class EditableComment extends Ember.Route.extend(EditableMixin) {
  postId = 0;

  canEdit() {
    return !this.isEditing;
  }

  tryEdit() {
    if (this.canEdit()) {
      this.edit();
    }
  }
}

const comment = EditableComment.create({
  postId: 42,
});

comment.edit();
comment.canEdit();
comment.tryEdit();
expectTypeOf(comment.isEditing).toBeBoolean();
expectTypeOf(comment.postId).toBeNumber();

/* Test composition of mixins */
interface EditableAndCancelableMixin extends EditableMixin {
  cancelled: boolean;
}
const EditableAndCancelableMixin = Ember.Mixin.create(EditableMixin, {
  cancelled: false,
});
