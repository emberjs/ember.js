import GlimmerObject, { VersionedRootReference, classof, root as rootFor, set } from '../index';
import { VersionedPathReference, RevisionTag } from '@glimmer/reference';

QUnit.module('[glimmer-object-model] reference');

function MakeSub() {
  let Sub = classof<Sub>(GlimmerObject.extend({
    name: 'Dan'
  }));

  interface Sub {
    name: string;
  }

  let SubSub = classof<SubSub>(Sub.extend({
    sal: 'Mr.'
  }));

  interface SubSub extends Sub {
    sal: string;
  }

  let obj = Sub.create();

  let root = rootFor(obj);
  let name = root.get('name');

  return { Sub, SubSub, root, obj, name };
}

QUnit.test('getting a reference', assert => {
  let { root, obj, name } = MakeSub();

  assert.strictEqual(root.value(), obj);
  assert.strictEqual(name.value(), 'Dan');
});

QUnit.test('unchanged references are valid', assert => {
  let { root, obj, name } = MakeSub();

  let dan = name.value();
  let nameTag = name.tag;
  let initialSnapshot = nameTag.value();

  assert.strictEqual(name.value(), dan);
  assert.strictEqual(nameTag.validate(initialSnapshot), true);
});

QUnit.test('changed references are invalid', assert => {
  let { root, obj, name } = MakeSub();

  let nameTag = name.tag;
  let initialSnapshot = nameTag.value();

  set(obj, 'name', 'Daniel');

  assert.strictEqual(nameTag.validate(initialSnapshot), false);
  assert.strictEqual(name.value(), 'Daniel');
});

class Bucket<Name, Sal, Loud> {
  constructor(
    public name: Name,
    public sal: Sal,
    public loud: Loud
  ) {}
}

type References = Bucket<VersionedPathReference<string>, VersionedPathReference<string>, VersionedPathReference<boolean>>;
type Values = Bucket<string, string, boolean>;
type Tags = Bucket<RevisionTag, RevisionTag, RevisionTag>;
type Snapshots = Bucket<number, number, number>;

interface TestObject {
  name: string;
  sal: string;
  loud: boolean;
}

class State {
  private references: References;
  private values: Values;
  private tags: Tags;
  private snapshot: Snapshots;

  constructor(root: VersionedRootReference<TestObject>) {
    this.references = {
      name: root.get<string>('name'),
      sal: root.get<string>('sal'),
      loud: root.get<boolean>('loud')
    };

    this.update();
  }

  private updateValues() {
    this.values = {
      name: this.references.name.value(),
      sal: this.references.sal.value(),
      loud: this.references.loud.value()
    };
  }

  private updateTags() {
    this.tags = {
      name: this.references.name.tag,
      sal: this.references.sal.tag,
      loud: this.references.loud.tag
    };
  }

  private updateSnapshot() {
    this.snapshot = {
      name: this.tags.name.value(),
      sal: this.tags.sal.value(),
      loud: this.tags.loud.value()
    };
  }

  update() {
    this.updateValues();
    this.updateTags();
    this.updateSnapshot();
  }

  validateTags({ name = true, sal = true, loud = true }) {
    QUnit.assert.strictEqual(this.tags.name.validate(this.snapshot.name), name, `valid(name) != ${name}`);
    QUnit.assert.strictEqual(this.tags.sal.validate(this.snapshot.sal), sal, `valid(sal) != ${sal}`);
    QUnit.assert.strictEqual(this.tags.loud.validate(this.snapshot.loud), loud, `valid(loud) != ${loud}`);
    this.updateTags();
  }

  validateValues({ name = this.values.name, sal = this.values.sal, loud = this.values.loud }) {
    QUnit.assert.strictEqual(this.references.name.value(), name, `name != ${name}`);
    QUnit.assert.strictEqual(this.references.sal.value(), sal, `sal != ${sal}`);
    QUnit.assert.strictEqual(this.references.loud.value(), loud, `loud != ${loud}`);
    this.updateValues();
  }
}

QUnit.test('references are granular', assert => {
  let { SubSub } = MakeSub();

  let obj = SubSub.create({ loud: true });
  let root = rootFor(obj);

  let state = new State(root);

  set(obj, 'name', 'Daniel');

  step('Update name');

  state.validateTags({ name: false });
  state.validateValues({ name: 'Daniel' });
  state.update();

  set(obj, 'loud', false);

  step('Update loud');

  state.validateTags({ loud: false });
  state.validateValues({ loud: false });
  state.update();
});

QUnit.test('works with ES6 subclassing', assert => {
  let { Sub } = MakeSub();

  class SubSub extends Sub {
    sal: string;
    loud: boolean;
  }

  let obj = SubSub.create({ loud: true, sal: 'Mr.' });
  let root = rootFor(obj);

  let state = new State(root);

  set(obj, 'name', 'Daniel');

  step('Update name');

  state.validateTags({ name: false });
  state.validateValues({ name: 'Daniel' });
  state.update();

  set(obj, 'loud', false);

  step('Update loud');

  state.validateTags({ loud: false });
  state.validateValues({ loud: false });
  state.update();
});

function step(desc: string) {
  QUnit.assert.ok(true, desc);
}
