module.exports = function(features) {
  var packages = {
    'container':                  { trees: null,  requirements: ['ember-utils'], isTypeScript: true, vendorRequirements: ['@glimmer/di'] },
    'ember-environment':          { trees: null,  requirements: [], skipTests: true },
    'ember-utils':                { trees: null,  requirements: [] },
    'ember-console':              { trees: null,  requirements: [], skipTests: true },
    'ember-metal':                { trees: null,  requirements: ['ember-environment', 'ember-utils'], vendorRequirements: ['backburner'] },
    'ember-debug':                { trees: null,  requirements: ['ember-metal'], testing: true },
    'ember-runtime':              { trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-environment', 'ember-console', 'ember-metal'] },
    'ember-views':                { trees: null,  requirements: ['ember-runtime'] },
    'ember-extension-support':    { trees: null,  requirements: ['ember-application'] },
    'ember-testing':              { trees: null,  requirements: ['ember-application', 'ember-routing'], testing: true },
    'ember-template-compiler': {
      trees: null,
      templateCompilerOnly: true,
      requirements: ['container', 'ember-metal', 'ember-environment', 'ember-console'],
      templateCompilerVendor: [
        'simple-html-tokenizer',
        'backburner',
        '@glimmer/wire-format',
        '@glimmer/syntax',
        '@glimmer/util',
        '@glimmer/compiler',
        '@glimmer/reference',
        '@glimmer/runtime',
        'handlebars'
      ]
    },
    'ember-routing':              { trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                    requirements: ['ember-runtime', 'ember-views'] },
    'ember-application':          { trees: null,  vendorRequirements: ['dag-map'], requirements: ['ember-routing'] },
    'ember':                      { trees: null,  requirements: ['ember-application'] },
    'internal-test-helpers':      { trees: null },

    'ember-glimmer':              {
      trees: null,
      requirements: ['container', 'ember-metal', 'ember-routing' ],
      hasTemplates: true,
      vendorRequirements: [
        '@glimmer/runtime',
        '@glimmer/reference',
        '@glimmer/util',
        '@glimmer/wire-format',
        '@glimmer/node'
      ],
      testingVendorRequirements: []
    }
  };

  return packages;
}
