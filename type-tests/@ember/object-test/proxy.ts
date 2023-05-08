import Ember from 'ember';
import ObjectProxy from '@ember/object/proxy';
import { expectTypeOf } from 'expect-type';

declare class X extends Ember.Object {
  foo: string;
  bar: number;
}

declare let x: X;
x.getProperties('foo', 'bar');

interface Book {
  title: string;
  subtitle: string;
  chapters: Array<{ title: string }>;
}

class DefaultProxy extends ObjectProxy {}
expectTypeOf(DefaultProxy.create().content).toBeUnknown();

class BookProxy extends ObjectProxy<Book> {
  private readonly baz = 'baz';

  altTitle = 'Alt';

  getTitle() {
    return this.get('title');
  }

  getPropertiesTitleSubtitle() {
    return this.getProperties('title', 'subtitle');
  }
}

const book = BookProxy.create();
expectTypeOf(book.content).toEqualTypeOf<Book | null>();

expectTypeOf(book.get('some-nonsense-property')).toBeUnknown();
expectTypeOf(book.get('title')).toBeString();
expectTypeOf(book.get('altTitle')).toBeString();
expectTypeOf(book.getTitle()).toBeString();

book.getProperties('title', 'some-nonsense-property');
expectTypeOf(book.getProperties('title', 'subtitle')).toEqualTypeOf<
  Pick<Book, 'title' | 'subtitle'>
>();
expectTypeOf(book.getPropertiesTitleSubtitle()).toEqualTypeOf<Pick<Book, 'title' | 'subtitle'>>();
expectTypeOf(book.getProperties(['subtitle', 'chapters'])).toEqualTypeOf<
  Pick<Book, 'subtitle' | 'chapters'>
>();
expectTypeOf(book.getProperties(['title', 'some-nonsense-property'])).toEqualTypeOf<
  Record<'title' | 'some-nonsense-property', unknown>
>;
expectTypeOf(book.getProperties('title', 'altTitle')).toEqualTypeOf<{
  title: string;
  altTitle: string;
}>;

expectTypeOf(book.get('baz')).toBeUnknown();

book.set('title', 'New');
// @ts-expect-error
book.set('title', 1);
book.set('altTitle', 'Alternate');
// @ts-expect-error
book.set('altTitle', 1);
book.setProperties({
  title: 'new',
  subtitle: 'and improved',
  altTitle: 'Alternate2',
});
book.setProperties({ title: 1 });
book.setProperties({ altTitle: 1 });
book.setProperties({ invalid: true });

class Person extends Ember.Object {
  firstName = 'Peter';

  lastName = 'Wagenet';

  @Ember.computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(value: string) {
    const [firstName, lastName] = value.split(' ');

    Ember.set(this, 'firstName', firstName ?? '');
    Ember.set(this, 'lastName', lastName ?? '');
  }
}

class PersonProxy extends ObjectProxy<Person> {}

const person = PersonProxy.create();

expectTypeOf(person.get('firstName')).toBeString();
expectTypeOf(person.get('fullName')).toBeString();
expectTypeOf(person.set('fullName', 'John Doe')).toBeString();
// @ts-expect-error
person.set('fullName', 1);
// @ts-expect-error
person.set('invalid', true);
expectTypeOf(person.setProperties({ fullName: 'John Doe' })).toEqualTypeOf<{
  fullName: 'John Doe';
}>();
expectTypeOf(person.setProperties({ fullName: 'John Doe' }).fullName).toBeString();
person.setProperties({ fullName: 1 });
person.setProperties({ fullName: 'John Doe', invalid: true });
