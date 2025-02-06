import { precompile } from '@glimmer/ember/compiler';
import type { Nullable } from '@ember/-internals/utility-types';
import type { AST, ASTPlugin } from '@glimmer/ember/syntax';
import { AbstractTestCase } from 'internal-test-helpers';
import { compileOptions } from '../../index';

export default abstract class extends AbstractTestCase {
  assertTransformed(this: QUnit, before: string, after: string): void {
    this.assert.deepEqual(deloc(ast(before)), deloc(ast(after)));
  }
}

function ast(template: string): AST.Template {
  let program: Nullable<AST.Template> = null;

  function extractProgram(): ASTPlugin {
    return {
      name: 'extract-program',

      visitor: {
        Template: {
          exit(node: AST.Template): void {
            program = clone(node);
          },
        },
      },
    };
  }

  let options = compileOptions({
    moduleName: '-top-level',
  });

  if (options.plugins?.ast) {
    options.plugins.ast.push(extractProgram);
  }

  precompile(template, options as any);

  return program!;
}

function clone<T extends object>(node: T): T {
  let out = Object.create(null);
  let keys = Object.keys(node) as Array<keyof T>;

  keys.forEach((key) => {
    let value: unknown = node[key];

    if (value !== null && typeof value === 'object') {
      out[key] = clone(value);
    } else {
      out[key] = value;
    }
  });

  return out;
}

function deloc<T extends object, U extends { loc?: AST.SourceLocation }>(node: T & U): T {
  let out = Object.create(null);
  let keys = Object.keys(node) as Array<keyof T & U>;

  keys.forEach((key) => {
    let value = node[key];

    if (key === 'loc') {
      return;
    } else if (value !== null && typeof value === 'object') {
      out[key] = deloc(value);
    } else {
      out[key] = value;
    }
  });

  return out;
}
