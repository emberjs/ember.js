// Helper to create a mock compilable program
function createMockCompilableProgram(templateId: string) {
  return {
    compile: () => ({ handle: 0, symbolTable: { hasEval: false, symbols: [] } }),
    id: templateId,
    moduleName: 'gxt-template',
  };
}

// Create a template factory function that wraps the template for owner injection
export function precompileTemplate(templateString: string, options?: any) {
  const templateId = `gxt-template-${Math.random().toString(36).slice(2)}`;

  // Create the template object that Ember expects
  const createTemplate = () => {
    const template = {
      id: templateId,
      moduleName: options?.moduleName || 'unknown',
      isStrictMode: options?.strictMode ?? false,
      result: 'ok' as const, // Mark as successfully compiled
      meta: {},

      // These methods are required by Ember's template system
      asLayout() {
        return createMockCompilableProgram(templateId);
      },
      asWrappedLayout() {
        return createMockCompilableProgram(templateId);
      },
    };
    return template;
  };

  // Return a factory function that creates templates per-owner
  const templateFactory = (owner: any) => {
    const template = createTemplate();
    template.meta = { owner };
    return template;
  };

  return templateFactory;
}

export default function templateCompilation() {
  // Template compilation stub
  return {};
}

export function __registerTemplateCompiler() {
  // Template compiler registration stub
  return {};
}

// Ember template compiler interface for runtime template compilation
export const __emberTemplateCompiler = {
  compile(templateString: string, options?: any) {
    // Runtime compilation stub - in gxt mode, templates are compiled at build time
    console.warn('Runtime template compilation is not supported in gxt mode');
    return () => null;
  },
  precompile(templateString: string, options?: any) {
    return JSON.stringify({ source: templateString });
  },
};

// Compile a template string at runtime
export function compileTemplate(templateString: string, options?: any) {
  console.warn('Runtime template compilation is not supported in gxt mode');
  return () => null;
}
