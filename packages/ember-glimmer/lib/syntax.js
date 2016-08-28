import { RenderSyntax } from './syntax/render';
import { OutletSyntax } from './syntax/outlet';
import { MountSyntax } from './syntax/mount';
import { DynamicComponentSyntax } from './syntax/dynamic-component';

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

registerSyntax('render', function(options) {
  return new RenderSyntax(options);
});

registerSyntax('outlet', function(options) {
  return new OutletSyntax(options);
});

registerSyntax('mount', function(options) {
  return MountSyntax.create(options);
});

registerSyntax('component', function(options) {
  return DynamicComponentSyntax.create(options);
});
