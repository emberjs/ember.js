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
// This is a special component that bridges Ember templates to gxt rendering
class RootTemplate extends Component<{ rootState: RootState }> {
  private renderedElement: Element | null = null;

  // The outlet ref contains the outlet state structure
  get outletRef() {
    return this.args.rootState?.root?.ref;
  }

  // The main outlet contains the application route's render info
  get mainOutlet() {
    return this.outletRef?.outlets?.main;
  }

  get owner() {
    return this.args.rootState?.render?.owner;
  }

  // The application template is in the main outlet's render
  get routeTemplate() {
    return this.mainOutlet?.render?.template;
  }

  get routeModel() {
    return this.mainOutlet?.render?.model;
  }

  get outletState() {
    return this.mainOutlet;
  }

  get hasRouteTemplate() {
    return !!this.routeTemplate;
  }

  <template>
    {{!-- The root template placeholder - actual content rendered imperatively --}}
    <div class="ember-root-outlet" id="ember-root-outlet">
      {{#if this.hasRouteTemplate}}
        {{!-- Route template will be rendered here by the render method --}}
      {{/if}}
    </div>
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

      // After gxt renders the placeholder, render the route template into it
      setTimeout(() => {
        const outlet = parentElement.querySelector('#ember-root-outlet');
        if (outlet && instance.routeTemplate) {
          const routeTemplate = instance.routeTemplate;
          // Check if it's a gxt-compiled template with render method
          if (typeof routeTemplate.render === 'function') {
            routeTemplate.render({ model: instance.routeModel }, outlet);
          } else if (typeof routeTemplate === 'function') {
            // It's a factory function - call it to get the template
            const template = routeTemplate(instance.owner);
            if (template && typeof template.render === 'function') {
              template.render({ model: instance.routeModel }, outlet);
            } else {
              console.warn('Route template factory did not return renderable template:', template);
            }
          } else {
            console.warn('Route template is not renderable:', routeTemplate);
          }
        }
      }, 0);
    } else {
      console.warn('RootTemplate did not produce template function', instance);
    }
    return { nodes: [], ctx: context };
  };

  return factory;
}
