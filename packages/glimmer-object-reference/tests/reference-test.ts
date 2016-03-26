import { metaFor, setProperty } from "glimmer-object-reference";

//function computed(obj, name, getter, depStrings) {
  //Object.defineProperty(obj, name, {
    //enumerable: true,
    //configurable: true,
    //get: getter
  //});

  //let deps = depStrings.map(d => d.split('.'));

  //[>jshint -W064<]
  //Meta.for(obj).addReferenceTypeFor(name, ComputedBlueprint(name, deps)); [>jshint +W064<]
//}

import { intern } from 'glimmer-util';

function addObserver(obj: any, name: string, path: string) {
  return metaFor(obj).root().referenceFromParts(path.split('.').map(intern));
}

QUnit.module("references");

QUnit.test("basic reference data flow", function() {
  let obj1 = { label: "obj1", model: { person: { name: { first: "Yehuda", last: "Katz" } } } };
  let obj2 = { label: "obj2", model: { person: { name: obj1.model.person.name } } };
  let obj3 = { label: "obj3", model: { person: obj1.model.person } };
  let obj4 = { label: "obj4", model: obj1.model };

  let originalPerson = obj1.model.person;

  let o1 = [
    addObserver(obj1, 'obj1', 'model.person.name.first'),
    addObserver(obj1.model, 'obj1.model', 'person.name.first'),
    addObserver(obj1.model.person, 'obj1.model.person', 'name.first'),
    addObserver(obj1.model.person.name, 'obj1.model.person.name', 'first')
  ];

  let o2 = [
    addObserver(obj2, 'obj2', 'model.person.name.first'),
    addObserver(obj2.model, 'obj2.model', 'person.name.first'),
    addObserver(obj2.model.person, 'obj2.model.person', 'name.first'),
    addObserver(obj2.model.person.name, 'obj2.model.person.name', 'first')
  ];

  let o3 = [
    addObserver(obj3, 'obj3', 'model.person.name.first'),
    addObserver(obj3.model, 'obj3.model', 'person.name.first'),
    addObserver(obj3.model.person, 'obj3.model.person', 'name.first'),
    addObserver(obj3.model.person.name, 'obj3.model.person.name', 'first')
  ];

  let o4 = [
    addObserver(obj4, 'obj4', 'model.person.name.first'),
    addObserver(obj4.model, 'obj4.model', 'person.name.first'),
    addObserver(obj4.model.person, 'obj4.model.person', 'name.first'),
    addObserver(obj4.model.person.name, 'obj4.model.person.name', 'first')
  ];

  allDirty(o1, "Yehuda");
  allDirty(o2, "Yehuda");
  allDirty(o3, "Yehuda");
  allDirty(o4, "Yehuda");

  allClean(o1);
  allClean(o2);
  allClean(o3);
  allClean(o4);

  setProperty(obj1.model, 'person', { name: { first: 'Godfrey', last: 'Chan' } });

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
});

QUnit.test("test data flow that goes through primitive wrappers", function() {
  let obj1 = { label: "obj1", model: { person: { name: { first: "Yehuda", last: "Katz" } } } };
  let obj2 = { label: "obj2", model: { person: { name: obj1.model.person.name } } };
  let obj3 = { label: "obj3", model: { person: obj1.model.person } };
  let obj4 = { label: "obj4", model: obj1.model };

  let originalPerson = obj1.model.person;

  let o1 = [
    addObserver(obj1, 'obj1', 'model.person.name.first.length'),
    addObserver(obj1.model, 'obj1.model', 'person.name.first.length'),
    addObserver(obj1.model.person, 'obj1.model.person', 'name.first.length'),
    addObserver(obj1.model.person.name, 'obj1.model.person.name', 'first.length')
  ];

  let o2 = [
    addObserver(obj2, 'obj2', 'model.person.name.first.length'),
    addObserver(obj2.model, 'obj2.model', 'person.name.first.length'),
    addObserver(obj2.model.person, 'obj2.model.person', 'name.first.length'),
    addObserver(obj2.model.person.name, 'obj2.model.person.name', 'first.length')
  ];

  let o3 = [
    addObserver(obj3, 'obj3', 'model.person.name.first.length'),
    addObserver(obj3.model, 'obj3.model', 'person.name.first.length'),
    addObserver(obj3.model.person, 'obj3.model.person', 'name.first.length'),
    addObserver(obj3.model.person.name, 'obj3.model.person.name', 'first.length')
  ];

  let o4 = [
    addObserver(obj4, 'obj4', 'model.person.name.first.length'),
    addObserver(obj4.model, 'obj4.model', 'person.name.first.length'),
    addObserver(obj4.model.person, 'obj4.model.person', 'name.first.length'),
    addObserver(obj4.model.person.name, 'obj4.model.person.name', 'first.length')
  ];

  allDirty(o1, 6);
  allDirty(o2, 6);
  allDirty(o3, 6);
  allDirty(o4, 6);

  allClean(o1);
  allClean(o2);
  allClean(o3);
  allClean(o4);

  setProperty(obj1.model, 'person', { name: { first: 'Godfrey', last: 'Chan' } });

  isDirty(o1[0], 7);
  isDirty(o1[1], 7);
  isClean(o1[2]);
  isClean(o1[3]);

  allClean(o2);
  allClean(o3);

  isDirty(o4[0], 7);
  isDirty(o4[1], 7);
  isClean(o4[2]);
  isClean(o4[3]);

  setProperty(originalPerson.name, 'first', "God-huda");

  isClean(o1[0]);
  isClean(o1[1]);
  isDirty(o1[2], 8);
  isDirty(o1[3], 8);

  allDirty(o2, 8);
  allDirty(o3, 8);

  isClean(o4[0]);
  isClean(o4[1]);
  isDirty(o4[2], 8);
  isDirty(o4[3], 8);

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

  isDirty(o1[0], 8);
  isDirty(o1[1], 8);
  isClean(o1[2]);
  isClean(o1[3]);

  allClean(o2);
  allClean(o3);

  isDirty(o4[0], 8);
  isDirty(o4[1], 8);
  isClean(o4[2]);
  isClean(o4[3]);
});

function isDirty(ref, newValue) {
  // ok(ref.isDirty(), ref.label() + " is dirty");
  ok(ref.value() === newValue, ref.label() + " has new value " + newValue);
}

function isClean(ref) {
  // clean references are allowed to report dirty
}

function allDirty(refs, newValue) {
  refs.forEach(function(ref) { isDirty(ref, newValue); });
}

function allClean(refs) {
  refs.forEach(function(ref) { isClean(ref); });
}
