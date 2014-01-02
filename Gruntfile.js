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
                     'concat_sourcemap:amd',
                     'fixSourceMap:amd',
                     'concat:library',
                     'concat:browser',
                     'browser:dist',
                     'bytes'
                    ]);

  this.registerTask('tests', "Builds the test package",
                    ['build',
                     'concat:deps',
                     'transpile:tests',
                     'concat_sourcemap:tests',
                     'fixSourceMap:tests'
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
        type: "amd",
        moduleName: function (moduleName) {
          moduleName = moduleName.replace(/^vendor\//, '');
          return moduleName;
        },
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/'
        }]
      },

      tests: {
        type: 'amd',
        files: [{
          expand: true,
          cwd: 'test/',
          src: ['test_helpers.js', 'tests.js', 'tests/**/*_test.js'],
          dest: 'tmp/'
        }]
      }
    },

    concat_sourcemap: {
      amd: {
        files: [{
          src: ['tmp/htmlbars.js', 'tmp/htmlbars/**/*.js', 'tmp/vendor/*.js'],
          dest: 'tmp/htmlbars.amd.js'
        }]
      },
      tests: {
        files: [{
          src: ['tmp/tests/*.js'],
          dest: 'tmp/tests.amd.js'
        }]
      }
    },

    fixSourceMap: {
      amd: {
        files: {
          'tmp/htmlbars.amd.js.map': 'tmp/htmlbars.amd.js.map'
        }
      },
      tests: {
        files: {
          'tmp/tests.amd.js.map': 'tmp/tests.amd.js.map'
        }
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
        src: [
          'vendor/loader.js',
          'vendor/handlebars.amd.js',
          'tmp/' + barename + '.amd.js'
        ],
        dest: 'tmp/' + barename + '.browser1.js'
      }
    },

    browser: {
      dist: {
        src: 'tmp/' + barename + '.browser1.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
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
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-concat-sourcemap');

  // Multi-task for wrapping browser version

  this.registerTask('bytes', function() {
    console.log("TODO: Add a bytes-tracking task");
  });

  this.registerMultiTask('browser', "Export the object in " + name + " to the window", function() {
    this.files.forEach(function(f) {
      var output = ["(function(global) {"];

      output.push.apply(output, f.src.map(grunt.file.read));

      output.push('global.' + barename + ' = requireModule("' + barename + '");');
      output.push('})(global || window);');

      grunt.file.write(f.dest, output.join("\n"));
    });
  });

  this.registerMultiTask('fixSourceMap', "Remove tmp from source paths", function() {
    this.files.forEach(function(f) {
      f.src.forEach(function (src) {
        map = JSON.parse(grunt.file.read(src));
        for (var i=0; i<map.sources.length; i++) {
          map.sources[i] = map.sources[i].replace(/tmp\//,'');
        }
        grunt.file.write(f.dest, JSON.stringify(map));
      });
    });
  });
};
