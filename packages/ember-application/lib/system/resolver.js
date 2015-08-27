/**
@module ember
@submodule ember-application
*/

import Ember from 'ember-metal/core';
import { assert, info } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import {
  classify,
  capitalize,
  dasherize,
  decamelize
} from 'ember-runtime/system/string';
import EmberObject from 'ember-runtime/system/object';
import Namespace from 'ember-runtime/system/namespace';
import helpers from 'ember-htmlbars/helpers';
import validateType from 'ember-application/utils/validate-type';
import dictionary from 'ember-metal/dictionary';

export var Resolver = EmberObject.extend({
  /*
    This will be set to the Application instance when it is
    created.

    @property namespace
  */
  namespace: null,
  normalize:         null, // required
  resolve:           null, // required
  parseName:         null, // required
  lookupDescription: null, // required
  makeToString:      null, // required
  resolveOther:      null, // required
  _logLookup:        null  // required
});

/**
  The DefaultResolver defines the default lookup rules to resolve
  container lookups before consulting the container for registered
  items:

  * templates are looked up on `Ember.TEMPLATES`
  * other names are looked up on the application after converting
    the name. For example, `controller:post` looks up
    `App.PostController` by default.
  * there are some nuances (see examples below)

  ### How Resolving Works

  The container calls this object's `resolve` method with the
  `fullName` argument.

  It first parses the fullName into an object using `parseName`.

  Then it checks for the presence of a type-specific instance
  method of the form `resolve[Type]` and calls it if it exists.
  For example if it was resolving 'template:post', it would call
  the `resolveTemplate` method.

  Its last resort is to call the `resolveOther` method.

  The methods of this object are designed to be easy to override
  in a subclass. For example, you could enhance how a template
  is resolved like so:

  ```javascript
  App = Ember.Application.create({
    Resolver: Ember.DefaultResolver.extend({
      resolveTemplate: function(parsedName) {
        var resolvedTemplate = this._super(parsedName);
        if (resolvedTemplate) { return resolvedTemplate; }
        return Ember.TEMPLATES['not_found'];
      }
    })
  });
  ```

  Some examples of how names are resolved:

  ```
  'template:post'           //=> Ember.TEMPLATES['post']
  'template:posts/byline'   //=> Ember.TEMPLATES['posts/byline']
  'template:posts.byline'   //=> Ember.TEMPLATES['posts/byline']
  'template:blogPost'       //=> Ember.TEMPLATES['blogPost']
                            //   OR
                            //   Ember.TEMPLATES['blog_post']
  'controller:post'         //=> App.PostController
  'controller:posts.index'  //=> App.PostsIndexController
  'controller:blog/post'    //=> Blog.PostController
  'controller:basic'        //=> Ember.Controller
  'route:post'              //=> App.PostRoute
  'route:posts.index'       //=> App.PostsIndexRoute
  'route:blog/post'         //=> Blog.PostRoute
  'route:basic'             //=> Ember.Route
  'view:post'               //=> App.PostView
  'view:posts.index'        //=> App.PostsIndexView
  'view:blog/post'          //=> Blog.PostView
  'view:basic'              //=> Ember.View
  'foo:post'                //=> App.PostFoo
  'model:post'              //=> App.Post
  ```

  @class DefaultResolver
  @namespace Ember
  @extends Ember.Object
  @public
*/

