/**
@module ember
@submodule ember-application
*/

var get = Ember.get,
    classify = Ember.String.classify,
    capitalize = Ember.String.capitalize,
    decamelize = Ember.String.decamelize;

Ember.AbstractResolver = Ember.Object.extend({
  /**
    This will be set to the Application instance when it is
    created.

    @property namespace
  */
  namespace: null,
  normalize: function(fullName) {
    throw new Error("Invalid call to `resolver.normalize(fullName)`. Please override the 'normalize' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");    
  },
  resolve: function(fullName) {
   throw new Error("Invalid call to `resolver.resolve(parsedName)`. Please override the 'resolve' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  parseName: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveByType(parsedName)`. Please override the 'resolveByType' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  lookupDescription: function(fullName) {
    throw new Error("Invalid call to `resolver.lookupDescription(fullName)`. Please override the 'lookupDescription' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");    
  },
  makeToString: function(factory, fullName) {
    throw new Error("Invalid call to `resolver.makeToString(factory, fullName)`. Please override the 'makeToString' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");    
  },
  resolveTemplate: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveTemplate(parsedName)`. Please override the 'resolveTemplate' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  resolveView: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveView(parsedName)`. Please override the 'resolveView' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  resolveController: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveController(parsedName)`. Please override the 'resolveController' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  resolveRoute: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveRoute(parsedName)`. Please override the 'resolveRoute' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  resolveModel: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveModel(parsedName)`. Please override the 'resolveModel' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  },
  // resolveHelper: function(parsedName) {
  //  throw new Error("Invalid call to `resolver.resolveHelper(parsedName)`. Please override the 'resolveHelper' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  // },
  resolveOther: function(parsedName) {
   throw new Error("Invalid call to `resolver.resolveDefault(parsedName)`. Please override the 'resolveDefault' method in subclass of `Ember.AbstractResolver` to prevent falling through to this error.");        
  }
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
  'template:post' //=> Ember.TEMPLATES['post']
  'template:posts/byline' //=> Ember.TEMPLATES['posts/byline']
  'template:posts.byline' //=> Ember.TEMPLATES['posts/byline']
  'template:blogPost' //=> Ember.TEMPLATES['blogPost']
                      //   OR
                      //   Ember.TEMPLATES['blog_post']
  'controller:post' //=> App.PostController
  'controller:posts.index' //=> App.PostsIndexController
  'controller:blog/post' //=> Blog.PostController
  'controller:basic' //=> Ember.Controller
  'route:post' //=> App.PostRoute
  'route:posts.index' //=> App.PostsIndexRoute
  'route:blog/post' //=> Blog.PostRoute
  'route:basic' //=> Ember.Route
  'view:post' //=> App.PostView
  'view:posts.index' //=> App.PostsIndexView
  'view:blog/post' //=> Blog.PostView
  'view:basic' //=> Ember.View
  'foo:post' //=> App.PostFoo
  'model:post' //=> App.Post
  ```

  @class DefaultResolver
  @namespace Ember
  @extends Ember.Object
*/
Ember.DefaultResolver = Ember.Object.extend({
  /**
    This will be set to the Application instance when it is
    created.

    @property namespace
  */
  namespace: null,

  normalize: function(fullName) {
    var split = fullName.split(':', 2),
        type = split[0],
        name = split[1];

    Ember.assert("Tried to normalize a container name without a colon (:) in it. You probably tried to lookup a name that did not contain a type, a colon, and a name. A proper lookup name would be `view:post`.", split.length === 2);

    if (type !== 'template') {
      var result = name;

      if (result.indexOf('.') > -1) {
        result = result.replace(/\.(.)/g, function(m) { return m.charAt(1).toUpperCase(); });
      }

      if (name.indexOf('_') > -1) {
        result = result.replace(/_(.)/g, function(m) { return m.charAt(1).toUpperCase(); });
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
  */
  resolve: function(fullName) {
    var parsedName = this.parseName(fullName),
        resolveMethodName = parsedName.resolveMethodName;

    if (!(parsedName.name && parsedName.type)) {
      throw new TypeError("Invalid fullName: `" + fullName + "`, must be of the form `type:name` ");
    }

    if (this[resolveMethodName]) {
      var resolved = this[resolveMethodName](parsedName);
      if (resolved) { return resolved; }
    }
    return this.resolveOther(parsedName);
  },
  /**
    Convert the string name of the form "type:name" to
    a Javascript object with the parsed aspects of the name
    broken out.

    @protected
    @param {String} fullName the lookup string
    @method parseName
  */
  parseName: function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], fullNameWithoutType = nameParts[1],
        name = fullNameWithoutType,
        namespace = get(this, 'namespace'),
        root = namespace;

    if (type !== 'template' && name.indexOf('/') !== -1) {
      var parts = name.split('/');
      name = parts[parts.length - 1];
      var namespaceName = capitalize(parts.slice(0, -1).join('.'));
      root = Ember.Namespace.byName(namespaceName);

      Ember.assert('You are looking for a ' + name + ' ' + type + ' in the ' + namespaceName + ' namespace, but the namespace could not be found', root);
    }

    return {
      fullName: fullName,
      type: type,
      fullNameWithoutType: fullNameWithoutType,
      name: name,
      root: root,
      resolveMethodName: "resolve" + classify(type)
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
  */
  lookupDescription: function(fullName) {
    var parsedName = this.parseName(fullName);

    if (parsedName.type === 'template') {
      return "template at " + parsedName.fullNameWithoutType.replace(/\./g, '/');
    }

    var description = parsedName.root + "." + classify(parsedName.name);
    if (parsedName.type !== 'model') { description += classify(parsedName.type); }

    return description;
  },

  makeToString: function(factory, fullName) {
    return factory.toString();
  },
  /**
    Given a parseName object (output from `parseName`), apply
    the conventions expected by `Ember.Router`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method useRouterNaming
  */
  useRouterNaming: function(parsedName) {
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
  */
  resolveTemplate: function(parsedName) {
    var templateName = parsedName.fullNameWithoutType.replace(/\./g, '/');

    if (Ember.TEMPLATES[templateName]) {
      return Ember.TEMPLATES[templateName];
    }

    templateName = decamelize(templateName);
    if (Ember.TEMPLATES[templateName]) {
      return Ember.TEMPLATES[templateName];
    }
  },
  /**
    Lookup the view using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveView
  */
  resolveView: function(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },
  /**
    Lookup the controller using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveController
  */
  resolveController: function(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },
  /**
    Lookup the route using `resolveOther`

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveRoute
  */
  resolveRoute: function(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },

  /**
    Lookup the model on the Application namespace

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveModel
  */
  resolveModel: function(parsedName) {
    var className = classify(parsedName.name),
        factory = get(parsedName.root, className);

     if (factory) { return factory; }
  },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveHelper
  */
  // resolveHelper: function(parsedName) {
  //   return this.resolveOther(parsedName);
  // },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @protected
    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveOther
  */
  resolveOther: function(parsedName) {
    var className = classify(parsedName.name) + classify(parsedName.type),
        factory = get(parsedName.root, className);
    if (factory) { return factory; }
  }
});
