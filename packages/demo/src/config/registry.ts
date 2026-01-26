import type { IRegistry } from './utils';

import { ApplicationRoute } from '@/routes/application';
import ApplicationTemplate from '@/components/Application';
import ProfileTemplate from '@/components/Profile';
import MainTemplate from '@/components/Main';

import ProfileRoute from '@/routes/profile';


/* imported controllers */
import { ApplicationController } from '@/controllers/application';
import { ProfileController } from '@/controllers/profile';

function asTemplate(ComponentKlass: any) {
  return (_owner: any) => {
    // template lookup
    return () => {
      // template init
      return ComponentKlass;
    };
  };
}

const InitialRegistry = {
  'controller:application': ApplicationController,
  'controller:profile': ProfileController,
  'route:application': ApplicationRoute,
  'route:profile': ProfileRoute,
  'template:main': asTemplate(MainTemplate),
  'template:application': asTemplate(ApplicationTemplate),
  'template:profile': asTemplate(ProfileTemplate),

};

function registry(): IRegistry {
  return InitialRegistry;
}

export default registry;
