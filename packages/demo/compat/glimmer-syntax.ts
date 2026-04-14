/**
 * Stub for @glimmer/syntax
 *
 * The ember-template-compiler has a fallback simple parser,
 * so this stub just exports null to make the import succeed.
 */

export const preprocess = null;
export const traverse = null;
export const print = null;
export const builders = null;

// Node helper for creating AST nodes - used by @glimmer/compiler
export function node(name?: string) {
  return {
    fields<Fields extends object>() {
      if (name !== undefined) {
        return class {
          readonly type = name;
          readonly loc: any;
          constructor(fields: Fields & { loc: any }) {
            Object.assign(this, fields);
          }
        };
      }
      return class {
        readonly loc: any;
        constructor(fields: Fields & { loc: any }) {
          Object.assign(this, fields);
        }
      };
    }
  };
}

// ASTv2 namespace - used by @glimmer/compiler
export const ASTv2 = {
  // Add stubs as needed
};

// ASTv1 types (for compatibility)
export const AST = {};

// Source span types
export class SourceSpan {
  constructor(public source: any, public startPosition: any, public endPosition: any) {}
}

// Syntax error class
export class GlimmerSyntaxError extends Error {
  constructor(message: string, public location: any) {
    super(message);
    this.name = 'GlimmerSyntaxError';
  }
}

// Other commonly needed exports
export const isKeyword = () => false;
export const isPath = () => false;
export const isStringLiteral = () => false;
