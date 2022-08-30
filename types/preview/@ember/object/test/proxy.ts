import Ember from 'ember';
import ObjectProxy from '@ember/object/proxy';
import { expectTypeOf } from 'expect-type';

interface Book {
  title: string;
  subtitle: string;
  chapters: Array<{ title: string }>;
}

class DefaultProxy extends ObjectProxy {}
DefaultProxy.create().content; // $ExpectType object | undefined

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
expectTypeOf(book.content).toEqualTypeOf<Book | undefined>(); // $ExpectType Book | undefined

// @ts-expect-error
book.get('unknownProperty');
expectTypeOf(book.get('title')).toEqualTypeOf<string | undefined>();
expectTypeOf(book.get('altTitle')).toBeString();
expectTypeOf(book.getTitle()).toEqualTypeOf<string | undefined>();

// @ts-expect-error
book.getProperties('title', 'unknownProperty');
expectTypeOf(book.getProperties('title', 'subtitle')).toEqualTypeOf<
  Pick<Partial<Book>, 'title' | 'subtitle'>
>();
expectTypeOf(book.getPropertiesTitleSubtitle()).toEqualTypeOf<
  Pick<Partial<Book>, 'title' | 'subtitle'>
>();
expectTypeOf(book.getProperties(['subtitle', 'chapters'])).toEqualTypeOf<
  Pick<Partial<Book>, 'subtitle' | 'chapters'>
>();
// @ts-expect-error
book.getProperties(['title', 'unknownProperty']);

// @ts-expect-error
book.get('baz');

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
// @ts-expect-error
book.setProperties({ title: 1 });
// @ts-expect-error
book.setProperties({ altTitle: 1 });
// @ts-expect-error
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

expectTypeOf(person.get('firstName')).toEqualTypeOf<string | undefined>();
expectTypeOf(person.get('fullName')).toEqualTypeOf<string | undefined>();
expectTypeOf(person.set('fullName', 'John Doe')).toBeString();
// @ts-expect-error
person.set('fullName', 1);
// @ts-expect-error
person.set('invalid', true);
expectTypeOf(person.setProperties({ fullName: 'John Doe' })).toEqualTypeOf<
  Pick<PersonProxy & Person, 'fullName'>
>();
expectTypeOf(person.setProperties({ fullName: 'John Doe' }).fullName).toBeString();
// @ts-expect-error
person.setProperties({ fullName: 1 });
// @ts-expect-error
person.setProperties({ fullName: 'John Doe', invalid: true });
