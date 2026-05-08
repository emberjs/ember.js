import { readFileSync } from 'node:fs';
import eResolve from 'enhanced-resolve';

const resolve = eResolve.create.sync({ conditionNames: [] });

const manifestPath = resolve(process.cwd(), 'ember-source/package.json');

export function getRenamedModules() {
  let manifest = JSON.parse(readFileSync(manifestPath).toString());

  return Object.values(manifest['ember-addon']['renamed-modules']);
}
