import path from 'node:path';
import stringUtil from 'ember-cli-string-utils';
import getPathOption from 'ember-cli-get-component-path-option';
import normalizeEntityName from 'ember-cli-normalize-entity-name';

export default {
  description: 'Generates a component class.',

  fileMapTokens: function () {
    return {
      __path__: function (options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'components';
      },
      __name__: function (options) {
        if (options.pod) {
          return 'component';
        }
        return options.dasherizedModuleName;
      },
      __root__: function (options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      },
    };
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(entityName);
  },

  locals: function (options) {
    let addonRawName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let addonName = stringUtil.dasherize(addonRawName);
    let fileName = stringUtil.dasherize(options.entity.name);
    let importPathName = [addonName, 'components', fileName].join('/');

    if (options.pod) {
      importPathName = [addonName, 'components', fileName, 'component'].join('/');
    }

    return {
      modulePath: importPathName,
      path: getPathOption(options),
    };
  },
};
