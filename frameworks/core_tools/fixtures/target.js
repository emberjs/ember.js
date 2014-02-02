// ==========================================================================
// Project:   CoreTools.Target Fixtures
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*globals CoreTools */

sc_require('models/target');

CoreTools.Target.FIXTURES = [

  // SAMPLE APPS
  { "name": "/sample_controls",
    "kind": "app",
    "link_docs": "/static/sample_controls/en/current/docs/-index.json",
    "link_root": "/static/sample_controls",
    "link_tests": "/static/sample_controls/en/current/tests/-index.json",
    "parent": ""
  },

  { "name": "/twitter",
    "kind": "app",
    "link_docs": "/static/twitter/en/current/docs/-index.json",
    "link_root": "/static/twitter",
    "link_tests": "/static/twitter/en/current/tests/-index.json",
    "parent": ""
  },

  // TOP LEVEL FRAMEWORK
  { "name": "/sproutcore",
    "kind": "framework",
    "link_docs": "/static/sproutcore/en/current/docs/-index.json",
    "link_root": "/static/sproutcore",
    "link_tests": "/static/sproutcore/en/current/tests/-index.json",
    "parent": "" 
  },

  // NESTED FRAMEWORKS
  { "name": "/sproutcore/foundation",
    "kind": "framework",
    "link_docs": "/static/sproutcore/foundation/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/foundation",
    "link_tests": "/static/sproutcore/foundation/en/current/tests/-index.json",
    "parent": "/sproutcore" 
  },
    
  { "name": "/sproutcore/datastore",
    "kind": "framework",
    "link_docs": "/static/sproutcore/datastore/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/datastore",
    "link_tests": "/static/sproutcore/datastore/en/current/tests/-index.json",
    "parent": "/sproutcore"
  },

  { "name": "/sproutcore/desktop",
    "kind": "framework",
    "link_docs": "/static/sproutcore/desktop/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/desktop",
    "link_tests": "/static/sproutcore/desktop/en/current/tests/-index.json",
    "parent": "/sproutcore"
  },

  { "name": "/sproutcore/runtime",
    "kind": "framework",
    "link_docs": "/static/sproutcore/runtime/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/runtime",
    "link_tests": "/static/sproutcore/runtime/en/current/tests/-index.json",
    "parent": "/sproutcore"
  },

  // NESTED APPS
  { "name": "/sproutcore/welcome",
    "kind": "app",
    "link_docs": "/static/sproutcore/welcome/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/welcome",
    "link_tests": "/static/sproutcore/welcome/en/current/tests/-index.json",
    "parent": "/sproutcore"
  },
  
  { "name": "/sproutcore/tests",
    "kind": "app",
    "link_docs": "/static/sproutcore/tests/en/current/docs/-index.json",
    "link_root": "/static/sproutcore/tests",
    "link_tests": "/static/sproutcore/tests/en/current/tests/-index.json",
    "parent": "/sproutcore"
  }
  
];
