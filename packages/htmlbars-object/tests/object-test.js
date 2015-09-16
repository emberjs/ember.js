import HTMLBarsObject, { computed, setProperty } from 'htmlbars-object';
import { Meta } from 'htmlbars-reference';

let Wrapper = HTMLBarsObject.extend({
  fullName: computed(function() {
    return this.model && this.model.fullName;
  }, 'model')
});

let Model = HTMLBarsObject.extend({
  fullName: computed(function() {
    return this.person && this.person.fullName;
  }, 'person')
});

let Person = HTMLBarsObject.extend({
  fullName: computed(function() {
    return this.name && this.name.fullName;
  }, 'name')
});

let Name = HTMLBarsObject.extend({
  fullName: computed(function() {
    return `${this.first} ${this.last}`;
  }, 'first', 'last')
});

QUnit.module('the object model');

QUnit.test('the simple object model allows you to derive references', function() {
  let obj1 = new Wrapper({
    model: new Model({
      person: new Person({
        name: new Name({ first: "Yehuda", last: "Katz" })
      })
    })
  });

  let originalPerson = obj1.model.person;

  let obj2 = new Wrapper({
    model: new Model({
      person: new Person({
        name: obj1.model.person.name
      })
    })
  });

  let obj3 = new Wrapper({
    model: new Model({
      person: obj1.model.person
    })
  });

  let obj4 = new Wrapper({
    model: obj1.model
  });

  let o1 = referencesFor(obj1);
  let o2 = referencesFor(obj2);
  let o3 = referencesFor(obj3);
  let o4 = referencesFor(obj4);

  allDirty(o1, "Yehuda");
  allDirty(o2, "Yehuda");
  allDirty(o3, "Yehuda");
  allDirty(o4, "Yehuda");

  allClean(o1);
  allClean(o2);
  allClean(o3);
  allClean(o4);

  setProperty(obj1.model, 'person', new Person({ name: new Name({ first: 'Godfrey', last: 'Chan' }) }));

  isDirty(o1[0], "Godfrey");
  isDirty(o1[1], "Godfrey");
  isClean(o1[2]);
  isClean(o1[3]);

  allClean(o2);
  allClean(o3);

  isDirty(o4[0], "Godfrey");
  isDirty(o4[1], "Godfrey");
  isClean(o4[2]);
  isClean(o4[3]);

  setProperty(originalPerson.name, 'first', "Godhuda");

  isClean(o1[0]);
  isClean(o1[1]);
  isDirty(o1[2], "Godhuda");
  isDirty(o1[3], "Godhuda");

  allDirty(o2, "Godhuda");
  allDirty(o3, "Godhuda");

  isClean(o4[0]);
  isClean(o4[1]);
  isDirty(o4[2], "Godhuda");
  isDirty(o4[3], "Godhuda");

  setProperty(obj1.model, 'person', undefined);

  isDirty(o1[0], undefined);
  isDirty(o1[1], undefined);
  isClean(o1[2]);
  isClean(o1[3]);

  allClean(o2);
  allClean(o3);

  isDirty(o4[0], undefined);
  isDirty(o4[1], undefined);
  isClean(o4[2]);
  isClean(o4[3]);

  setProperty(obj1.model, 'person', originalPerson);

  isDirty(o1[0], "Godhuda");
  isDirty(o1[1], "Godhuda");
  isClean(o1[2]);
  isClean(o1[3]);

  allClean(o2);
  allClean(o3);

  isDirty(o4[0], "Godhuda");
  isDirty(o4[1], "Godhuda");
  isClean(o4[2]);
  isClean(o4[3]);

  function referencesFor(obj) {
    return [
      root(obj).path('model.person.name.first').fork(),
      root(obj.model).path('person.name.first').fork(),
      root(obj.model.person).path('name.first').fork(),
      root(obj.model.person.name).path('first').fork(),
    ];
  }
});

function root(obj) {
  return Meta.for(obj).root();
}

QUnit.test("Computed properties", function() {
  let obj1 = new Wrapper({
    model: new Model({
      person: new Person({
        name: new Name({ first: "Yehuda", last: "Katz" })
      })
    })
  });

  var originalPerson = obj1.model.person;
  let ref = Meta.for(obj1).root().get('fullName').fork();

  equal(obj1.fullName, "Yehuda Katz");
  equal(ref.value(), "Yehuda Katz");

  setProperty(obj1.model, 'person', new Person({ name: new Name({ first: 'Godfrey', last: 'Chan' }) }));
  equal(obj1.fullName, "Godfrey Chan");
  equal(ref.value(), "Godfrey Chan");

  setProperty(originalPerson.name, 'first', "Godhuda");
  equal(obj1.fullName, "Godfrey Chan");
  equal(ref.value(), "Godfrey Chan");

  setProperty(obj1.model, 'person', undefined);
  equal(obj1.fullName, undefined);
  equal(ref.value(), undefined);

  setProperty(obj1.model, 'person', originalPerson);
  equal(obj1.fullName, "Godhuda Katz");
  equal(ref.value(), "Godhuda Katz");

});

function isDirty(ref, newValue) {
  ok(ref.isDirty(), ref.label() + " is dirty");
  ok(ref.value() === newValue, ref.label() + " has new value " + newValue);
}

function isClean(ref) {
  ok(!ref.isDirty(), ref.label() + " is clean");
}

function allDirty(refs, newValue) {
  refs.forEach(function(ref) { isDirty(ref, newValue); });
}

function allClean(refs) {
  refs.forEach(function(ref) { isClean(ref); });
}
