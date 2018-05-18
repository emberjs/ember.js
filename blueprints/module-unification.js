'use strict';

module.exports = {
  isModuleUnificationProject(project) {
    return project && project.isModuleUnification && project.isModuleUnification();
  },
};
