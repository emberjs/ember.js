export class StdLib {
  constructor(
    public main: number,
    private trustingGuardedAppend: number,
    private cautiousGuardedAppend: number,
    private trustingNonDynamicAppend: number,
    private cautiousNonDynamicAppend: number
  ) {}

  get 'trusting-append'() {
    return this.trustingGuardedAppend;
  }

  get 'cautious-append'() {
    return this.cautiousGuardedAppend;
  }

  get 'trusting-non-dynamic-append'() {
    return this.trustingNonDynamicAppend;
  }

  get 'cautious-non-dynamic-append'() {
    return this.cautiousNonDynamicAppend;
  }

  getAppend(trusting: boolean) {
    return trusting ? this.trustingGuardedAppend : this.cautiousGuardedAppend;
  }
}
