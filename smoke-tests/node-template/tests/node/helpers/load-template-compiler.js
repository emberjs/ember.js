export async function loadTemplateCompiler() {
  return import('ember-source/ember-template-compiler/index.js');
}
