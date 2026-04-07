import EmberObject from '@ember/object';
import Mixin from '@ember/object/mixin';
import Route from '@ember/routing/route';
import { expectTypeOf } from 'expect-type';

interface EditableMixin extends Mixin {
  edit(): void;
  isEditing: boolean;
}

const EditableMixin = Mixin.create({
  edit(this: EditableMixin & EmberObject) {
    this.get('controller');
    console.log('starting to edit');
    this.set('isEditing', true);
  },
  isEditing: false,
});

interface EditableComment extends EditableMixin {}
class EditableComment extends Route.extend(EditableMixin) {
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

// We do not expect this to update the type; we do expect it to minimally check
const LiteralMixins = EmberObject.extend({ a: 1 }, { b: 2 }, { c: 3 });
const obj = LiteralMixins.create();
// @ts-expect-error
obj.a;
// @ts-expect-error
obj.b;
// @ts-expect-error
obj.c;

/* Test composition of mixins */
interface EditableAndCancelableMixin extends EditableMixin {
  cancelled: boolean;
}
const EditableAndCancelableMixin = Mixin.create(EditableMixin, {
  cancelled: false,
});

interface EditableAndCancelableComment extends EditableAndCancelableMixin {}
class EditableAndCancelableComment extends Route.extend(EditableAndCancelableMixin) {}

const editableAndCancelable = EditableAndCancelableComment.create();
expectTypeOf(editableAndCancelable.isEditing).toBeBoolean();
expectTypeOf(editableAndCancelable.cancelled).toBeBoolean();
