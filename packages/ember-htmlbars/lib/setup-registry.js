import { privatize as P } from 'container';
import { InteractiveRenderer, InertRenderer } from './renderer';
import HTMLBarsDOMHelper from './system/dom-helper';
import topLevelViewTemplate from './templates/top-level-view';
import { OutletView as HTMLBarsOutletView } from './views/outlet';
import EmberView from 'ember-views/views/view';
import Component from './component';
import TextField from './components/text_field';
import TextArea from './components/text_area';
import Checkbox from './components/checkbox';
import LinkToComponent from './components/link-to';
import TemplateSupport from 'ember-views/mixins/template_support';

export function setupApplicationRegistry(registry) {
  registry.register('renderer:-dom', InteractiveRenderer);
  registry.register('renderer:-inert', InertRenderer);

  registry.register('service:-dom-helper', {
    create({ document }) { return new HTMLBarsDOMHelper(document); }
  });
}

export function setupEngineRegistry(registry) {
  registry.optionsForType('template', { instantiate: false });
  registry.register('view:-outlet', HTMLBarsOutletView);
  registry.injection('renderer', 'dom', 'service:-dom-helper');
  registry.injection('service:-dom-helper', 'document', 'service:-document');

  registry.register('template:-outlet', topLevelViewTemplate);
  registry.register('view:toplevel', EmberView.extend(TemplateSupport));

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);

  registry.register(P`component:-default`, Component);
}
