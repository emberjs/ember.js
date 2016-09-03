import { assert } from 'ember-metal';
import { CurlyComponentSyntax } from './curly-component';
import { DynamicComponentSyntax } from './dynamic-component';
import { wrapComponentClassAttribute } from '../utils/bindings';

function buildTextFieldSyntax(args, templates, getDefinition, symbolTable) {
  let definition = getDefinition('-text-field');
  wrapComponentClassAttribute(args);
  return new CurlyComponentSyntax(args, definition, templates, symbolTable);
}

export const InputSyntax = {
  create(environment, args, templates, symbolTable) {
    let getDefinition = (path) => environment.getComponentDefinition([path], symbolTable);

    if (args.named.has('type')) {
      let typeArg = args.named.at('type');
      if (typeArg.type === 'value') {
        if (typeArg.value === 'checkbox') {
          assert(
            '{{input type=\'checkbox\'}} does not support setting `value=someBooleanValue`; ' +
              'you must use `checked=someBooleanValue` instead.',
            !args.named.has('value')
          );

          wrapComponentClassAttribute(args);
          let definition = getDefinition('-checkbox');
          return new CurlyComponentSyntax(args, definition, templates, symbolTable);
        } else {
          return buildTextFieldSyntax(args, templates, getDefinition, symbolTable);
        }
      }
    } else {
      return buildTextFieldSyntax(args, templates, getDefinition, symbolTable);
    }

    return DynamicComponentSyntax.create(environment, args, templates, symbolTable);
  }
};
