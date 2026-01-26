import type { Template, TemplateOk, CompilableProgram, ProgramSymbolTable } from '@glimmer/interfaces';

// Symbol to mark gxt templates
export const GXT_TEMPLATE_SYMBOL = Symbol('gxt-template');

// Special handle value to indicate gxt templates
export const GXT_TEMPLATE_HANDLE = 999999;

// Check if a template is a gxt-compiled template
export function isGxtTemplate(template: any): boolean {
  if (!template) return false;
  // Check for gxt template markers
  return (
    GXT_TEMPLATE_SYMBOL in template ||
    '$nodes' in template ||
    (template.__gxtCompiled === true)
  );
}

// Create a gxt-compatible CompilableProgram
function createGxtCompilableProgram(template: any, moduleName: string): CompilableProgram {
  return {
    moduleName,
    symbolTable: {
      hasEval: false,
      symbols: [],
      upvars: [],
    } as ProgramSymbolTable,
    meta: {
      moduleName,
      owner: template.meta?.owner ?? null,
      size: 0,
    },
    compile(_context: any) {
      // Return a special handle number that indicates a gxt template
      return GXT_TEMPLATE_HANDLE;
    },
  };
}

// Create a fallback CompilableProgram for templates that aren't compiled
// This is used for templates that don't have asLayout but aren't gxt templates either
function createFallbackCompilableProgram(template: any, moduleName: string): CompilableProgram {
  return {
    moduleName,
    symbolTable: {
      hasEval: false,
      symbols: [],
      upvars: [],
    } as ProgramSymbolTable,
    meta: {
      moduleName,
      owner: template.meta?.owner ?? null,
      size: 0,
    },
    compile(_context: any) {
      // Return 0 which will fail but with a clearer error
      console.warn(`Template "${moduleName}" was not properly compiled. This may be a build configuration issue.`);
      return 0;
    },
  };
}

// Adapt a template to have the required TemplateOk interface
function adaptTemplate(template: any): TemplateOk {
  const moduleName = template.moduleName ?? template.id ?? 'unknown-template';
  const isGxt = isGxtTemplate(template);

  const adapted = {
    ...template,
    result: 'ok' as const,
    moduleName,
    [GXT_TEMPLATE_SYMBOL]: isGxt,

    asLayout(): CompilableProgram {
      if (isGxt) {
        return createGxtCompilableProgram(template, moduleName);
      }
      return createFallbackCompilableProgram(template, moduleName);
    },

    asWrappedLayout(): CompilableProgram {
      if (isGxt) {
        return createGxtCompilableProgram(template, moduleName);
      }
      return createFallbackCompilableProgram(template, moduleName);
    },
  };

  return adapted as TemplateOk;
}

/**
 * @deprecated
 */
export function unwrapTemplate(template: Template): TemplateOk {
  if (!template) {
    throw new Error('Template is undefined or null');
  }

  // Check for error result
  if ((template as any).result === 'error') {
    const errTemplate = template as any;
    throw new Error(
      `Compile Error: ${errTemplate.problem} @ ${errTemplate.span?.start}..${errTemplate.span?.end}`
    );
  }

  // Check if template already has the required methods
  if (typeof (template as any).asLayout === 'function') {
    return template as TemplateOk;
  }

  // Template doesn't have asLayout - adapt it
  return adaptTemplate(template);
}
