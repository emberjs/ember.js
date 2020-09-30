const FEATURES = require('../broccoli/features');

function isClassToBeIncluded(item, featuresToFilter) {
  if (item.category) {
    for (let j = 0; j < featuresToFilter.length; j++) {
      for (let k = 0; k < item.category.length; k++) {
        if (featuresToFilter[j] === item.category[k]) {
          return false;
        }
      }
    }
  }
  return true;
}

function gatherFeatures() {
  let featuresObj = Object.assign({}, FEATURES);
  let featuresToFilter = [];
  for (let feature in featuresObj) {
    if (featuresObj[feature] === null || featuresObj[feature] === false) {
      featuresToFilter.push(feature);
    }
  }
  return featuresToFilter;
}

function gatherClassesToDocument(data, featuresToFilter) {
  let classesToDocument = {};

  for (let c in data.classes) {
    if (isClassToBeIncluded(data.classes[c], featuresToFilter)) {
      classesToDocument[c] = data.classes[c];
    }
  }
  return classesToDocument;
}

function updateClassReferencesInNamespaces(data) {
  for (let namespace in data.modules) {
    let namespaceClasses = {};
    let originalClasses = data.modules[namespace].classes;
    for (let className in originalClasses) {
      if (Object.prototype.hasOwnProperty.call(data.classes, className)) {
        namespaceClasses[className] = originalClasses[className];
      }
    }
    data.modules[namespace].classes = namespaceClasses;
  }
}

module.exports = function (data) {
  let featuresToFilter = gatherFeatures();
  data.classes = gatherClassesToDocument(data, featuresToFilter);
  updateClassReferencesInNamespaces(data);
};
