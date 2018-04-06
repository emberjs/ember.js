'use strict';

/*
[
  {
    "global": "Ember.Application",
    "module": "@ember/application",
    "export": "default",
    "localName": "Application",
    "deprecated": false
  },
  {
    "global": "Ember.ApplicationInstance",
    "module": "@ember/application/instance",
    "export": "default",
    "localName": "ApplicationInstance",
    "deprecated": false
  },
  {
    "global": "Ember.Engine",
    "module": "@ember/engine",
    "export": "default",
    "localName": "Engine",
    "deprecated": false
  },
  {
    "global": "Ember.EngineInstance",
    "module": "@ember/engine/instance",
    "export": "default",
    "localName": "EngineInstance",
    "deprecated": false
  },
*/
const mappings = require('ember-rfc176-data');
const fs = require('fs-extra');
const path = require('path');

let moduleNames = new Set(mappings.filter(m => !m.deprecated).map(m => m.module));

moduleNames.forEach(moduleName => {
  let contents = '';
  mappings.filter(m => m.module === moduleName).forEach(m => {
    if (m.export === 'default') {
      contents += `export default ${m.global};\n`;
    } else {
      contents += `export const ${m.export} = ${m.global};\n`;
    }
  });
  let modulePath = path.join(__dirname, 'packages', moduleName);

  fs.outputFileSync(modulePath + '.js', contents);
});
