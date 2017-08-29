#!/usr/bin/env node
"use strict";
const child_process = require("child_process");
const glimmerDeps = [];

addGlimmerPackageDeps(require("../package"), true);

function linkGlimmerDep(glimmerDep) {
  if (glimmerDeps.indexOf(glimmerDep) === -1) {
    glimmerDeps.push(glimmerDep);
    console.log(glimmerDep);
    child_process.execSync(`yarn link "${glimmerDep}"`);
    addGlimmerPackageDeps(require(`${glimmerDep}/package`), false);
  }
}

function addGlimmerDeps(dependencies) {
  if (!dependencies) return;
  Object.keys(dependencies).forEach(dep => {
    if (dep.lastIndexOf("@glimmer", 0) === 0) {
      linkGlimmerDep(dep);
    }
  });
}

function addGlimmerPackageDeps(packageJson, dev) {
  addGlimmerDeps(packageJson["dependencies"]);
  if (dev) {
    addGlimmerDeps(packageJson["devDependencies"]);
  }
}
