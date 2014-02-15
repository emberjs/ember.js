#!/usr/bin/env node

var Compiler = require('es6-module-transpiler').Compiler;
var fs = require('fs');
var path = require('path');
var glob = require('glob');


function ES6Package(packageName){
  this.packageName = packageName;
  this.inputPath   = path.join('packages_es6', packageName);
  this.outputPath  = path.join('packages', packageName);
}

ES6Package.prototype = {
  compileDirectory: function(directory, callback){
    var compiledOutput = [];
    var moduleNames  = [];

    glob(directory + '/**/*', function(err, files){
      files.forEach(function(filename){
        var stats = fs.statSync(filename), result;
        if (stats.isDirectory()) { return; }

        if (filename.match(/\.amd\.js$/)){
          result = fs.readFileSync(filename);
          compiledOutput.push(result);
        } else {
          result = this.compileFile(directory, filename);
          compiledOutput.push(result['compiled']);
          moduleNames.push(result['name']);
        }

      }.bind(this));

      callback({compiled: compiledOutput, moduleNames: moduleNames});
    }.bind(this));
  },

  compileFile: function(basePath, filename){
    var ext = path.extname(filename),
        basenameNoExt = path.basename(filename, ext),
        dirname = path.dirname(filename.replace(basePath +'/', '')),
        isTest  = basePath.match(/\/tests$/),
        moduleName = path.join(this.packageName, isTest ? 'tests' : '', dirname, basenameNoExt);

    if (moduleName === path.join(this.packageName, 'main')) {
      moduleName = this.packageName;
    }

    var compiler = new Compiler(fs.readFileSync(filename), moduleName);
    return {name: moduleName, compiled: compiler.toAMD()};
  },

  processLib: function(){
    this.compileDirectory(path.join(this.inputPath, 'lib'), function(results){
      var output = results['compiled'];

      this.mkdirp(path.join(this.outputPath,'lib'));
      fs.writeFileSync(path.join(this.outputPath, 'lib', 'main.js'), output.join('\n'));
    }.bind(this))
  },

  processTests: function(){
    this.compileDirectory(path.join(this.inputPath, 'tests'), function(results){
      var compiledOutput = results['compiled'],
          moduleNames = results['moduleNames'],
          requireOutput = ['require("container");', 'require("ember-metal");'],
          output;

      moduleNames.forEach(function(name) {
        if (name.match(/_test/)) {
          requireOutput.push('requireModule("'+name+'");');
        }
      });

      this.mkdirp(path.join(this.outputPath,'tests'));

      output = compiledOutput.join('\n') + '\n\n' + requireOutput.join('\n');
      fs.writeFileSync(path.join(this.outputPath, 'tests', this.packageName + '_test.js'), output);
    }.bind(this))
  },

  mkdirp: function(directory) {
    var prefix;
    if (fs.existsSync(directory)) {
      return;
    }
    prefix = path.dirname(directory);
    if (prefix !== '.' && prefix !== '/') {
      this.mkdirp(prefix);
    }
    return fs.mkdirSync(directory);
  },

  process: function(){
    this.processLib();
    this.processTests();
  }
};


['container', 'ember-metal'].forEach(function(packageName) {
  pkg = new ES6Package(packageName);
  pkg.process();
});
