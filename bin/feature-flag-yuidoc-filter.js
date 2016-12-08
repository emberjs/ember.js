var fs = require('fs');

function isClassToBeIncluded(item, featuresToFilter) {
  if (item.category) {
    for (var j = 0; j < featuresToFilter.length; j++) {
      for (var k = 0; k < item.category.length; k++) {
        if (featuresToFilter[j] === item.category[k]) {
          return false;
        }
      }
    }
  }
  return true;
}

function gatherFeatures() {
  var featuresJson = JSON.parse(fs.readFileSync('features.json'));
  var featuresObj = featuresJson.features;
  var featuresToFilter = [];
  for (var feature in featuresObj) {
    if (featuresObj[feature] === null || featuresObj[feature] === false) {
      featuresToFilter.push(feature);
    }
  }
  return featuresToFilter;
}

function gatherClassesToDocument(data, featuresToFilter) {
  var classesToDocument = {};

  for (var c in data.classes) {
    if (isClassToBeIncluded(data.classes[c], featuresToFilter)) {
      classesToDocument[c] = data.classes[c];
    }
  }
  return classesToDocument;
}

function updateClassReferencesInNamespaces(data) {
  for (var namespace in data.modules) {
    var namespaceClasses = {};
    var originalClasses = data.modules[namespace].classes;
    for (var className in originalClasses) {
      if (data.classes.hasOwnProperty(className)) {
        namespaceClasses[className] = originalClasses[className]
      }
    }
    data.modules[namespace].classes = namespaceClasses;
  }
}

module.exports = function (data, options) {
  var featuresToFilter = gatherFeatures();
  data.classes = gatherClassesToDocument(data, featuresToFilter);
  updateClassReferencesInNamespaces(data);
};
