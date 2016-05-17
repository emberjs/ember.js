var fs = require('fs');
var featuresJson = fs.readFileSync('./features.json', { encoding: 'utf8' });
var features = JSON.parse(featuresJson).features;

var packages = {
  'container':                  {trees: null,  requirements: []},
  'ember-environment':          {trees: null,  requirements: [], skipTests: true},
  'ember-console':              {trees: null,  requirements: [], skipTests: true},
  'ember-metal':                {trees: null,  requirements: ['ember-environment'], vendorRequirements: ['backburner']},
  'ember-debug':                {trees: null,  requirements: ['ember-metal'], testing: true},
  'ember-runtime':              {trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-environment', 'ember-console', 'ember-metal']},
  'ember-views':                {trees: null,  requirements: ['ember-runtime']},
  'ember-extension-support':    {trees: null,  requirements: ['ember-application']},
  'ember-testing':              {trees: null,  requirements: ['ember-application', 'ember-routing'], testing: true},
  'ember-template-compiler':    {trees: null,  requirements: ['ember-metal', 'ember-environment', 'ember-console'], vendorRequirements: ['htmlbars-runtime'], templateCompilerVendor: ['simple-html-tokenizer', 'morph-range', 'htmlbars-runtime', 'htmlbars-util', 'htmlbars-compiler', 'htmlbars-syntax', 'htmlbars-test-helpers', 'backburner']},
  'ember-htmlbars':             {
                                  trees: null,
                                  vendorRequirements: ['dom-helper', 'morph-range', 'morph-attr', 'htmlbars-util', 'htmlbars-runtime'],
                                  requirements: ['ember-routing', 'ember-metal'],
                                  testingVendorRequirements: [ 'htmlbars-test-helpers'],
                                  hasTemplates: true
                                },
  'ember-templates':            {trees: null,  requirements: ['ember-metal', 'ember-environment']},
  'ember-routing':              {trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                               requirements: ['ember-runtime', 'ember-views']},
  'ember-routing-htmlbars':     {trees: null,  requirements: ['ember-routing', 'ember-htmlbars']},
  'ember-application':          {trees: null,  vendorRequirements: ['dag-map'], requirements: ['ember-routing']},
  'ember':                      {trees: null,  requirements: ['ember-application']}
};

var glimmerStatus = features['ember-glimmer'];
if (glimmerStatus === null || glimmerStatus === true) {
  packages['ember-glimmer'] = {
    trees: null,
    requirements: ['ember-metal', 'ember-routing'],
    hasTemplates: true,
    vendorRequirements: [
      'glimmer',
      'glimmer-runtime',
      'glimmer-reference',
      'glimmer-util',
      'glimmer-wire-format'
    ],
    testingVendorRequirements: [
      'glimmer-object',
      'glimmer-object-reference',
      'glimmer-engine-tests'
    ],
    hasTemplates: true
  };

  var templateCompiler = packages['ember-template-compiler'];
  templateCompiler.templateCompilerVendor.push('glimmer-wire-format');
  templateCompiler.templateCompilerVendor.push('glimmer-syntax');
  templateCompiler.templateCompilerVendor.push('glimmer-util');
  templateCompiler.templateCompilerVendor.push('glimmer-compiler');
  templateCompiler.templateCompilerVendor.push('glimmer-reference');
  templateCompiler.templateCompilerVendor.push('glimmer-runtime');
  templateCompiler.templateCompilerVendor.push('handlebars');
}

module.exports = packages;
