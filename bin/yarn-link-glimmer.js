#!/usr/bin/env node
"use strict";
const child_process = require("child_process");
const glimmerDeps = [];

addGlimmerPackageDeps(require("../package"), true);

glimmerDeps.forEach(dep => {
  console.log(dep);
  child_process.execSync(`yarn link "${dep}"`);
});

function addGlimmerDep(glimmerDep) {
  if (glimmerDeps.indexOf(glimmerDep) === -1) {
    glimmerDeps.push(glimmerDep);
    addGlimmerPackageDeps(require(`${glimmerDep}/package`), false);
  }
}

function addGlimmerDeps(dependencies) {
  if (!dependencies) return;
  Object.keys(dependencies).forEach(dep => {
    if (dep.lastIndexOf("@glimmer", 0) === 0) {
      addGlimmerDep(dep);
    }
  });
}

function addGlimmerPackageDeps(packageJson, dev) {
  addGlimmerDeps(packageJson["dependencies"]);
  if (dev) {
    addGlimmerDeps(packageJson["devDependencies"]);
  }
}
