#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [appDir, targetDir] = process.argv.slice(2);

if (!appDir || !targetDir) {
  console.error("Usage: update-smoke-test-template.sh <appDir> <targetDir>");
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

const resolvedAppDir = path.resolve(appDir);
const resolvedTargetDir = path.resolve(targetDir);

fs.rmSync(path.join(resolvedAppDir, ".ember-cli"), { force: true });

const pkgPath = path.join(resolvedAppDir, "package.json");
const pkg = readJson(pkgPath);
pkg.scripts = pkg.scripts || {};
pkg.scripts.test = "ember test";

if (pkg.devDependencies && pkg.devDependencies["@glimmer/component"]) {
  pkg.devDependencies["@glimmer/component"] = "workspace:^";
} else if (pkg.dependencies && pkg.dependencies["@glimmer/component"]) {
  pkg.dependencies["@glimmer/component"] = "workspace:^";
} else {
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.devDependencies["@glimmer/component"] = "workspace:^";
}

if (pkg.devDependencies && pkg.devDependencies["ember-source"]) {
  pkg.devDependencies["ember-source"] = "workspace:*";
}

writeJson(pkgPath, pkg);

const envPath = path.join(resolvedAppDir, "config", "environment.js");
const source = fs.readFileSync(envPath, "utf8");
if (!source.includes("_OVERRIDE_DEPRECATION_VERSION")) {
  const block = [
    "/* The following enables the infrastructure allow us to test as if deprecations",
    "  have been turned into errors at a specific version.",
    "*/",
    "_OVERRIDE_DEPRECATION_VERSION: process.env.OVERRIDE_DEPRECATION_VERSION,"
  ];
  const updated = source.replace(
    /EmberENV:\s*\{\s*\n([ \t]*)/,
    (match, indent) => {
      const pad = `${indent}  `;
      const injected = block.map((line) => pad + line).join("\n");
      return match + injected + "\n" + indent;
    }
  );
  if (updated === source) {
    throw new Error("Failed to locate EmberENV block for injection.");
  }
  fs.writeFileSync(envPath, updated);
}

fs.rmSync(resolvedTargetDir, { recursive: true, force: true });
fs.renameSync(resolvedAppDir, resolvedTargetDir);
