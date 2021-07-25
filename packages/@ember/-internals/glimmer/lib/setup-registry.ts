import { privatize as P, Registry } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { getOwner } from '@ember/-internals/owner';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import Component from './component';
import LegacyLinkTo from './components/-link-to';
import LegacyTextArea from './components/-textarea';
import Checkbox from './components/checkbox';
import Input from './components/input';
import LinkTo from './components/link-to';
import TextField from './components/text-field';
import Textarea from './components/textarea';
import { clientBuilder, rehydrationBuilder, serializeBuilder } from './dom';
import { Renderer } from './renderer';
import OutletTemplate from './templates/outlet';
import RootTemplate from './templates/root';
import OutletView from './views/outlet';

export function setupApplicationRegistry(registry: Registry): void {
  // because we are using injections we can't use instantiate false
  // we need to use bind() to copy the function so factory for
  // association won't leak
  registry.register('service:-dom-builder', {
    create(props) {
      let env = getOwner(props).lookup('-environment:main') as { _renderMode: string };

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

  registry.register('component:-text-field', TextField);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:input', Input);

  if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
    registry.register('component:link-to', LinkTo);
    registry.register('component:-link-to', LegacyLinkTo);
    registry.register('component:-textarea', LegacyTextArea);
    registry.register('component:textarea', Textarea);
  } else {
    registry.register('component:link-to', LegacyLinkTo);
    registry.register('component:textarea', LegacyTextArea);
  }

  if (!ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
    registry.register(P`component:-default`, Component);
  }
}
