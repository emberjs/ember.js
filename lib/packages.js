var fs = require('fs');
var featuresJson = fs.readFileSync('./features.json', { encoding: 'utf8' });
var features = JSON.parse(featuresJson).features;

var packages = {
  'container':                  { trees: null,  requirements: [] },
  'ember-environment':          { trees: null,  requirements: [], skipTests: true },
  'ember-console':              { trees: null,  requirements: [], skipTests: true },
  'ember-metal':                { trees: null,  requirements: ['ember-environment'], vendorRequirements: ['backburner'] },
  'ember-debug':                { trees: null,  requirements: ['ember-metal'], testing: true },
  'ember-runtime':              { trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-environment', 'ember-console', 'ember-metal'] },
  'ember-views':                { trees: null,  requirements: ['ember-runtime'] },
  'ember-extension-support':    { trees: null,  requirements: ['ember-application'] },
  'ember-testing':              { trees: null,  requirements: ['ember-application', 'ember-routing'], testing: true },
  'ember-template-compiler': {
    trees: null,
    requirements: ['ember-metal', 'ember-environment', 'ember-console', 'ember-htmlbars-template-compiler'],
    templateCompilerVendor: ['simple-html-tokenizer']
  },
  'ember-htmlbars-template-compiler': {
    trees: null,
    requirements: [],
    vendorRequirements: ['htmlbars-runtime'],
    templateCompilerVendor: ['htmlbars-runtime', 'htmlbars-util', 'htmlbars-compiler', 'htmlbars-syntax', 'htmlbars-test-helpers', 'morph-range', 'backburner']
  },
  'ember-htmlbars':             {
                                  trees: null,
                                  vendorRequirements: ['dom-helper', 'morph-range', 'morph-attr', 'htmlbars-util', 'htmlbars-runtime'],
                                  requirements: ['ember-routing', 'ember-metal'],
                                  testingVendorRequirements: ['htmlbars-test-helpers'],
                                  hasTemplates: true
                                },
  'ember-templates':            { trees: null,  requirements: ['ember-metal', 'ember-environment'] },
  'ember-routing':              { trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                               requirements: ['ember-runtime', 'ember-views'] },
  'ember-application':          { trees: null,  vendorRequirements: ['dag-map'], requirements: ['ember-routing'] },
  'ember':                      { trees: null,  requirements: ['ember-application'] },
  'internal-test-helpers':      { trees: null }
};

var glimmerStatus = features['ember-glimmer'];
if (glimmerStatus === null || glimmerStatus === true) {
  packages['ember-glimmer'] = {
    trees: null,
    requirements: ['container', 'ember-metal', 'ember-routing'],
    hasTemplates: true,
    vendorRequirements: [
      'glimmer',
      'glimmer-runtime',
      'glimmer-reference',
      'glimmer-util',
      'glimmer-wire-format'
    ],
    testingVendorRequirements: []
  };

  packages['ember-glimmer-template-compiler'] = {
    trees: null,
    requirements: [],
    templateCompilerVendor: [
      'glimmer-wire-format',
      'glimmer-syntax',
      'glimmer-util',
      'glimmer-compiler',
      'glimmer-reference',
      'glimmer-runtime',
      'handlebars'
    ]
  };

  packages['ember-template-compiler'].requirements.push('ember-glimmer-template-compiler');
}

module.exports = packages;
