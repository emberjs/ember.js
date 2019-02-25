'use strict';

const fs = require('fs');
const path = require('path');
const resolve = require('resolve');

const paths = {};
const absolutePaths = {};

function add(paths, name, path) {
  Object.defineProperty(paths, name, {
    configurable: false,
    get: function() {
      return path;
    },
  });
}

add(paths, 'prod', 'vendor/ember/ember.prod.js');
add(paths, 'debug', 'vendor/ember/ember.debug.js');
add(paths, 'testing', 'vendor/ember/ember-testing.js');
add(paths, 'jquery', 'vendor/ember/jquery/jquery.js');

add(
  absolutePaths,
  'templateCompiler',
  path.join(__dirname, '..', 'dist', 'ember-template-compiler.js')
);

module.exports = {
  init: function() {
    this._super.init && this._super.init.apply(this, arguments);

    if ('ember' in this.project.bowerDependencies()) {
      // TODO: move this to a throw soon.
      this.ui.writeWarnLine(
        'Ember.js is now provided by node_module `ember-source`, please remove it from bower'
      );
    }

    // resets `this.root` to the correct location by default ember-cli
    // considers `__dirname` here to be the root, but since our main entry
    // point is within a subfolder we need to correct that
    this.root = path.join(__dirname, '..');
  },

  name: 'ember-source',
  paths: paths,
  absolutePaths: absolutePaths,

  treeForVendor: function() {
    let Funnel = require('broccoli-funnel');
    let MergeTrees = require('broccoli-merge-trees');

    let jqueryPath;
    try {
      jqueryPath = path.dirname(
        resolve.sync('jquery/package.json', { basedir: this.project.root })
      );
    } catch (error) {
      jqueryPath = path.dirname(require.resolve('jquery/package.json'));
    }

    let jquery = new Funnel(jqueryPath + '/dist', {
      destDir: 'ember/jquery',
      files: ['jquery.js'],
    });

    let emberSourceDistPath = path.join(__dirname, '..', 'dist');

    let emberCliBabel = this.addons.find(a => a.name === 'ember-cli-babel');
    let needsLegacyBuild = [
      'transform-template-literals',
      'transform-literals',
      'transform-arrow-functions',
      'transform-destructuring',
      'transform-spread',
      'transform-parameters',
      'transform-computed-properties',
      'transform-shorthand-properties',
      'transform-block-scoping',
    ].some(p => emberCliBabel.isPluginRequired(p));

    if (needsLegacyBuild) {
      emberSourceDistPath = path.join(emberSourceDistPath, 'legacy');
    }

    let emberFiles = [
      'ember-template-compiler.js',
      'ember-testing.js',
      'ember.debug.js',
      'ember.min.js',
      'ember.prod.js',
    ]
      .map(function(file) {
        return [file, file.replace('.js', '.map')];
      })
      .reduce(function(flat, jsAndMap) {
        return flat.concat(jsAndMap);
      }, [])
      .filter(function(file) {
        let fullPath = path.join(emberSourceDistPath, file);

        return fs.existsSync(fullPath);
      });

    let ember = new Funnel(emberSourceDistPath, {
      destDir: 'ember',
      files: emberFiles,
    });

    return new MergeTrees([ember, jquery]);
  },
};
