import { privatize as P } from 'container/registry';
import { InteractiveRenderer, InertRenderer } from 'ember-htmlbars/renderer';
import HTMLBarsDOMHelper from 'ember-htmlbars/system/dom-helper';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
import { OutletView as HTMLBarsOutletView } from 'ember-htmlbars/views/outlet';
import EmberView from 'ember-views/views/view';
import Component from 'ember-htmlbars/component';
import TextField from 'ember-htmlbars/components/text_field';
import TextArea from 'ember-htmlbars/components/text_area';
import Checkbox from 'ember-htmlbars/components/checkbox';
import LinkToComponent from 'ember-htmlbars/components/link-to';
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

  registry.register('template:-outlet', topLevelViewTemplate);
  registry.register('view:toplevel', EmberView.extend(TemplateSupport));

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);

  registry.register(P`component:-default`, Component);
}
