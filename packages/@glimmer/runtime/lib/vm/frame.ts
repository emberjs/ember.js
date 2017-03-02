import { Environment, Opcode } from '../environment';
import { Option } from '@glimmer/util';
import { Block } from '../scanner';

class Frame {
  public ip: number;

  constructor(
    public start: number,
    public end: number,
  ) {
    this.ip = start;
  }
}

export interface Blocks {
  default: Option<Block>;
  inverse: Option<Block>;
}

export class FrameStack {
  private frames: Frame[] = [];
  private frame: number = -1;

  private get currentFrame(): Frame {
    return this.frames[this.frame];
  }

  push(start: number, end: number) {
    let pos = ++this.frame;

    if (pos < this.frames.length) {
      let frame = this.frames[pos];
      Frame.call(frame, start, end);
    } else {
      this.frames[pos] = new Frame(start, end);
    }
  }

  pop() {
    this.frame--;
  }

  getStart(): number {
    return this.currentFrame.start;
  }

  getEnd(): number {
    return this.currentFrame.end;
  }

  getCurrent(): number {
    return this.currentFrame.ip;
  }

  setCurrent(ip: number): number {
    return this.currentFrame.ip = ip;
  }

  goto(ip: number) {
    this.setCurrent(ip);
  }

  nextStatement(env: Environment): Option<Opcode> {
    while (this.frame !== -1) {
      let frame = this.frames[this.frame];
      let ip = frame.ip;
      let end = frame.end;
      if (ip <= end) {
        let program = env.program;
        frame.ip += 4;
        return program.opcode(ip);
      } else {
        this.pop();
      }
    }
    return null;
  }
}