export default EmberObject.extend({
  /**
    This will be set to the Application instance when it is
    created.

    @property namespace
    @public
  */
  namespace: null,

  init() {
    this._parseNameCache = dictionary(null);
  },
  normalize(fullName) {
    var [
      type,
      name
    ] = fullName.split(':', 2);

    assert(
      'Tried to normalize a container name without a colon (:) in it. ' +
      'You probably tried to lookup a name that did not contain a type, ' +
      'a colon, and a name. A proper lookup name would be `view:post`.',
      fullName.split(':').length === 2
    );

    if (type !== 'template') {
      var result = name;

      if (result.indexOf('.') > -1) {
        result = result.replace(/\.(.)/g, function(m) {
          return m.charAt(1).toUpperCase();
        });
      }

      if (name.indexOf('_') > -1) {
        result = result.replace(/_(.)/g, function(m) {
          return m.charAt(1).toUpperCase();
        });
      }

      if (name.indexOf('-') > -1) {
        result = result.replace(/-(.)/g, function(m) {
          return m.charAt(1).toUpperCase();
        });
      }

      return type + ':' + result;
    } else {
      return fullName;
    }
  },


  /**
    This method is called via the container's resolver method.
    It parses the provided `fullName` and then looks up and
    returns the appropriate template or class.

    @method resolve
    @param {String} fullName the lookup string
    @return {Object} the resolved factory
    @public
  */
  resolve(fullName) {
    var parsedName = this.parseName(fullName);
    var resolveMethodName = parsedName.resolveMethodName;
    var resolved;

    if (this[resolveMethodName]) {
      resolved = this[resolveMethodName](parsedName);
    }

    resolved = resolved || this.resolveOther(parsedName);

    if (parsedName.root && parsedName.root.LOG_RESOLVER) {
      this._logLookup(resolved, parsedName);
    }

    if (resolved) {
      validateType(resolved, parsedName);
    }

    return resolved;
  },

  /**
    Convert the string name of the form 'type:name' to
    a Javascript object with the parsed aspects of the name
    broken out.

    @protected
    @param {String} fullName the lookup string
    @method parseName
    @public
  */

  parseName(fullName) {
    return this._parseNameCache[fullName] || (
      (this._parseNameCache[fullName] = this._parseName(fullName))
    );
  },

  _parseName(fullName) {
    var [
      type,
      fullNameWithoutType
    ] = fullName.split(':');

    var name = fullNameWithoutType;
    var namespace = get(this, 'namespace');
    var root = namespace;

    if (type !== 'template' && name.indexOf('/') !== -1) {
      var parts = name.split('/');
      name = parts[parts.length - 1];
      var namespaceName = capitalize(parts.slice(0, -1).join('.'));
      root = Namespace.byName(namespaceName);

      assert(
        'You are looking for a ' + name + ' ' + type + ' in the ' +
        namespaceName + ' namespace, but the namespace could not be found',
        root
      );
    }

    var resolveMethodName = fullNameWithoutType === 'main' ? 'Main' : classify(type);

    if (!(name && type)) {
      throw new TypeError('Invalid fullName: `' + fullName + '`, must be of the form `type:name` ');
    }

    return {
      fullName: fullName,
      type: type,
      fullNameWithoutType: fullNameWithoutType,
      name: name,
      root: root,
      resolveMethodName: 'resolve' + resolveMethodName
    };
  },

  /**
    Returns a human-readable description for a fullName. Used by the
    Application namespace in assertions to describe the
    precise name of the class that Ember is looking for, rather than
    container keys.

    @protected
    @param {String} fullName the lookup string
    @method lookupDescription
    @public
  */
  lookupDescription(fullName) {
    var parsedName = this.parseName(fullName);
    var description;

    if (parsedName.type === 'template') {
      return 'template at ' + parsedName.fullNameWithoutType.replace(/\./g, '/');
    }

    description = parsedName.root + '.' + classify(parsedName.name).replace(/\./g, '');

    if (parsedName.type !== 'model') {
      description += classify(parsedName.type);
    }

    return description;
  },

  makeToString(factory, fullName) {
    return factory.toString();
  },

  /**
    Given a parseName object (output from `parseName`), apply
    the conventions expected by `Ember.Router`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method useRouterNaming
    @public
  */
  useRouterNaming(parsedName) {
    parsedName.name = parsedName.name.replace(/\./g, '_');
    if (parsedName.name === 'basic') {
      parsedName.name = '';
    }
  },
  /**
    Look up the template in Ember.TEMPLATES

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveTemplate
    @public
  */
  resolveTemplate(parsedName) {
    var templateName = parsedName.fullNameWithoutType.replace(/\./g, '/');

    if (Ember.TEMPLATES.hasOwnProperty(templateName)) {
      return Ember.TEMPLATES[templateName];
    }

    templateName = decamelize(templateName);
    if (Ember.TEMPLATES.hasOwnProperty(templateName)) {
      return Ember.TEMPLATES[templateName];
    }
  },

  /**
    Lookup the view using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveView
    @public
  */
  resolveView(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },

  /**
    Lookup the controller using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveController
    @public
  */
  resolveController(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },
  /**
    Lookup the route using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveRoute
    @public
  */
  resolveRoute(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },

  /**
    Lookup the model on the Application namespace

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveModel
    @public
  */
  resolveModel(parsedName) {
    var className = classify(parsedName.name);
    var factory = get(parsedName.root, className);

    if (factory) { return factory; }
  },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveHelper
    @public
  */
  resolveHelper(parsedName) {
    return this.resolveOther(parsedName) || helpers[parsedName.fullNameWithoutType];
  },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveOther
    @public
  */
  resolveOther(parsedName) {
    var className = classify(parsedName.name) + classify(parsedName.type);
    var factory = get(parsedName.root, className);
    if (factory) { return factory; }
  },

  resolveMain(parsedName) {
    var className = classify(parsedName.type);
    return get(parsedName.root, className);
  },

  /**
   @method _logLookup
   @param {Boolean} found
   @param {Object} parsedName
   @private
  */
  _logLookup(found, parsedName) {
    var symbol, padding;

    if (found) {
      symbol = '[✓]';
    } else {
      symbol = '[ ]';
    }

    if (parsedName.fullName.length > 60) {
      padding = '.';
    } else {
      padding = new Array(60 - parsedName.fullName.length).join('.');
    }

    info(symbol, parsedName.fullName, padding, this.lookupDescription(parsedName.fullName));
  },

  /**
   Used to iterate all items of a given type.

   @method knownForType
   @param {String} type the type to search for
   @private
   */
  knownForType(type) {
    let namespace = get(this, 'namespace');
    let suffix = classify(type);
    let typeRegexp = new RegExp(`${suffix}$`);

    let known = dictionary(null);
    let knownKeys = Object.keys(namespace);
    for (let index = 0, length = knownKeys.length; index < length; index++) {
      let name = knownKeys[index];

      if (typeRegexp.test(name)) {
        let containerName = this.translateToContainerFullname(type, name);

        known[containerName] = true;
      }
    }

    return known;
  },

  /**
   Converts provided name from the backing namespace into a container lookup name.

   Examples:

   App.FooBarHelper -> helper:foo-bar
   App.THelper -> helper:t

   @method translateToContainerFullname
   @param {String} type
   @param {String} name
   @private
   */

  translateToContainerFullname(type, name) {
    let suffix = classify(type);
    let namePrefix = name.slice(0, suffix.length * -1);
    let dasherizedName = dasherize(namePrefix);

    return `${type}:${dasherizedName}`;
  }
});
