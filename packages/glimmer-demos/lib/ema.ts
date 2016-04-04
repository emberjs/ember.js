export default class ExponentialMovingAverage {
  private alpha: number;
  private lastValue: number;

  constructor(alpha: number) {
    this.alpha = alpha;
    this.lastValue = null;
  }

  value() {
    return this.lastValue;
  }

  push(dataPoint: number): number {
    let { alpha, lastValue } = this;

    if (lastValue) {
      return this.lastValue = lastValue + alpha * (dataPoint - lastValue);
    } else {
      return this.lastValue = dataPoint;
    }
  }
}
