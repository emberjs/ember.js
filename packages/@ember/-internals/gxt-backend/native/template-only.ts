// gxt NATIVE layer — the `templateOnly()` definition marker (classic
// `@glimmer/runtime/lib/component/template-only`, re-exported through
// native/runtime-helpers.ts). Its own module so manager-api / managers can
// import it without importing runtime-helpers (which registers helper and
// modifier managers through manager-api at module evaluation — an import
// cycle there would hit manager-api's registries before they exist).

export class TemplateOnlyComponentDefinition {
  constructor(
    readonly moduleName = '@glimmer/component/template-only',
    readonly name = '(unknown template-only component)'
  ) {}
  toString(): string {
    return this.moduleName;
  }
}

export function templateOnlyComponent(
  moduleName?: string,
  name?: string
): TemplateOnlyComponentDefinition {
  return new TemplateOnlyComponentDefinition(moduleName, name);
}
