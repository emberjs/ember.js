import { RenderSyntax } from './syntax/render';
import { OutletSyntax } from './syntax/outlet';
import { MountSyntax } from './syntax/mount';
import { DynamicComponentSyntax } from './syntax/dynamic-component';
import { InputSyntax } from './syntax/input';
import {
  WithDynamicVarsSyntax,
  RenderPortalSyntax
} from 'glimmer-runtime';


let syntaxKeys = [];
let syntaxes = [];

export function registerSyntax(key, syntax) {
  syntaxKeys.push(key);
  syntaxes.push(syntax);
}

export function findSyntaxBuilder(key) {
  let index = syntaxKeys.indexOf(key);

  if (index > -1) {
    return syntaxes[index];
  }
}

registerSyntax('render', RenderSyntax);
registerSyntax('outlet', OutletSyntax);
registerSyntax('mount', MountSyntax);
registerSyntax('component', DynamicComponentSyntax);
registerSyntax('input', InputSyntax);

registerSyntax('-with-dynamic-vars', class {
  static create(environment, args, templates, symbolTable) {
    return new WithDynamicVarsSyntax({ args, templates });
  }
});

registerSyntax('-render-portal', class {
  static create(environment, args, templates, symbolTable) {
    return new RenderPortalSyntax({ args, templates });
  }
});
