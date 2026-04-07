import Helper, { helper } from '@ember/component/helper';
import EmberObject from '@ember/object';
import Service, { service } from '@ember/service';

const FormatCurrencyHelper = helper((params: [number], hash: { currency: string }) => {
  const cents = params[0];
  const currency = hash.currency;
  return `${currency}${cents * 0.01}`;
});

class User extends EmberObject {
  declare email: string;
}

class SessionService extends Service {
  declare currentUser: User;
}

declare module '@ember/service' {
  interface Registry {
    session: SessionService;
  }
}

class CurrentUserEmailHelper extends Helper {
  @service('session')
  declare session: SessionService;

  compute(): string {
    return this.get('session').get('currentUser').get('email');
  }
}

function typedHelp(/*params, hash*/) {
  return 'my type of help';
}

export default helper(typedHelp);

function arrayNumHelp(/*params, hash*/) {
  return [1, 2, 3];
}

helper(arrayNumHelp);
