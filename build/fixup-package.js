#!/usr/bin/env node

const glob = require("glob");
const fs = require("fs");

let pkgs = glob.sync("packages/*/package.json");

pkgs.forEach(function(pkgPath) {
  let pkg = JSON.parse(fs.readFileSync(pkgPath));

  pkg.version = "0.5.0";
  pkg.main = "dist/commonjs/index.js";
  pkg.module = "dist/modules/index.js";
  pkg["jsnext:main"] = "dist/modules/index.js";
  pkg.typings = "dist/commonjs/index.d.ts";
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.build = "build/build.js";
  pkg.scripts.prepublish = "npm run build";
  pkg.files = ["dist"];

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
});