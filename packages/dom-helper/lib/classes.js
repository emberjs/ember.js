var doc = typeof document === 'undefined' ? false : document;

// PhantomJS has a broken classList. See https://github.com/ariya/phantomjs/issues/12782
var canClassList = doc && (function(){
  var d = document.createElement('div');
  if (!d.classList) {
    return false;
  }
  d.classList.add('boo');
  d.classList.add('boo', 'baz');
  return (d.className === 'boo baz');
})();

function buildClassList(element) {
  var classString = (element.getAttribute('class') || '');
  return classString !== '' && classString !== ' ' ? classString.split(' ') : [];
}

function intersect(containingArray, valuesArray) {
  var containingIndex = 0;
  var containingLength = containingArray.length;
  var valuesIndex = 0;
  var valuesLength = valuesArray.length;

  var intersection = new Array(valuesLength);

  // TODO: rewrite this loop in an optimal manner
  for (;containingIndex<containingLength;containingIndex++) {
    valuesIndex = 0;
    for (;valuesIndex<valuesLength;valuesIndex++) {
      if (valuesArray[valuesIndex] === containingArray[containingIndex]) {
        intersection[valuesIndex] = containingIndex;
        break;
      }
    }
  }

  return intersection;
}

function addClassesViaAttribute(element, classNames) {
  var existingClasses = buildClassList(element);

  var indexes = intersect(existingClasses, classNames);
  var didChange = false;

  for (var i=0, l=classNames.length; i<l; i++) {
    if (indexes[i] === undefined) {
      didChange = true;
      existingClasses.push(classNames[i]);
    }
  }

  if (didChange) {
    element.setAttribute('class', existingClasses.length > 0 ? existingClasses.join(' ') : '');
  }
}

function removeClassesViaAttribute(element, classNames) {
  var existingClasses = buildClassList(element);

  var indexes = intersect(classNames, existingClasses);
  var didChange = false;
  var newClasses = [];

  for (var i=0, l=existingClasses.length; i<l; i++) {
    if (indexes[i] === undefined) {
      newClasses.push(existingClasses[i]);
    } else {
      didChange = true;
    }
  }

  if (didChange) {
    element.setAttribute('class', newClasses.length > 0 ? newClasses.join(' ') : '');
  }
}

var addClasses, removeClasses;
if (canClassList) {
  addClasses = function addClasses(element, classNames) {
    if (element.classList) {
      if (classNames.length === 1) {
        element.classList.add(classNames[0]);
      } else if (classNames.length === 2) {
        element.classList.add(classNames[0], classNames[1]);
      } else {
        element.classList.add.apply(element.classList, classNames);
      }
    } else {
      addClassesViaAttribute(element, classNames);
    }
  };
  removeClasses = function removeClasses(element, classNames) {
    if (element.classList) {
      if (classNames.length === 1) {
        element.classList.remove(classNames[0]);
      } else if (classNames.length === 2) {
        element.classList.remove(classNames[0], classNames[1]);
      } else {
        element.classList.remove.apply(element.classList, classNames);
      }
    } else {
      removeClassesViaAttribute(element, classNames);
    }
  };
} else {
  addClasses = addClassesViaAttribute;
  removeClasses = removeClassesViaAttribute;
}

export {
  addClasses,
  removeClasses
};
