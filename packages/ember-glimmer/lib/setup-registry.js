import require from 'require';
import { privatize as P } from 'container/registry';
import TextField from 'ember-glimmer/components/text_field';
import TextArea from 'ember-glimmer/components/text_area';
import Checkbox from 'ember-glimmer/components/checkbox';
import LinkToComponent from 'ember-glimmer/components/link-to';

export function setupApplicationRegistry(registry) {
  registry.injection('service:-glimmer-environment', 'dom', 'service:-dom-helper');
  registry.injection('renderer', 'env', 'service:-glimmer-environment');

  let { InteractiveRenderer, InertRenderer } = require('ember-glimmer/renderer');
  registry.register('renderer:-dom', InteractiveRenderer);
  registry.register('renderer:-inert', InertRenderer);

  let DOMHelper = require('ember-glimmer/dom').default;

  registry.register('service:-dom-helper', {
    create({ document }) { return new DOMHelper(document); }
  });
}

export function setupEngineRegistry(registry) {
  let OutletView = require('ember-glimmer/views/outlet').default;
  registry.register('view:-outlet', OutletView);

  let glimmerOutletTemplate = require('ember-glimmer/templates/outlet').default;
  let glimmerComponentTemplate = require('ember-glimmer/templates/component').default;
  registry.register(P`template:components/-default`, glimmerComponentTemplate);
  registry.register('template:-outlet', glimmerOutletTemplate);
  registry.injection('view:-outlet', 'template', 'template:-outlet');

  let Environment = require('ember-glimmer/environment').default;
  registry.register('service:-glimmer-environment', Environment);
  registry.injection('template', 'env', 'service:-glimmer-environment');

  registry.optionsForType('helper', { instantiate: false });

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);
}
