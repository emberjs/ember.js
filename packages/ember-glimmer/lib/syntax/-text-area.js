import { wrapComponentClassAttribute } from '../utils/bindings';

export function textAreaMacro(path, params, hash, builder) {
  let definition = builder.env.getComponentDefinition(['-text-area'], builder.symbolTable);
  wrapComponentClassAttribute(hash);
  builder.component.static(definition, [params, hash, null, null], builder.symbolTable);
  return true;
}
