import type Registry from '@ember/-internals/container/lib/registry';
import { privatize as P } from '@ember/-internals/container/lib/registry';
import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { clientBuilder, rehydrationBuilder, serializeBuilder } from './dom';
import { Renderer } from './renderer';
import RootTemplate from './templates/root';
// Side-effect import: registers `-mount` and `-outlet` as built-in keyword
// helpers. Importing this here keeps the renderer free of routing/engine
// dependencies so apps that only use `renderComponent` don't pay for them.
import './syntax/register-routing-keywords';
// Side-effect import: registers the classic-helper manager with the resolver.
// Apps that never use classic class-based helpers don't import this and so
// never pay for `Helper extends FrameworkObject` (and through it, EmberObject).
import './helper';

export function setupApplicationRegistry(registry: Registry): void {
  // because we are using injections we can't use instantiate false
  // we need to use bind() to copy the function so factory for
  // association won't leak
  registry.register('service:-dom-builder', {
    // Additionally, we *must* constrain this to require `props` on create, else
    // we *know* it cannot have an owner.
    create(props: object) {
      let owner = getOwner(props);
      assert('DomBuilderService is unexpectedly missing an owner', owner);
      let env = owner.lookup('-environment:main') as { _renderMode: string };

      switch (env._renderMode) {
        case 'serialize':
          return serializeBuilder.bind(null);
        case 'rehydrate':
          return rehydrationBuilder.bind(null);
        default:
          return clientBuilder.bind(null);
      }
    },
  });

  registry.register(P`template:-root`, RootTemplate as any);

  registry.register('renderer:-dom', Renderer);
}

export function setupEngineRegistry(registry: Registry): void {
  // registry.optionsForType('template', { instantiate: false });
  //
  // registry.register('view:-outlet', OutletView);
  // registry.register('template:-outlet', OutletTemplate as any);
  //
  // registry.optionsForType('helper', { instantiate: false });
  //
  // registry.register('component:input', Input);
  //
  // registry.register('component:link-to', LinkTo);
  // registry.register('component:textarea', Textarea);
}
