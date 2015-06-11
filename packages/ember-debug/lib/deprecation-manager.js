import dictionary from 'ember-metal/dictionary';
import { symbol } from "ember-metal/utils";

export const deprecationLevels = {
  RAISE: symbol('RAISE'),
  LOG: symbol('LOG'),
  SILENCE: symbol('SILENCE')
};

export default {
  defaultLevel: deprecationLevels.LOG,
  individualLevels: dictionary(null),
  setDefaultLevel(level) {
    this.defaultLevel = level;
  },
  setLevel(id, level) {
    this.individualLevels[id] = level;
  },
  getLevel(id) {
    let level = this.individualLevels[id];
    if (!level) {
      level = this.defaultLevel;
    }
    return level;
  }
};
