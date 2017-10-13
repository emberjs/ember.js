/**
@module @ember/application
*/

import { dictionary } from 'ember-utils';
import { get } from 'ember-metal';
import { assert, info } from 'ember-debug';
import {
  String as StringUtils,
  Object as EmberObject,
  Namespace
} from 'ember-runtime';
import validateType from '../utils/validate-type';
import { getTemplate } from 'ember-glimmer';
import { DEBUG } from 'ember-env-flags';

export const Resolver = EmberObject.extend({
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

  ```app/app.js
  import Application from '@ember/application';
  import GlobalsResolver from '@ember/application/globals-resolver';

  App = Application.create({
    Resolver: GlobalsResolver.extend({
      resolveTemplate(parsedName) {
        let resolvedTemplate = this._super(parsedName);
        if (resolvedTemplate) { return resolvedTemplate; }

        return Ember.TEMPLATES['not_found'];
      }
    })
  });
  ```

  Some examples of how names are resolved:

  ```text
  'template:post'           //=> Ember.TEMPLATES['post']
  'template:posts/byline'   //=> Ember.TEMPLATES['posts/byline']
  'template:posts.byline'   //=> Ember.TEMPLATES['posts/byline']
  'template:blogPost'       //=> Ember.TEMPLATES['blog-post']
  'controller:post'         //=> App.PostController
  'controller:posts.index'  //=> App.PostsIndexController
  'controller:blog/post'    //=> Blog.PostController
  'controller:basic'        //=> Controller
  'route:post'              //=> App.PostRoute
  'route:posts.index'       //=> App.PostsIndexRoute
  'route:blog/post'         //=> Blog.PostRoute
  'route:basic'             //=> Route
  'foo:post'                //=> App.PostFoo
  'model:post'              //=> App.Post
  ```

  @class GlobalsResolver
  @extends EmberObject
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
    let [ type, name ] = fullName.split(':');

    assert(
      'Tried to normalize a container name without a colon (:) in it. ' +
      'You probably tried to lookup a name that did not contain a type, ' +
      'a colon, and a name. A proper lookup name would be `view:post`.',
      fullName.split(':').length === 2
    );

    if (type !== 'template') {
      let result = name
        .replace(/(\.|_|-)./g, m => m.charAt(1).toUpperCase());

      return `${type}:${result}`;
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
    let parsedName = this.parseName(fullName);
    let resolveMethodName = parsedName.resolveMethodName;
    let resolved;

    if (this[resolveMethodName]) {
      resolved = this[resolveMethodName](parsedName);
    }

    resolved = resolved || this.resolveOther(parsedName);

    if (DEBUG) {
      if (parsedName.root && parsedName.root.LOG_RESOLVER) {
        this._logLookup(resolved, parsedName);
      }
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

    @param {String} fullName the lookup string
    @method parseName
    @protected
  */

  parseName(fullName) {
    return this._parseNameCache[fullName] || (
      (this._parseNameCache[fullName] = this._parseName(fullName))
    );
  },

  _parseName(fullName) {
    let [ type, fullNameWithoutType ] = fullName.split(':');

    let name = fullNameWithoutType;
    let namespace = get(this, 'namespace');
    let root = namespace;
    let lastSlashIndex = name.lastIndexOf('/');
    let dirname = lastSlashIndex !== -1 ? name.slice(0, lastSlashIndex) : null;

    if (type !== 'template' && lastSlashIndex !== -1) {
      let parts = name.split('/');
      name = parts[parts.length - 1];
      let namespaceName = StringUtils.capitalize(parts.slice(0, -1).join('.'));
      root = Namespace.byName(namespaceName);

      assert(
        `You are looking for a ${name} ${type} in the ${namespaceName} namespace, but the namespace could not be found`,
        root
      );
    }

    let resolveMethodName = fullNameWithoutType === 'main' ? 'Main' : StringUtils.classify(type);

    if (!(name && type)) {
      throw new TypeError(`Invalid fullName: \`${fullName}\`, must be of the form \`type:name\` `);
    }

    return {
      fullName,
      type,
      fullNameWithoutType,
      dirname,
      name,
      root,
      resolveMethodName: `resolve${resolveMethodName}`
    };
  },

  /**
    Returns a human-readable description for a fullName. Used by the
    Application namespace in assertions to describe the
    precise name of the class that Ember is looking for, rather than
    container keys.

    @param {String} fullName the lookup string
    @method lookupDescription
    @protected
  */
  lookupDescription(fullName) {
    let parsedName = this.parseName(fullName);
    let description;

    if (parsedName.type === 'template') {
      return `template at ${parsedName.fullNameWithoutType.replace(/\./g, '/')}`;
    }

    description = `${parsedName.root}.${StringUtils.classify(parsedName.name).replace(/\./g, '')}`;

    if (parsedName.type !== 'model') {
      description += StringUtils.classify(parsedName.type);
    }

    return description;
  },

  makeToString(factory, fullName) {
    return factory.toString();
  },

  /**
    Given a parseName object (output from `parseName`), apply
    the conventions expected by `Ember.Router`

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method useRouterNaming
    @protected
  */
  useRouterNaming(parsedName) {
    if (parsedName.name === 'basic') {
      parsedName.name = '';
    } else {
      parsedName.name = parsedName.name.replace(/\./g, '_');
    }
  },
  /**
    Look up the template in Ember.TEMPLATES

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveTemplate
    @protected
  */
  resolveTemplate(parsedName) {
    let templateName = parsedName.fullNameWithoutType.replace(/\./g, '/');

    return getTemplate(templateName) || getTemplate(StringUtils.decamelize(templateName));
  },

  /**
    Lookup the view using `resolveOther`

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveView
    @protected
  */
  resolveView(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },

  /**
    Lookup the controller using `resolveOther`

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveController
    @protected
  */
  resolveController(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },
  /**
    Lookup the route using `resolveOther`

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveRoute
    @protected
  */
  resolveRoute(parsedName) {
    this.useRouterNaming(parsedName);
    return this.resolveOther(parsedName);
  },

  /**
    Lookup the model on the Application namespace

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveModel
    @protected
  */
  resolveModel(parsedName) {
    let className = StringUtils.classify(parsedName.name);
    let factory = get(parsedName.root, className);

    return factory;
  },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveHelper
    @protected
  */
  resolveHelper(parsedName) {
    return this.resolveOther(parsedName);
  },
  /**
    Look up the specified object (from parsedName) on the appropriate
    namespace (usually on the Application)

    @param {Object} parsedName a parseName object with the parsed
      fullName lookup string
    @method resolveOther
    @protected
  */
  resolveOther(parsedName) {
    let className = StringUtils.classify(parsedName.name) + StringUtils.classify(parsedName.type);
    let factory = get(parsedName.root, className);
    return factory;
  },

  resolveMain(parsedName) {
    let className = StringUtils.classify(parsedName.type);
    return get(parsedName.root, className);
  },

  /**
    @method _logLookup
    @param {Boolean} found
    @param {Object} parsedName
    @private
  */
  _logLookup(found, parsedName) {
    let symbol = found ? '[✓]' : '[ ]';

    let padding;
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
    let suffix = StringUtils.classify(type);
    let typeRegexp = new RegExp(`${suffix}$`);

    let known = dictionary(null);
    let knownKeys = Object.keys(namespace);
    for (let index = 0; index < knownKeys.length; index++) {
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

    * App.FooBarHelper -> helper:foo-bar
    * App.THelper -> helper:t

    @method translateToContainerFullname
    @param {String} type
    @param {String} name
    @private
  */
  translateToContainerFullname(type, name) {
    let suffix = StringUtils.classify(type);
    let namePrefix = name.slice(0, suffix.length * -1);
    let dasherizedName = StringUtils.dasherize(namePrefix);

    return `${type}:${dasherizedName}`;
  }
});
