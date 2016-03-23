var fs = require('fs');
var featuresJson = fs.readFileSync('./features.json', { encoding: 'utf8' });
var features = JSON.parse(featuresJson).features;

var packages = {
  'container':                  {trees: null,  requirements: []},
  'ember-metal':                {trees: null,  vendorRequirements: ['backburner']},
  'ember-metal-views':          {trees: null,  vendorRequirements: ['dom-helper', 'morph-range', 'morph-attr']},
  'ember-debug':                {trees: null,  requirements: ['ember-metal'], testing: true},
  'ember-runtime':              {trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-metal']},
  'ember-views':                {trees: null,  requirements: ['ember-runtime', 'ember-metal-views']},
  'ember-extension-support':    {trees: null,  requirements: ['ember-application']},
  'ember-testing':              {trees: null,  requirements: ['ember-application', 'ember-routing'], testing: true},
  'ember-template-compiler':    {trees: null,  requirements: ['ember-metal'], vendorRequirements: ['htmlbars-runtime'], templateCompilerVendor: ['simple-html-tokenizer', 'morph-range', 'htmlbars-runtime', 'htmlbars-util', 'htmlbars-compiler', 'htmlbars-syntax', 'htmlbars-test-helpers', 'backburner']},
  'ember-htmlbars':             {trees: null,  vendorRequirements: ['htmlbars-util', 'htmlbars-runtime'], requirements: ['ember-metal-views'], testingVendorRequirements: [ 'htmlbars-test-helpers'], hasTemplates: true},
  'ember-routing':              {trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                               requirements: ['ember-runtime', 'ember-views']},
  'ember-routing-htmlbars':     {trees: null,  requirements: ['ember-routing', 'ember-htmlbars']},
  'ember-routing-views':        {trees: null,  requirements: ['ember-routing']},
  'ember-application':          {trees: null,  vendorRequirements: ['dag-map'], requirements: ['ember-routing']},
  'ember':                      {trees: null,  requirements: ['ember-application']}
};

var glimmerStatus = features['ember-glimmer'];
if (glimmerStatus === null || glimmerStatus === true) {
  packages['ember-glimmer'] = {
    trees: null,
    requirements: ['ember-metal'],
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
      'glimmer-engine-tests'
    ],
    hasTemplates: true
  };

  var templateCompiler = packages['ember-template-compiler'];
  templateCompiler.templateCompilerVendor.push('glimmer-syntax');
  templateCompiler.templateCompilerVendor.push('glimmer-util');
  templateCompiler.templateCompilerVendor.push('glimmer-compiler');
  templateCompiler.templateCompilerVendor.push('handlebars');
}

module.exports = packages;
