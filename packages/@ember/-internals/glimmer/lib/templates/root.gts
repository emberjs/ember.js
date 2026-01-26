import { Component, renderComponent } from '@lifeart/gxt';
// @ts-ignore - $template is injected by gxt compiler

interface RootState {
  root: {
    ref: any;
    template: any;
  };
  render: {
    owner: any;
  };
}

// RootTemplate component - wraps the top-level route rendering
class RootTemplate extends Component<{ rootState: RootState }> {
  get state() {
    return this.args.rootState?.root?.ref;
  }

  get owner() {
    return this.args.rootState?.render?.owner;
  }

  get routeTemplate() {
    return this.args.rootState?.root?.template;
  }

  <template>
    {{!-- The root template renders the route's template --}}
    {{#if this.routeTemplate}}
      <this.routeTemplate @state={{this.state}} @owner={{this.owner}} @root={{true}} />
    {{/if}}
  </template>
}

// Export as a factory function for Ember's template registration system
export default function createRootTemplate(_owner: any) {
  // Create a factory that returns a gxt-compatible template
  const factory = (rootState: any) => {
    const instance = new RootTemplate({ rootState });
    return instance.template.call(instance);
  };

  // Mark as gxt template
  (factory as any).__gxtCompiled = true;
  (factory as any).moduleName = 'template:-root';

  // Add required interface methods
  (factory as any).asLayout = () => ({
    moduleName: 'template:-root',
    symbolTable: { hasEval: false, symbols: [], upvars: [] },
    meta: { moduleName: 'template:-root', owner: _owner, size: 0 },
    compile: () => 999999, // gxt handle
  });

  (factory as any).asWrappedLayout = (factory as any).asLayout;
  (factory as any).result = 'ok';

  // Add render method for runtime gxt rendering
  (factory as any).render = (context: any, parentElement: Element) => {
    // Create component instance with the context as args
    const args = context.rootState ? { rootState: context.rootState } : context;
    const instance = new RootTemplate(args) as any;

    // Get the template function using the $template symbol
    const templateFn = instance[$template];
    if (typeof templateFn === 'function') {
      const templateResult = templateFn.call(instance);
      // Use gxt's renderComponent with the template result
      renderComponent(templateResult, parentElement, instance);
    } else {
      console.warn('RootTemplate did not produce template function', instance);
    }
    return { nodes: [], ctx: context };
  };

  return factory;
}
