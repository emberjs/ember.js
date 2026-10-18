// gxt NATIVE layer — alias target for
// `@ember/-internals/glimmer/lib/component-managers/route-template`.
//
// Upstream's `RouteTemplate` is a Glimmer VM internal component: its manager
// renders a classic route template with the controller as `self`. The classic
// route manager builds one per route bucket (`getInvokable`, read eagerly by
// each `OutletState`), but native renders a classic route from its template
// directly (native/root-outlet.ts looks it up once per bucket), so the
// invokable is never rendered and a plain record of what upstream's carries is
// enough.
export class RouteTemplate {
  constructor(
    readonly name: string,
    readonly self: unknown,
    readonly template: unknown
  ) {}
}

export function makeRouteTemplate(name: string, template: unknown, self?: unknown): RouteTemplate {
  return new RouteTemplate(name, self, template);
}
