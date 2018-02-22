import { privatize as P } from 'container';
import { ENV, environment } from 'ember-environment';
import Component from './component';
import Checkbox from './components/checkbox';
import LinkToComponent from './components/link-to';
import TextArea from './components/text_area';
import TextField from './components/text_field';
import {
  clientBuilder,
  DOMChanges,
  DOMTreeConstruction,
  NodeDOMTreeConstruction,
  rehydrationBuilder,
  serializeBuilder,
} from './dom';
import Environment from './environment';
import loc from './helpers/loc';
import { InertRenderer, InteractiveRenderer } from './renderer';
import TemplateCompiler from './template-compiler';
import ComponentTemplate from './templates/component';
import OutletTemplate from './templates/outlet';
import RootTemplate from './templates/root';
import OutletView from './views/outlet';

interface Registry {
  injection(name: string, name2: string, name3: string): void;
  register(name: string, value: any): void;
  optionsForType(type: string, options: any): void;
}

export function setupApplicationRegistry(registry: Registry) {
  registry.injection('service:-glimmer-environment', 'appendOperations', 'service:-dom-tree-construction');
  registry.injection('renderer', 'env', 'service:-glimmer-environment');

  registry.register('service:-dom-builder', {
    create({ bootOptions }: { bootOptions: { _renderMode: string } }) {
      let { _renderMode } = bootOptions;

      switch(_renderMode) {
        case 'serialize': return serializeBuilder;
        case 'rehydrate': return rehydrationBuilder;
        default: return clientBuilder;
      }
    }
  });
  registry.injection('service:-dom-builder', 'bootOptions', '-environment:main');
  registry.injection('renderer', 'builder', 'service:-dom-builder');

  registry.register(P`template:-root`, RootTemplate);
  registry.injection('renderer', 'rootTemplate', P`template:-root`);

  registry.register('renderer:-dom', InteractiveRenderer);
  registry.register('renderer:-inert', InertRenderer);

  if (environment.hasDOM) {
    registry.injection('service:-glimmer-environment', 'updateOperations', 'service:-dom-changes');
  }

  registry.register('service:-dom-changes', {
    create({ document }: { document: HTMLDocument }) {
      return new DOMChanges(document);
    },
  });

  registry.register('service:-dom-tree-construction', {
    create({ document }: { document: HTMLDocument }) {
      let Implementation = environment.hasDOM ? DOMTreeConstruction : NodeDOMTreeConstruction;
      return new Implementation(document);
    },
  });
}

export function setupEngineRegistry(registry: Registry) {
  registry.register('view:-outlet', OutletView);
  registry.register('template:-outlet', OutletTemplate);
  registry.injection('view:-outlet', 'template', 'template:-outlet');

  registry.injection('service:-dom-changes', 'document', 'service:-document');
  registry.injection('service:-dom-tree-construction', 'document', 'service:-document');

  registry.register(P`template:components/-default`, ComponentTemplate);

  registry.register('service:-glimmer-environment', Environment);

  registry.register(P`template-compiler:main`, TemplateCompiler);

  registry.injection('template', 'compiler', P`template-compiler:main`);

  registry.optionsForType('helper', { instantiate: false });

  registry.register('helper:loc', loc);

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);

  if (!ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
    registry.register(P`component:-default`, Component);
  }
}
