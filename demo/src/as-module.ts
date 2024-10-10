interface ModuleTag {
  [Symbol.toStringTag]: 'Module';
}
type ModuleObject = Record<string, unknown> & ModuleTag;

export async function asModule<T = ModuleObject>(
  source: string
  // { at, name = 'template.js' }: { at: { url: URL | string }; name?: string }
): Promise<T & ModuleTag> {
  const blob = new Blob([source], { type: 'application/javascript' });

  return import(URL.createObjectURL(blob));
}
