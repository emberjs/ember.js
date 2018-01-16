module.exports = function() {
  var packages = {
    'container':                  { trees: null,  requirements: ['ember-utils'], isTypeScript: true, vendorRequirements: ['@glimmer/di'], requiresJQuery: false },
    'ember-environment':          { trees: null,  requirements: [], skipTests: true, requiresJQuery: false },
    'ember-utils':                { trees: null,  requirements: [], requiresJQuery: false },
    'ember-console':              { trees: null,  requirements: [], skipTests: true, requiresJQuery: false },
    'ember-metal':                { trees: null,  requirements: ['ember-environment', 'ember-utils'], vendorRequirements: ['backburner'], requiresJQuery: false },
    'ember-debug':                { trees: null,  requirements: [], requiresJQuery: false },
    'ember-runtime':              { trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-environment', 'ember-console', 'ember-metal'], requiresJQuery: false },
    'ember-views':                { trees: null,  requirements: ['ember-runtime'], skipTests: true },
    'ember-extension-support':    { trees: null,  requirements: ['ember-application'], requiresJQuery: false },
    'ember-testing':              { 
      trees: null,  
      requiresJQuery: false,
      requirements: ['ember-application', 'ember-routing'], 
      testing: true 
    },
    'ember-template-compiler': {
      trees: null,
      templateCompilerOnly: true,
      requiresJQuery: false,
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
      ],
    },
    'ember-routing':              { trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                    requirements: ['ember-runtime', 'ember-views'], requiresJQuery: false },
    'ember-application':          { trees: null,  vendorRequirements: ['dag-map'], requirements: ['ember-routing'], requiresJQuery: false },
    'ember':                      { trees: null,  requirements: ['ember-application'] },
    'internal-test-helpers':      { trees: null, requiresJQuery: false },

    'ember-glimmer':              {
      trees: null,
      requiresJQuery: false,
      requirements: ['container', 'ember-metal', 'ember-routing' ],
      hasTemplates: true,
      vendorRequirements: [
        '@glimmer/runtime',
        '@glimmer/reference',
        '@glimmer/util',
        '@glimmer/wire-format',
        '@glimmer/node'
      ],
      testingVendorRequirements: [],
    }
  };

  return packages;
};
