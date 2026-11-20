// gxt NATIVE layer — alias target for
// `@ember/-internals/glimmer/lib/setup-registry` (called by @ember/application
// and @ember/engine). Registers the native renderer / outlet view instead of the
// classic VM ones; NO `service:-dom-builder` (VM tree builders) and NO
// `template:-root` (the native renderer renders the outlet directly).
//
// `component:link-to` is the REUSED classic LinkTo class (its InternalComponent
// base runs on native manager-api / reference / validator; its layout is the
// AOT native/templates/link-to.gts, rendered by the internal-component adapter
// in native/managers.ts). `component:input` / `component:textarea` are
// documented-drop stubs, registered so resolver lookups fail with the drop
// message.
import type Registry from '@ember/-internals/container/lib/registry';
import LinkTo from '@ember/-internals/glimmer/lib/components/link-to';
import OutletView, { outletTemplateFactory } from './outlet';
import { Renderer } from './renderer';
import Input from './stubs/input';
import Textarea from './stubs/textarea';

export function setupApplicationRegistry(registry: Registry): void {
  registry.register('renderer:-dom', Renderer);
}

export function setupEngineRegistry(registry: Registry): void {
  registry.optionsForType('template', { instantiate: false });

  registry.register('view:-outlet', OutletView);
  // A TemplateFactory (`factory(owner) -> template`): the router hands it to
  // `OutletView.create` (the top level), route.ts invokes it for routes without
  // a template. Its template renders just `{{outlet}}` (native/outlet.ts).
  registry.register('template:-outlet', outletTemplateFactory as any);

  registry.optionsForType('helper', { instantiate: false });

  // @ts-expect-error -- the stub stands in for Glimmer's opaque internal component, which the registry stores as is
  registry.register('component:input', Input);
  registry.register('component:link-to', LinkTo);
  // @ts-expect-error -- the stub stands in for Glimmer's opaque internal component, which the registry stores as is
  registry.register('component:textarea', Textarea);
}
