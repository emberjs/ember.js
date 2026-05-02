import type Registry from '@ember/-internals/container/lib/registry';
import { privatize as P } from '@ember/-internals/container/lib/registry';
import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import Input from './components/input';
import LinkTo from './components/link-to';
import Textarea from './components/textarea';
import { clientBuilder, rehydrationBuilder, serializeBuilder } from './dom';
import { Renderer } from './classic-renderer';
import OutletTemplate from './templates/outlet';
import RootTemplate from './templates/root';
import OutletView from './views/outlet';
// Side-effect imports. Each keeps classic-only infrastructure off the
// `renderComponent`-only path:
//
// - `register-routing-keywords` registers `-mount` and `-outlet` as
//   built-in keyword helpers (pulls in routing/engine).
// - `@glimmer/runtime/.../debug-render-tree-register` registers the
//   `DebugRenderTreeImpl` factory so `delegate.enableDebugTooling: true`
//   actually produces a render tree (used by Ember Inspector). Without
//   this import, `env.debugRenderTree` stays `undefined`.
// - `register-curly-component` registers the classic component manager
//   for the `Component` base class and seeds `positionalParams`. Without
//   this import the classic `Component` class is dead code as far as
//   `setComponentManager`/`capabilities` consumers are concerned.
import './syntax/register-routing-keywords';
import '@glimmer/runtime/lib/debug-render-tree-register';
import './register-curly-component';

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
  registry.optionsForType('template', { instantiate: false });

  registry.register('view:-outlet', OutletView);
  registry.register('template:-outlet', OutletTemplate as any);

  registry.optionsForType('helper', { instantiate: false });

  registry.register('component:input', Input);

  registry.register('component:link-to', LinkTo);
  registry.register('component:textarea', Textarea);
}
