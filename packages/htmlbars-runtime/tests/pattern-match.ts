type Template = (any) => any;

type When = (pattern: Pattern, callback: Template) => void;

type Body = (when: When) => void;

export function match(ast: Object, body: Body) {

}

const PATTERN = "7df44198-4799-48b2-aefe-604b6f901034";

interface Pattern {
  "7df44198-4799-48b2-aefe-604b6f901034": boolean;
  matches(value: any): boolean;
}

class Patterns {
  private patterns: Pattern[] = [];
  private when: When;

  constructor() {
    this.when = (pattern: any, template: Template) => {
      this.patterns.push(classifyPattern(pattern))
    }
  }
}

function classifyPattern(pattern: any): Pattern {
  if (typeof pattern === 'object' && pattern && pattern[PATTERN]) {
    return pattern;
  }


}

class Match {

}

class Success extends Match {

}

class Failure extends Match {

}

class ObjectLiteralPattern implements Pattern {
  "7df44198-4799-48b2-aefe-604b6f901034" = true;

  private pattern: Object;

  constructor(pattern: Object) {
    this.pattern = pattern;
  }

  matches(value: any): Match {
    return false;
  }
}

class ArrayLiteralPattern implements Pattern {
  "7df44198-4799-48b2-aefe-604b6f901034" = true;

  private pattern: Pattern[];

  constructor(pattern: Pattern[]) {
    this.pattern = pattern;
  }

  matches(value: any): Match {
    return false;
  }
}


class AnyPattern {
  "7df44198-4799-48b2-aefe-604b6f901034" = true;

  matches(value: any): Match {
    return true;
  }
}

export interface Dict<T> {
  [index: string]: T;
}

export function dict<T>(): Dict<T> {
  let d = Object.create(null);
  d.x = 1;
  delete d.x;
  return d;
}