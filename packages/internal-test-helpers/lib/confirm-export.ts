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
  assert: QUnit['assert'],
  _path: string,
  moduleId: string,
  exportName: string | { value: unknown; get: string; set: string },
  mod: any
) {
  assert.notEqual(
    mod[exportName as string],
    undefined,
    `${moduleId}#${exportName} is not \`undefined\``
  );
}
