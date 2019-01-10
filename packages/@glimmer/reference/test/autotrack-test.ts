import {
  tagFor,
  UpdatableDirtyableTag,
  CONSTANT_TAG,
  Tag,
  accessor,
  data,
  Setter,
  Getter,
} from '@glimmer/reference';
import { unwrap } from '@glimmer/util';

function unrelatedBump(tag: Tag, snapshot: number) {
  let t = UpdatableDirtyableTag.create(CONSTANT_TAG);
  t.inner.dirty();

  QUnit.assert.strictEqual(
    tag.validate(snapshot),
    true,
    'tag is still valid after an unrelated bump'
  );
}

function tracked<T extends object, K extends keyof T>(k: { new (...args: any): T }, key: K) {
  let proto = k.prototype;
  let property = Object.getOwnPropertyDescriptor(proto, key)!;

  let getter: Getter<T, K>;
  let setter: Setter<T, K> | undefined;

  // These branches don't handle values on the prototype... probably not important
  // for this test harness, but not hard to add
  if (property && property.get) {
    let { get, set } = property;
    ({ getter, setter } = accessor({ get, set, key }));
  } else {
    ({ getter, setter } = data<T, K>(key));
  }

  let mappedSetter =
    setter &&
    function(this: T, value: T[K]) {
      setter!(this, value);
    };

  Object.defineProperty(proto, key, {
    get() {
      return getter(this);
    },
    set: mappedSetter,
  });
}

QUnit.module('tracked properties');

QUnit.test(
  'requesting a tag for an untracked property should not throw an exception if mutated in production mode',
  assert => {
    assert.expect(1);

    class UntrackedPerson {
      firstName = 'Tom';
      get lastName() {
        return 'Dale';
      }
      set lastName(_value) {}

      toString() {
        return 'UntrackedPerson';
      }
    }

    let obj = new UntrackedPerson();
    tagFor(obj, 'firstName');
    tagFor(obj, 'lastName');

    obj.firstName = 'Ricardo';
    obj.lastName = 'Mendes';

    assert.ok(true, 'did not throw an exception after mutating tracked properties');
  }
);

QUnit.test('tracked properties can be read and written to', assert => {
  class TrackedPerson {
    firstName = 'Tom';
  }

  tracked(TrackedPerson, 'firstName');

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom');
  obj.firstName = 'Edsger';
  assert.strictEqual(obj.firstName, 'Edsger');
});

QUnit.test('can request a tag for a property', assert => {
  class TrackedPerson {
    firstName = 'Tom';
  }

  tracked(TrackedPerson, 'firstName');

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom');

  let tag = unwrap(tagFor(obj, 'firstName'));
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  obj.firstName = 'Edsger';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after property is set');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is valid on the second check');

  unrelatedBump(tag, snapshot);
});

QUnit.test('can request a tag for non-objects and get a CONSTANT_TAG', assert => {
  let snapshot = CONSTANT_TAG.value();

  assert.ok(tagFor(null, 'foo').validate(snapshot));
  assert.ok(tagFor(undefined, 'foo').validate(snapshot));
  assert.ok(tagFor(12345, 'foo').validate(snapshot));
  assert.ok(tagFor(0, 'foo').validate(snapshot));
  assert.ok(tagFor(true, 'foo').validate(snapshot));
  assert.ok(tagFor(false, 'foo').validate(snapshot));
  assert.ok(tagFor(Symbol(), 'foo').validate(snapshot));
  assert.ok(tagFor('hello world', 'foo').validate(snapshot));
});

QUnit.test('can request a tag from a frozen POJO', assert => {
  let obj = Object.freeze({
    firstName: 'Toran',
  });

  assert.strictEqual(obj.firstName, 'Toran');

  let tag = unwrap(tagFor(obj, 'firstName'));
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is still valid');

  unrelatedBump(tag, snapshot);
});

QUnit.test('can request a tag from a frozen class instance', assert => {
  class TrackedPerson {
    firstName = 'Toran';
    lastName = 'Billups';
  }

  tracked(TrackedPerson, 'firstName');

  let obj = Object.freeze(new TrackedPerson());
  assert.strictEqual(obj.firstName, 'Toran');
  assert.strictEqual(obj.lastName, 'Billups');

  // Explicitly annotated tracked properties
  let tag = tagFor(obj, 'firstName');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is still valid');

  // Non-tracked data properties
  tag = tagFor(obj, 'lastName');
  snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is still valid');

  unrelatedBump(tag, snapshot);
});

QUnit.test('can request a tag from an instance of a frozen class', assert => {
  class TrackedPerson {
    firstName = 'Toran';
  }

  tracked(TrackedPerson, 'firstName');

  let FrozenTrackedPerson = Object.freeze(TrackedPerson);

  let obj = Object.freeze(new FrozenTrackedPerson());

  assert.strictEqual(obj.firstName, 'Toran');

  let tag = tagFor(obj, 'firstName');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is still valid');

  unrelatedBump(tag, snapshot);
});

