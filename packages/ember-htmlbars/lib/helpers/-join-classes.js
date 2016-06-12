/*
  This private helper is used to join and compact a list of class names.

  @private
*/

export default function joinClasses(classNames) {
  let result = [];

  for (let i = 0; i < classNames.length; i++) {
    let className = classNames[i];

    if (className) {
      result.push(className);
    }
  }

  return result.join(' ');
}
