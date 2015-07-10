/*
  this private helper is used to join and compact a list of class names

  @private
*/

export default function joinClasses(classNames) {
  var result = [];

  for (let i = 0, l = classNames.length; i < l; i++) {
    let className = classNames[i];

    if (className) {
      result.push(className);
    }
  }

  return result.join(' ');
}
