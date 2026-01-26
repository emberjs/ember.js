import { Component, renderComponent } from '@lifeart/gxt';
// @ts-ignore - $template is injected by gxt compiler
import OutletHelper from './outlet-helper-component';

// OutletTemplate component - renders the outlet hierarchy
class OutletTemplate extends Component<{ state: any }> {
  <template>
    <OutletHelper @state={{@state}} @root={{true}} />
  </template>
}

// Export as a factory function for Ember's template registration system
export default function createOutletTemplate(_owner: any) {
  // Mark the factory result as gxt compiled
  const factory = (args: any) => {
    const instance = new OutletTemplate(args);
    return instance.template.call(instance);
  };

  // Mark as gxt template
  (factory as any).__gxtCompiled = true;
  (factory as any).moduleName = 'template:-outlet';

  // Add required interface methods
  (factory as any).asLayout = () => ({
    moduleName: 'template:-outlet',
    symbolTable: { hasEval: false, symbols: [], upvars: [] },
    meta: { moduleName: 'template:-outlet', owner: _owner, size: 0 },
    compile: () => 999999, // gxt handle
  });

  (factory as any).asWrappedLayout = (factory as any).asLayout;
  (factory as any).result = 'ok';

  // Add render method for runtime gxt rendering
  (factory as any).render = (context: any, parentElement: Element) => {
    // Create component instance with the context as args
    const instance = new OutletTemplate(context) as any;
    // Get the template function using the $template symbol
    const templateFn = instance[$template];
    if (typeof templateFn === 'function') {
      const templateResult = templateFn.call(instance);
      // Use gxt's renderComponent with the template result
      renderComponent(templateResult, parentElement, instance);
    } else {
      console.warn('OutletTemplate did not produce template function', instance);
    }
    return { nodes: [], ctx: context };
  };

  return factory;
}
