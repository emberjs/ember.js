module.exports = class Project {
  static withDep(depOptions = {}, projectOptions = {}) {
    let addons = projectOptions.addons || [];

    return new Project({
      ...projectOptions,
      addons: [...addons, new Addon(depOptions)],
    });
  }

  static withTransientDep(transientDepOptions = {}, depOptions = {}, projectOptions = {}) {
    let addons = depOptions.addons || [];

    return Project.withDep(
      {
        ...depOptions,
        addons: [
          ...addons,
          new Addon({
            name: 'my-nested-addon',
            version: '0.1.0',
            ...transientDepOptions,
          }),
        ],
      },
      projectOptions
    );
  }

  constructor({
    name = 'my-app',
    emberCliBabel,
    dependencies = {},
    devDependencies = {},
    addons = [],
  } = {}) {
    this.name = () => name;
    this.parent = null;
    this.pkg = {
      name,
      dependencies: { ...dependencies },
      devDependencies: { ...devDependencies },
    };
    this.addons = [...addons];

    if (typeof emberCliBabel === 'string') {
      this.pkg.devDependencies['ember-cli-babel'] = emberCliBabel;
    }

    reifyAddons(this);
    addMissingAddons(this, this.pkg.devDependencies);
    addMissingAddons(this, this.pkg.dependencies);
    addMissingDeps(this, true);
  }
};

class Addon {
  constructor({
    parent,
    name = 'my-addon',
    version = '1.0.0',
    emberCliBabel,
    dependencies = {},
    addons = [],
    hasJSFiles = name !== 'ember-cli-babel',
  } = {}) {
    this.parent = parent;
    this.name = name;
    this.pkg = {
      name,
      version,
      dependencies: { ...dependencies },
      devDependencies: {},
    };
    this.addons = [...addons];
    this._fileSystemInfo = () => ({ hasJSFiles });

    if (typeof emberCliBabel === 'string') {
      this.pkg.dependencies['ember-cli-babel'] = emberCliBabel;
    }

    reifyAddons(this);
    addMissingAddons(this, this.pkg.dependencies);
    addMissingDeps(this);
  }
}

// Can only handle the few hardcoded cases
function resolve(requirement) {
  if (requirement.startsWith('link:')) {
    // Expecting something like "link:1.2.3"
    return requirement.slice(5);
  } else {
    // Only handles "^1.0.0" -> "1.0.0", doesn't work for the general case
    return requirement.slice(1);
  }
}

function reifyAddons(parent) {
  parent.addons = parent.addons.map((addon) => {
    if (addon instanceof Addon) {
      addon.parent = parent;
      return addon;
    } else {
      let version = addon.version;

      if (!version) {
        if (parent.pkg.devDependencies[addon.name]) {
          version = resolve(parent.pkg.devDependencies[addon.name]);
        } else if (parent.pkg.dependencies[addon.name]) {
          version = resolve(parent.pkg.dependencies[addon.name]);
        }
      }

      return new Addon({ ...addon, parent, version });
    }
  });
}

function addMissingAddons(parent, deps) {
  for (let [name, requirement] of Object.entries(deps)) {
    if (!parent.addons.find((addon) => addon.name === name)) {
      parent.addons.push(
        new Addon({
          parent,
          name,
          version: resolve(requirement),
        })
      );
    }
  }
}

function addMissingDeps(parent, devDeps = false) {
  for (let addon of parent.addons) {
    let target = parent.pkg.dependencies;
    let isMissing = !(addon.name in target);

    if (devDeps) {
      target = parent.pkg.devDependencies;
      isMissing = isMissing && !(addon.name in target);
    }

    if (isMissing) {
      target[addon.name] = `^${addon.pkg.version}`;
    }
  }
}
