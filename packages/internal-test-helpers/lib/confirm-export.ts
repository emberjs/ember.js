import require from 'require';

function getDescriptor(obj: Record<string, unknown>, path: string) {
  let parts = path.split('.');
  let value: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i]!;
    // NOTE: This isn't entirely safe since we could have a null!
    value = (value as Record<string, unknown>)[part];
    if (!value) {
      return undefined;
    }
  }
  let last = parts[parts.length - 1]!;
  return Object.getOwnPropertyDescriptor(value, last);
}

export default function confirmExport(
  Ember: Record<string, unknown>,
  assert: QUnit['assert'],
  path: string,
  moduleId: string,
  exportName: string | { value: unknown; get: string; set: string }
) {
  try {
    let desc: PropertyDescriptor | null | undefined;

    if (path !== null) {
      desc = getDescriptor(Ember, path);
      assert.ok(desc, `the ${path} property exists on the Ember global`);
    } else {
      desc = null;
    }

    if (desc == null) {
      let mod = require(moduleId);
      assert.notEqual(
        mod[exportName as string],
        undefined,
        `${moduleId}#${exportName} is not \`undefined\``
      );
    } else if (typeof exportName === 'string') {
      let mod = require(moduleId);
      let value = 'value' in desc ? desc.value : desc.get!.call(Ember);
      assert.equal(value, mod[exportName], `Ember.${path} is exported correctly`);
      assert.notEqual(mod[exportName], undefined, `Ember.${path} is not \`undefined\``);
    } else if ('value' in desc) {
      assert.equal(desc.value, exportName.value, `Ember.${path} is exported correctly`);
    } else {
      let mod = require(moduleId);
      assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
      assert.notEqual(desc.get, undefined, `Ember.${path} getter is not undefined`);

      if (exportName.set) {
        assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
        assert.notEqual(desc.set, undefined, `Ember.${path} setter is not undefined`);
      }
    }
  } catch (error) {
    assert.pushResult({
      result: false,
      message: `An error occurred while testing ${path} is exported from ${moduleId}`,
      actual: error,
      expected: undefined,
    });
  }
}
