import require from 'require';

function getDescriptor(obj, path) {
  let parts = path.split('.');
  let value = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i];
    value = value[part];
    if (!value) {
      return undefined;
    }
  }
  let last = parts[parts.length - 1];
  return Object.getOwnPropertyDescriptor(value, last);
}

export default function confirmExport(Ember, assert, path, moduleId, exportName) {
  let desc = getDescriptor(Ember, path);
  assert.ok(desc, 'the property exists on the global');

  let mod = require(moduleId);
  if (typeof exportName === 'string') {
    assert.equal(desc.value, mod[exportName], `Ember.${path} is exported correctly`);
    assert.notEqual(mod[exportName], undefined, `Ember.${path} is not \`undefined\``);
  } else {
    assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
    assert.notEqual(desc.get, undefined, `Ember.${path} getter is not undefined`);

    if (exportName.set) {
      assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
      assert.notEqual(desc.set, undefined, `Ember.${path} setter is not undefined`);
    }
  }
}
