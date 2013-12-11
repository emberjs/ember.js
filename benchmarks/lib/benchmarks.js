/* jshint esnext:true */

import { suite as obj } from './suites/object/object_create';
import { suite as obj_scalar } from './suites/object/object_create_with_scalar';
import { suite as obj_cp } from './suites/object/object_with_cp_create';
import { suite as obj_obsrv } from './suites/object/object_with_observer_create';
import { suite as view_destroy } from './suites/views/destroy_view';
import { suite as view_create } from './suites/views/create_view';
import { suite as each_view } from './suites/views/each_view';
import { suite as bound_if } from './suites/helpers/if';
import { suite as bound_unless } from './suites/helpers/unless';
import { suite as unbound_if } from './suites/helpers/unbound_if';
import { suite as unbound_unless } from './suites/helpers/unbound_unless';

export var benchmarks = [
             obj,
             obj_scalar,
             obj_cp,
             obj_obsrv,
             view_destroy,
             view_create,
             each_view,
             bound_if,
             unbound_if,
             bound_unless,
             unbound_unless
           ];
