module.exports = function(grunt) {
  var name = 'htmlbars';
  var barename = 'htmlbars';

  // Alias tasks for the most common sets of tasks.
  // Most of the time, you will use these.

  // By default, (i.e., if you invoke `grunt` without arguments), do
  // a new build.
  this.registerTask('default', ['test']);

  // Build a new version of the library
  this.registerTask('build', "Builds a distributable version of " + name,
                    ['clean',
                     'transpile:amd',
                     'concat:library',
                     'concat:browser',
                     'browser:dist',
                     'bytes'
                    ]);

  this.registerTask('tests', "Builds the test package",
                    ['build',
                     'concat:deps',
                     'transpile:tests',
                     'buildTests:dist'
                    ]);

  // Run a server. This is ideal for running the QUnit tests in the browser.
  this.registerTask('server', ['build', 'tests', 'connect', 'watch']);

  this.registerTask('test', ['build', 'tests', 'qunit']);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {},

      options: {
        hostname: '0.0.0.0',
        port: grunt.option('port') || 8000,
        base: '.'
      }
    },

    watch: {
      files: ['lib/**', 'vendor/*', 'test/**/*'],
      tasks: ['build', 'tests']
    },

    transpile: {
      amd: {
        options: {
          name: barename,
          format: 'amd'
        },

        src: ["lib/" + barename + ".js", "lib/*/**/*.js"],
        dest: "tmp/" + barename + ".amd.js"
      },

      tests: {
        options: {
          name: barename,
          format: 'amd'
        },

        src: ['test/test_helpers.js', 'test/tests.js', 'test/tests/**/*_test.js'],
        dest: 'tmp/tests.amd.js'
      }
    },

    clean: ["dist"],

    concat: {
      library: {
        src: ['tmp/' + barename + '.amd.js'],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js'
      },

      deps: {
        src: ['vendor/deps/*.js'],
        dest: 'tmp/deps.amd.js'
      },

      browser: {
        src: ['vendor/loader.js', 'tmp/' + barename + '.amd.js'],
        dest: 'tmp/' + barename + '.browser1.js'
      }
    },

    browser: {
      dist: {
        src: 'tmp/' + barename + '.browser1.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    buildTests: {
      dist: {
        src: [
          'vendor/loader.js',
          'tmp/tests.amd.js',
          'tmp/deps.amd.js',
          'tmp/' + barename + '.amd.js'
        ],
        dest: 'tmp/tests.js'
      }
    },

    qunit: {
      all: ['test/index.html']
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-qunit');

  // Multi-task for wrapping browser version

  this.registerTask('bytes', function() {
    console.log("TODO: Add a bytes-tracking task");
  });

  this.registerMultiTask('browser', "Export the object in " + name + " to the window", function() {
    this.files.forEach(function(f) {
      var output = ["(function(globals) {"];

      output.push.apply(output, f.src.map(grunt.file.read));

      output.push('window.' + barename + ' = requireModule("' + barename + '");');
      output.push('})(window);');

      grunt.file.write(f.dest, output.join("\n"));
    });
  });

  this.registerMultiTask('buildTests', "Execute the tests", function() {
    var testFiles = grunt.file.expand('test/tests/**/*_test.js');

    this.files.forEach(function(f) {
      var output = ["(function(globals) {"];

      output.push.apply(output, f.src.map(grunt.file.read));

      testFiles.forEach(function(file) {
        var moduleName = nameFor(file);
        output.push('requireModule("' + moduleName + '");');
      });

      output.push('})(window);');

      grunt.file.write(f.dest, output.join("\n"));
    });
  });

  // Multi-task for es6-module-transpiler
  function nameFor(path) {
    console.log(path);
    return path.match(/^(?:lib\/vendor|lib|test|test\/tests)\/(.*)\.js$/)[1];
  }

  this.registerMultiTask('transpile', "Transpile ES6 modules into AMD, CJS or globals", function() {
    var Compiler = require("es6-module-transpiler-rewrite").Compiler;

    var options = this.options({
      format: 'amd'
    });

    this.files.forEach(function(f) {
      var contents = f.src.map(function(path) {
        var compiler = new Compiler(grunt.file.read(path), nameFor(path), options);
        var format;

        switch (options.format) {
          case 'amd':
            console.log("Compiling " + path + " to AMD");
            format = compiler.toAMD;
            break;
          case 'globals':
            format = compiler.toGlobals;
            break;
          case 'commonjs':
            format = compiler.toCJS;
            break;
        }
        return format.call(compiler);
      });

      grunt.file.write(f.dest, contents.join("\n\n"));
    });
  });


};
