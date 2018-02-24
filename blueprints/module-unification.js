'use strict';

module.exports = {
  isModuleUnificationProject(project) {
    return project.isModuleUnification && project.isModuleUnification();
  }
};
