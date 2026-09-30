import { precompile } from '/Users/edward/hacking/ember.js/dist/dev/packages/ember-template-compiler/index.js';
for (const src of process.argv.slice(2)) {
  try { console.log(src, '=>', precompile(src, {moduleName:'x.hbs'})); } catch (e) { console.log(src, 'ERR', e.message); }
}
