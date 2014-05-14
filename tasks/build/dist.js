var pickFiles = require('broccoli-static-compiler');
var moveFile = require('broccoli-file-mover');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var uglify = require('broccoli-uglify-js');

var path = require('path');
var pkg = require(path.join(__dirname, '../../package.json'));

var lib = 'lib';

// Named and concatenated AMD

var transpiledAMD = transpileES6(lib, { moduleName: true });

var namedAMD = concatFiles(transpiledAMD, {
  inputFiles: ['**/*.js'],
  outputFile: '/htmlbars.amd.js'
});

// Add package version to filename

var fullNameDist = moveFile(namedAMD, {
  srcFile: 'htmlbars.amd.js',
  destFile: 'htmlbars-' + pkg.version + '.amd.js'
});

// Uglify

var uglifiedDist = uglify(moveFile(namedAMD, {
  srcFile: 'htmlbars.amd.js',
  destFile: 'htmlbars-' + pkg.version + '.amd.min.js'
}));

module.exports = mergeTrees([fullNameDist, uglifiedDist]);
