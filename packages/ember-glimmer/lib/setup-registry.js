import { privatize as P } from 'container/registry';
import { InteractiveRenderer, InertRenderer } from 'ember-glimmer/renderer';
import { DOMChanges, DOMTreeConstruction } from 'ember-glimmer/dom';
import OutletView from 'ember-glimmer/views/outlet';
import TextField from 'ember-glimmer/components/text_field';
import TextArea from 'ember-glimmer/components/text_area';
import Checkbox from 'ember-glimmer/components/checkbox';
import LinkToComponent from 'ember-glimmer/components/link-to';
import ComponentTemplate from 'ember-glimmer/templates/component';
import RootTemplate from 'ember-glimmer/templates/root';
import OutletTemplate from 'ember-glimmer/templates/outlet';
import Environment from 'ember-glimmer/environment';

export function setupApplicationRegistry(registry) {
  registry.injection('service:-glimmer-environment', 'appendOperations', 'service:-dom-tree-construction');
  registry.injection('service:-glimmer-environment', 'updateOperations', 'service:-dom-changes');
  registry.injection('renderer', 'env', 'service:-glimmer-environment');

  registry.register(P`template:-root`, RootTemplate);
  registry.injection('renderer', 'rootTemplate', P`template:-root`);

  registry.register('renderer:-dom', InteractiveRenderer);
  registry.register('renderer:-inert', InertRenderer);

  registry.register('service:-dom-changes', {
    create({ document }) { return new DOMChanges(document); }
  });

  registry.register('service:-dom-tree-construction', {
    create({ document }) { return new DOMTreeConstruction(document); }
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
}
