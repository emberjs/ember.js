// TODO there are like 3 things that do this
'use strict';
/* eslint-env node */

function stripClassCallCheck( { types: t, traverse }) {
  return {
    name: 'remove classCallCheck',
    visitor: {
      Program: {
        enter(path, state) {
          let [amd] = path.get('body');

          if (!amd) { return; }

          let [, deps, callBack] = amd.get('expression.arguments');
          let params = callBack.get('params');
          let elements = deps.get('elements');

          for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            if (el.node.value === state.opts.source) {
              this.binding = params[i];
              this.index = i;
              break;
            }
          }
        },
        exit(path) {
          if (!this.binding) { return; }

          traverse.clearCache()
          path.scope.crawl();

          let [amd] = path.get('body');
          let [, deps, callBack] = amd.get('expression.arguments');
          let binding = callBack.scope.bindings[this.binding.node.name];
          let elements = deps.get('elements');
          if (binding.referencePaths.length === 0) {
            this.binding.remove();
            elements[this.index].remove();
          }
        }
      },

      CallExpression(path) {
        let callee = path.get('callee');

        if (!this.binding) { return }

        if (callee.isSequenceExpression()) {
          let [, member] = callee.get('expressions')

          if (member.node.object.name === this.binding.node.name && member.node.property.name.indexOf('classCallCheck') > -1) {
            path.remove();
          }
        }

        if (callee.isMemberExpression()) {
          if (callee.node.object.name === this.binding.node.name && callee.node.property.name.indexOf('classCallCheck') > -1) {
            path.remove();
          }
        }
      }
    }
  }
}

stripClassCallCheck.baseDir = function() {
  return 'babel-core';
}

stripClassCallCheck.cacheKey = function() {
  return stripClassCallCheck.toString();
}

module.exports = stripClassCallCheck;