QUnit.test('can track a computed property', assert => {
  let count = 0;
  let firstName = 'Tom';

  class TrackedPerson {
    get firstName() {
      return firstName + count++;
    }

    set firstName(value) {
      firstName = value;
    }
  }

  tracked(TrackedPerson, 'firstName');

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom0');
  assert.strictEqual(obj.firstName, 'Tom1');

  let tag = tagFor(obj, 'firstName');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  assert.strictEqual(obj.firstName, 'Tom2');
  assert.ok(tag.validate(snapshot), 'reading from property does not invalidate the tag');

  obj.firstName = 'Edsger';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after property is set');
  snapshot = tag.value();

  unrelatedBump(tag, snapshot);

  assert.strictEqual(obj.firstName, 'Edsger3');
  assert.strictEqual(
    tag.validate(snapshot),
    false,
    'tag is invalid, since reading always recomputes the tags'
  );
  snapshot = tag.value();

  unrelatedBump(tag, snapshot);
});

QUnit.test(
  'tracked computed properties are invalidated when their dependencies are invalidated',
  assert => {
    class TrackedPerson {
      get salutation() {
        return `Hello, ${this.fullName}!`;
      }

      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }

      set fullName(fullName) {
        let [firstName, lastName] = fullName.split(' ');
        this.firstName = firstName;
        this.lastName = lastName;
      }

      firstName = 'Tom';
      lastName = 'Dale';
    }

    tracked(TrackedPerson, 'salutation');
    tracked(TrackedPerson, 'fullName');
    tracked(TrackedPerson, 'firstName');
    tracked(TrackedPerson, 'lastName');

    let obj = new TrackedPerson();
    assert.strictEqual(obj.salutation, 'Hello, Tom Dale!', `the saluation field is valid`);
    assert.strictEqual(obj.fullName, 'Tom Dale', `the fullName field is valid`);

    let tag = tagFor(obj, 'salutation');
    let snapshot = tag.value();
    assert.ok(tag.validate(snapshot), 'tag should be valid to start');

    obj.firstName = 'Edsger';
    obj.lastName = 'Dijkstra';
    assert.strictEqual(
      tag.validate(snapshot),
      false,
      'tag is invalidated after chained dependency is set'
    );
    assert.strictEqual(obj.fullName, 'Edsger Dijkstra');
    assert.strictEqual(obj.salutation, 'Hello, Edsger Dijkstra!');

    snapshot = tag.value();
    assert.strictEqual(tag.validate(snapshot), true);

    obj.fullName = 'Alan Kay';
    assert.strictEqual(
      tag.validate(snapshot),
      false,
      'tag is invalidated after chained dependency is set'
    );
    assert.strictEqual(obj.fullName, 'Alan Kay');
    assert.strictEqual(obj.firstName, 'Alan');
    assert.strictEqual(obj.lastName, 'Kay');
    assert.strictEqual(obj.salutation, 'Hello, Alan Kay!');

    snapshot = tag.value();
    assert.strictEqual(tag.validate(snapshot), true);

    unrelatedBump(tag, snapshot);
  }
);

QUnit.test('nested @tracked in multiple objects', assert => {
  class TrackedPerson {
    get salutation() {
      return `Hello, ${this.fullName}!`;
    }

    get fullName(): string {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(fullName: string) {
      let [firstName, lastName] = fullName.split(' ');
      this.firstName = firstName;
      this.lastName = lastName;
    }

    toString() {
      return this.fullName;
    }

    firstName = 'Tom';
    lastName = 'Dale';
  }

  tracked(TrackedPerson, 'salutation');
  tracked(TrackedPerson, 'fullName');
  tracked(TrackedPerson, 'firstName');
  tracked(TrackedPerson, 'lastName');

  class TrackedContact {
    email: string;
    person: TrackedPerson;

    constructor(person: TrackedPerson, email: string) {
      this.person = person;
      this.email = email;
    }

    get contact(): string {
      return `${this.person} @ ${this.email}`;
    }
  }

  tracked(TrackedContact, 'email');
  tracked(TrackedContact, 'person');
  tracked(TrackedContact, 'contact');

  let obj = new TrackedContact(new TrackedPerson(), 'tom@example.com');
  assert.strictEqual(obj.contact, 'Tom Dale @ tom@example.com', `the contact field is valid`);
  assert.strictEqual(obj.person.fullName, 'Tom Dale', `the fullName field is valid`);
  let person = obj.person;

  let tag = tagFor(obj, 'contact');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  person.firstName = 'Edsger';
  person.lastName = 'Dijkstra';
  assert.strictEqual(
    tag.validate(snapshot),
    false,
    'tag is invalidated after nested dependency is set'
  );
  assert.strictEqual(person.fullName, 'Edsger Dijkstra');
  assert.strictEqual(obj.contact, 'Edsger Dijkstra @ tom@example.com');

  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true);

  person.fullName = 'Alan Kay';
  assert.strictEqual(
    tag.validate(snapshot),
    false,
    'tag is invalidated after chained dependency is set'
  );
  assert.strictEqual(person.fullName, 'Alan Kay');
  assert.strictEqual(person.firstName, 'Alan');
  assert.strictEqual(person.lastName, 'Kay');
  assert.strictEqual(obj.contact, 'Alan Kay @ tom@example.com');

  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true);

  obj.email = 'alan@example.com';
  assert.strictEqual(
    tag.validate(snapshot),
    false,
    'tag is invalidated after chained dependency is set'
  );
  assert.strictEqual(person.fullName, 'Alan Kay');
  assert.strictEqual(person.firstName, 'Alan');
  assert.strictEqual(person.lastName, 'Kay');
  assert.strictEqual(obj.contact, 'Alan Kay @ alan@example.com');

  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true);

  unrelatedBump(tag, snapshot);
});
