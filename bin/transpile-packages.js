#!/usr/bin/env node

var Compiler = require('es6-module-transpiler').Compiler;
var fs = require('fs');
var path = require('path');
var glob = require('glob');


function ES6Package(packageName, dependencies){
  this.packageName = packageName;
  this.dependencies = dependencies;
  this.inputPath   = path.join('packages_es6', packageName);
  this.outputPath  = path.join('packages', packageName);
  this.independentModulePath = 'dist/modules';
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
        moduleName = path.join(this.packageName, isTest ? 'tests' : '', dirname, basenameNoExt),
        compiler, output;

    if (moduleName === path.join(this.packageName, 'main')) {
      moduleName = this.packageName;
    }

    try {
      compiler = new Compiler(fs.readFileSync(filename), moduleName);
      output = compiler.toAMD();
    } catch (e) {
      console.log('An error was raised while compiling "' + filename + '".');
      console.log('   ' + e.message);
      process.exit(1);
    }

    var modulePath = path.join(this.independentModulePath, this.packageName, dirname);
    this.mkdirp(modulePath);
    fs.writeFileSync(path.join(modulePath, path.basename(filename)), output);

    return {name: moduleName, compiled: output};
  },

  processLib: function(){
    this.compileDirectory(path.join(this.inputPath, 'lib'), function(results){
      var output = results['compiled'];

      this.dependencies.forEach(function(dependency) {
        if (!dependency.match(/~tests/)) {
          output.unshift('require("' + dependency + '");');
        }
      });

      this.mkdirp(path.join(this.outputPath,'lib'));
      fs.writeFileSync(path.join(this.outputPath, 'lib', 'main.js'), output.join('\n'));
    }.bind(this))
  },

  processTests: function(){
    this.compileDirectory(path.join(this.inputPath, 'tests'), function(results){
      var compiledOutput = results['compiled'],
          moduleNames = results['moduleNames'],
          requireOutput = [],
          output;

      this.mkdirp(path.join(this.outputPath,'tests'));
      fs.writeFileSync(path.join(this.outputPath, 'tests', this.packageName + '.js'), compiledOutput.join('\n'));

      this.dependencies.forEach(function(dependency) {
        if (dependency.match(/~tests/)) {
          requireOutput.push('require("' + dependency + '");');
        }
      });

      requireOutput.push('require("' + this.packageName + '/~tests/' + this.packageName + '");');


      moduleNames.forEach(function(name) {
        if (name.match(/_test/)) {
          requireOutput.push('requireModule("'+name+'");');
        }
      });

      fs.writeFileSync(path.join(this.outputPath, 'tests', this.packageName + '_test.js'), requireOutput.join('\n'));
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

// List the test dependencies for each package below
// this is only for tests because, in actual builds
// we do not need to use minispade.require to ensure
// that the other packages are setup first.
var packages = {
  'container': [],
  'ember-metal': [],
  'ember-debug': [],
  'ember-runtime': ['container', 'rsvp', 'ember-metal', 'ember-metal/~tests/ember-metal'],
  'ember-views': ['ember-runtime'],
  'ember-extension-support': ['ember-application'],
  'ember-testing': ['ember-application', 'ember-routing'],
  'ember-handlebars-compiler': ['ember-views'],
  'ember-handlebars': ['metamorph', 'ember-views', 'ember-handlebars-compiler', 'ember-metal/~tests/ember-metal'],
  'ember-routing': ['ember-runtime', 'ember-views', 'ember-handlebars'],
  'ember-application': ['ember-extension-support', 'ember-routing']
};


Object.keys(packages).forEach(function (packageName) {
  pkg = new ES6Package(packageName, packages[packageName]);
  pkg.process();
});
