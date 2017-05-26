import GlimmerObject from '../index';

QUnit.module("[glimmer-object-model] extend");

// NOTE: The fact that the following code passes the type checker
// is a part of the tested functionality of this test suite.

QUnit.test('basic create works', assert => {
  let obj = GlimmerObject.create({ name: 'hello' });
  assert.equal(obj.name, 'hello');
});

QUnit.test('basic extend works', assert => {
  let Sub = GlimmerObject.extend();
  let obj = Sub.create({ name: 'hello' });
  assert.equal(obj.name, 'hello');
});

QUnit.test('repeating extend works', assert => {
  let Sub = GlimmerObject.extend().extend();
  let obj = Sub.create({ name: 'hello' });
  assert.equal(obj.name, 'hello');
});

QUnit.test('extending with new properties works', assert => {
  let Sub = GlimmerObject.extend({
    parentName: 'hi'
  });

  let obj = Sub.create({ name: 'hello' });
  assert.equal(obj.name, 'hello');
  assert.equal(obj.parentName, 'hi');
});

QUnit.test('extending with methods works', assert => {
  let Sub = GlimmerObject.extend({
    hi(this: any): string {
      return this.name;
    }
  });

  let obj = Sub.create({ name: 'Dan' });
  assert.equal(obj.hi(), 'Dan');
});

QUnit.test('extending multiple times with new functionality each time works', assert => {
  let First = GlimmerObject.extend({
    name: 'Dan'
  });

  type First = { name: string };

  let Second = First.extend({
    hi(this: any): string {
      return `Hi ${this.salutation} ${this.name}`;
    }
  });

  let Sub = Second.extend({
    greet(this: any): string {
      return this.hi().toUpperCase();
    }
  });

  let obj = Sub.create({ salutation: 'Mr.' });

  assert.equal(obj.greet(), 'HI MR. DAN');
});

QUnit.test('mixing ES6 subclassing with ES5 subclassing', assert => {
  let First = GlimmerObject.extend({
    named: 'Dan'
  });

  class Second extends First {
    public salutation: string;

    hi(): string {
      return `Hi ${this.salutation} ${this.named}`;
    }
  }

  class Sub extends Second {
    greet(): string {
      return this.hi().toUpperCase();
    }
  }

  let obj = Sub.create({ salutation: 'Mr.' });

  assert.equal(obj.greet(), 'HI MR. DAN');
});
