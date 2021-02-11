import { privatize as P, Registry } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import Component from './component';
import LegacyTextArea from './components/-textarea';
import Checkbox from './components/checkbox';
import Input from './components/input';
import LinkTo from './components/link-to';
import TextField from './components/text-field';
import Textarea from './components/textarea';
import { clientBuilder, rehydrationBuilder, serializeBuilder } from './dom';
import loc from './helpers/loc';
import { Renderer } from './renderer';
import OutletTemplate from './templates/outlet';
import RootTemplate from './templates/root';
import OutletView from './views/outlet';

export function setupApplicationRegistry(registry: Registry): void {
  registry.injection('renderer', 'env', '-environment:main');

  // because we are using injections we can't use instantiate false
  // we need to use bind() to copy the function so factory for
  // association won't leak
  registry.register('service:-dom-builder', {
    create({ bootOptions }: { bootOptions: { _renderMode: string } }) {
      let { _renderMode } = bootOptions;

      switch (_renderMode) {
        case 'serialize':
          return serializeBuilder.bind(null);
        case 'rehydrate':
          return rehydrationBuilder.bind(null);
        default:
          return clientBuilder.bind(null);
      }
    },
  });
  registry.injection('service:-dom-builder', 'bootOptions', '-environment:main');
  registry.injection('renderer', 'builder', 'service:-dom-builder');

  registry.register(P`template:-root`, RootTemplate as any);
  registry.injection('renderer', 'rootTemplate', P`template:-root`);

  registry.register('renderer:-dom', Renderer);
  registry.injection('renderer', 'document', 'service:-document');
}

export function setupEngineRegistry(registry: Registry): void {
  registry.optionsForType('template', { instantiate: false });

  registry.register('view:-outlet', OutletView);
  registry.register('template:-outlet', OutletTemplate as any);
  registry.injection('view:-outlet', 'template', 'template:-outlet');

  registry.optionsForType('helper', { instantiate: false });

  registry.register('helper:loc', loc);

  registry.register('component:-text-field', TextField);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:input', Input);
  registry.register('component:link-to', LinkTo);

  if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
    registry.register('component:-textarea', LegacyTextArea);
    registry.register('component:textarea', Textarea);
  } else {
    registry.register('component:textarea', LegacyTextArea);
  }

  if (!ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
    registry.register(P`component:-default`, Component);
  }
}
