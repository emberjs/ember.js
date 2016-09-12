import { environment } from 'ember-environment';
import { privatize as P } from 'container';
import { InteractiveRenderer, InertRenderer } from './renderer';
import {
  DOMChanges,
  DOMTreeConstruction,
  NodeDOMTreeConstruction
} from './dom';
import OutletView from './views/outlet';
import TextField from './components/text_field';
import TextArea from './components/text_area';
import Checkbox from './components/checkbox';
import LinkToComponent from './components/link-to';
import Component from './component';
import ComponentTemplate from './templates/component';
import RootTemplate from './templates/root';
import OutletTemplate from './templates/outlet';
import Environment from './environment';

export function setupApplicationRegistry(registry) {
  registry.injection('service:-glimmer-environment', 'appendOperations', 'service:-dom-tree-construction');
  registry.injection('renderer', 'env', 'service:-glimmer-environment');

  registry.register(P`template:-root`, RootTemplate);
  registry.injection('renderer', 'rootTemplate', P`template:-root`);

  registry.register('renderer:-dom', InteractiveRenderer);
  registry.register('renderer:-inert', InertRenderer);

  if (environment.hasDOM) {
    registry.injection('service:-glimmer-environment', 'updateOperations', 'service:-dom-changes');
  }

  registry.register('service:-dom-changes', {
    create({ document }) { return new DOMChanges(document); }
  });

  registry.register('service:-dom-tree-construction', {
    create({ document }) {
      var Implementation = environment.hasDOM ? DOMTreeConstruction : NodeDOMTreeConstruction;
      return new Implementation(document);
    }
  });
}

export function setupEngineRegistry(registry) {
  registry.register('view:-outlet', OutletView);
  registry.register('template:-outlet', OutletTemplate);
  registry.injection('view:-outlet', 'template', 'template:-outlet');

  registry.injection('service:-dom-changes', 'document', 'service:-document');
  registry.injection('service:-dom-tree-construction', 'document', 'service:-document');

  registry.register(P`template:components/-default`, ComponentTemplate);

  registry.register('service:-glimmer-environment', Environment);
  registry.injection('template', 'env', 'service:-glimmer-environment');

  registry.optionsForType('helper', { instantiate: false });

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);
  registry.register(P`component:-default`, Component);
}
