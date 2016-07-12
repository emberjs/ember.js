/*
Note that if your data is too large, there _will_ be overflow.
*/

function asc(a, b) { return a-b; }

let config_params = {
  bucket_precision: function(o, s) {
    if(typeof s !== "number" || s <= 0) {
      throw new Error("bucket_precision must be a positive number");
    }
    o._config.bucket_precision = s;
    o.buckets = [];
  },

  buckets: function(o, b) {
    if(!Array.isArray(b) || b.length === 0) {
      throw new Error("buckets must be an array of bucket limits");
    }

    o._config.buckets = b;
    o.buckets = [];
  },

  bucket_extension_interval: function(o, s) {
    if(s === undefined)
      return;
    if(typeof s !== "number" || s<=0) {
      throw new Error("bucket_extension_interval must be a positive number");
    }
    o._config.bucket_extension_interval = s;
  },

  store_data: function(o, s) {
    if(typeof s !== "boolean") {
      throw new Error("store_data must be a true or false");
    }
    o._config.store_data = s;
  },

  sampling: function(o, s) {
    if(typeof s !== "boolean") {
      throw new Error("sampling must be a true or false");
    }
    o._config.sampling = s;
  }
};

export default function Stats(c) {
  this._config = { store_data:  true };

  if(c) {
    for(let k in config_params) {
      if(c.hasOwnProperty(k)) {
        config_params[k](this, c[k]);
      }
    }
  }

  this.reset();
}

Stats.prototype = {

  reset: function() {
    if(this._config.store_data)
      this.data = [];

    this.length = 0;

    this.sum = 0;
    this.sum_of_squares = 0;
    this.sum_of_logs = 0;
    this.sum_of_square_of_logs = 0;
    this.zeroes = 0;
    this.max = this.min = null;

    this._reset_cache();

    return this;
  },

  _reset_cache: function() {
    this._stddev = null;

    if(this._config.store_data)
      this._data_sorted = null;
  },

  _find_bucket: function(a) {
    let b=0, e, l;
    if(this._config.buckets) {
      l = this._config.buckets.length;
      if(this._config.bucket_extension_interval && a >= this._config.buckets[l-1]) {
        e=a-this._config.buckets[l-1];
        b = e / this._config.bucket_extension_interval + l;
        if(this._config.buckets[b] === undefined)
          this._config.buckets[b] = this._config.buckets[l-1] + (e / this._config.bucket_extension_interval + 1)*this._config.bucket_extension_interval;
        if(this._config.buckets[b-1] === undefined)
          this._config.buckets[b-1] = this._config.buckets[l-1] + e;
      }
      for(; b<l; b++) {
        if(a < this._config.buckets[b]) {
          break;
        }
      }
    }
    else if(this._config.bucket_precision) {
      b = Math.floor(a/this._config.bucket_precision);
    }

    return b;
  },

  _add_cache: function(a) {
    let tuple=[1], i;
    if(a instanceof Array) {
      tuple = a;
      a = tuple.shift();
    }

    this.sum += a*tuple[0];
    this.sum_of_squares += a*a*tuple[0];
    if(a === 0) {
      this.zeroes++;
    }
    else {
      this.sum_of_logs += Math.log(a)*tuple[0];
      this.sum_of_square_of_logs += Math.pow(Math.log(a), 2)*tuple[0];
    }
    this.length += tuple[0];

    if(tuple[0] > 0) {
      if(this.max === null || this.max < a)
        this.max = a;
      if(this.min === null || this.min > a)
        this.min = a;
    }

    if(this.buckets) {
      let b = this._find_bucket(a);
      if(!this.buckets[b])
        this.buckets[b] = [0];
      this.buckets[b][0] += tuple.shift();

      for(i=0; i<tuple.length; i++)
        this.buckets[b][i+1] = (this.buckets[b][i+1]|0) + (tuple[i]|0);
    }

    this._reset_cache();
  },

  _del_cache: function(a) {
    let tuple=[1], i;
    if(a instanceof Array) {
      tuple = a;
      a = tuple.shift();
    }

    this.sum -= a*tuple[0];
    this.sum_of_squares -= a*a*tuple[0];
    if(a === 0) {
      this.zeroes--;
    }
    else {
      this.sum_of_logs -= Math.log(a)*tuple[0];
      this.sum_of_square_of_logs -= Math.pow(Math.log(a), 2)*tuple[0];
    }
    this.length -= tuple[0];

    if(this._config.store_data) {
      if(this.length === 0) {
        this.max = this.min = null;
      }
      if(this.length === 1) {
        this.max = this.min = this.data[0];
      }
      else if(tuple[0] > 0 && (this.max === a || this.min === a)) {
        let i = this.length-1;
        if(i>=0) {
          this.max = this.min = this.data[i--];
          while(i-- >= 0) {
            if(this.max < this.data[i])
              this.max = this.data[i];
            if(this.min > this.data[i])
              this.min = this.data[i];
          }
        }
      }
    }

    if(this.buckets) {
      let b=this._find_bucket(a);
      if(this.buckets[b]) {
        this.buckets[b][0] -= tuple.shift();

        if(this.buckets[b][0] === 0)
          delete this.buckets[b];
        else
          for(i=0; i<tuple.length; i++)
            this.buckets[b][i+1] = (this.buckets[b][i+1]|0) - (tuple[i]|0);
      }
    }

    this._reset_cache();
  },

  push: function() {
    let i, a, args=Array.prototype.slice.call(arguments, 0);
    if(args.length && args[0] instanceof Array)
      args = args[0];
    for(i=0; i<args.length; i++) {
      a = args[i];
      if(this._config.store_data)
        this.data.push(a);
      this._add_cache(a);
    }

    return this;
  },

  push_tuple: function(tuple) {
    if(!this.buckets) {
      throw new Error("push_tuple is only valid when using buckets");
    }
    this._add_cache(tuple);
  },

  pop: function() {
    if(this.length === 0 || this._config.store_data === false)
      return undefined;

    let a = this.data.pop();
    this._del_cache(a);

    return a;
  },

  remove_tuple: function(tuple) {
    if(!this.buckets) {
      throw new Error("remove_tuple is only valid when using buckets");
    }
    this._del_cache(tuple);
  },

  reset_tuples: function(tuple) {
    let b, l, t, ts=tuple.length;
    if(!this.buckets) {
      throw new Error("reset_tuple is only valid when using buckets");
    }

    for(b=0, l=this.buckets.length; b<l; b++) {
      if(!this.buckets[b] || this.buckets[b].length <= 1) {
        continue;
      }
      for(t=0; t<ts; t++) {
        if(typeof tuple[t] !== 'undefined') {
          this.buckets[b][t] = tuple[t];
        }
      }
    }
  },

  unshift: function() {
    let i, a, args=Array.prototype.slice.call(arguments, 0);
    if(args.length && args[0] instanceof Array)
      args = args[0];
    i=args.length;
    while(i--) {
      a = args[i];
      if(this._config.store_data)
        this.data.unshift(a);
      this._add_cache(a);
    }

    return this;
  },

  shift: function() {
    if(this.length === 0 || this._config.store_data === false)
      return undefined;

    let a = this.data.shift();
    this._del_cache(a);

    return a;
  },

  amean: function() {
    if(this.length === 0)
      return NaN;
    return this.sum/this.length;
  },

  gmean: function() {
    if(this.length === 0)
      return NaN;
    if(this.zeroes > 0)
      return NaN;
    return Math.exp(this.sum_of_logs/this.length);
  },

  stddev: function() {
    if(this.length === 0)
      return NaN;
    let n=this.length;
    if(this._config.sampling)
      n--;
    if(this._stddev === null)
      this._stddev = Math.sqrt((this.length * this.sum_of_squares - this.sum*this.sum)/(this.length*n));

    return this._stddev;
  },

  gstddev: function() {
    if(this.length === 0)
      return NaN;
    if(this.zeroes > 0)
      return NaN;
    let n=this.length;
    if(this._config.sampling)
      n--;
    return Math.exp(Math.sqrt((this.length * this.sum_of_square_of_logs - this.sum_of_logs*this.sum_of_logs)/(this.length*n)));
  },

  moe: function() {
    if(this.length === 0)
      return NaN;
    // see http://en.wikipedia.org/wiki/Standard_error_%28statistics%29
    return 1.96*this.stddev()/Math.sqrt(this.length);
  },

  range: function() {
    if(this.length === 0)
      return [NaN, NaN];
    return [this.min, this.max];
  },

  distribution: function() {
    if(this.length === 0)
      return [];
    if(!this.buckets)
      throw new Error("bucket_precision or buckets not configured.");

    let d=[], i, j, l;

    if(this._config.buckets) {
      j=this.min;
      l=Math.min(this.buckets.length, this._config.buckets.length);

      for(i=0; i<l; j=this._config.buckets[i++]) {  // this has to be i++ and not ++i
        if(this._config.buckets[i] === undefined && this._config.bucket_extension_interval)
          this._config.buckets[i] = this._config.buckets[i-1] + this._config.bucket_extension_interval;
        if(this.min > this._config.buckets[i])
          continue;

        d[i] = {
          bucket: (j+this._config.buckets[i])/2,
          range: [j, this._config.buckets[i]],
          count: (this.buckets[i]?this.buckets[i][0]:0),
          tuple: this.buckets[i]?this.buckets[i].slice(1):[]
        };

        if(this.max < this._config.buckets[i])
          break;
      }
      if(i === l && this.buckets[i]) {
        d[i] = {
          bucket: (j + this.max)/2,
          range: [j, this.max],
          count: this.buckets[i][0],
          tuple: this.buckets[i]?this.buckets[i].slice(1):[]
        };
      }
    }
    else if(this._config.bucket_precision) {
      i=Math.floor(this.min/this._config.bucket_precision);
      l=Math.floor(this.max/this._config.bucket_precision)+1;
      for(j=0; i<l && i<this.buckets.length; i++, j++) {
        d[j] = {
          bucket: (i+0.5)*this._config.bucket_precision,
          range: [i*this._config.bucket_precision, (i+1)*this._config.bucket_precision],
          count: this.buckets[i]?this.buckets[i][0]:0,
          tuple: this.buckets[i]?this.buckets[i].slice(1):[]
        };
      }
    }

    return d;

  },

  percentile: function(p) {
    if(this.length === 0 || (!this._config.store_data && !this.buckets))
      return NaN;

    // If we come here, we either have sorted data or sorted buckets

    let v;

    if(p <=  0)
      v=0;
    else if(p === 25)
      v = [Math.floor((this.length-1)*0.25), Math.ceil((this.length-1)*0.25)];
    else if(p === 50)
      v = [Math.floor((this.length-1)*0.5), Math.ceil((this.length-1)*0.5)];
    else if(p === 75)
      v = [Math.floor((this.length-1)*0.75), Math.ceil((this.length-1)*0.75)];
    else if(p >= 100)
      v = this.length-1;
    else
      v = Math.floor(this.length*p/100);

    if(v === 0)
      return this.min;
    if(v === this.length-1)
      return this.max;

    if(this._config.store_data) {
      if(this._data_sorted === null)
        this._data_sorted = this.data.slice(0).sort(asc);

      if(typeof v === 'number')
        return this._data_sorted[v];
      else
        return (this._data_sorted[v[0]] + this._data_sorted[v[1]])/2;
    }
    else {
      let j;
      if(typeof v !== 'number')
        v = (v[0]+v[1])/2;

      if(this._config.buckets)
        j=0;
      else if(this._config.bucket_precision)
        j = Math.floor(this.min/this._config.bucket_precision);

      for(; j<this.buckets.length; j++) {
        if(!this.buckets[j])
          continue;
        if(v<=this.buckets[j][0]) {
          break;
        }
        v-=this.buckets[j][0];
      }

      return this._get_nth_in_bucket(v, j);
    }
  },

  _get_nth_in_bucket: function(n, b) {
    let range = [];
    if(this._config.buckets) {
      range[0] = (b>0?this._config.buckets[b-1]:this.min);
      range[1] = (b<this._config.buckets.length?this._config.buckets[b]:this.max);
    }
    else if(this._config.bucket_precision) {
      range[0] = Math.max(b*this._config.bucket_precision, this.min);
      range[1] = Math.min((b+1)*this._config.bucket_precision, this.max);
    }
    return range[0] + (range[1] - range[0])*n/this.buckets[b][0];
  },

  median: function() {
    return this.percentile(50);
  },

  iqr: function() {
    let q1, q3, fw;

    q1 = this.percentile(25);
    q3 = this.percentile(75);

    fw = (q3-q1)*1.5;

    return this.band_pass(q1-fw, q3+fw, true);
  },

  band_pass: function(low, high, open, config) {
    let i, j, b, b_val, i_val;

    if(!config)
      config = this._config;

    b = new Stats(config);

    if(this.length === 0)
      return b;

    if(this._config.store_data) {
      if(this._data_sorted === null)
        this._data_sorted = this.data.slice(0).sort(asc);

      for(i=0; i<this.length && (this._data_sorted[i] < high || (!open && this._data_sorted[i] === high)); i++) {
        if(this._data_sorted[i] > low || (!open && this._data_sorted[i] === low)) {
          b.push(this._data_sorted[i]);
        }
      }
    }
    else if(this._config.buckets) {
      for(i=0; i<=this._config.buckets.length; i++) {
        if(this._config.buckets[i] < this.min)
          continue;

        b_val = (i===0?this.min:this._config.buckets[i-1]);
        if(b_val < this.min)
          b_val = this.min;
        if(b_val > this.max)
          b_val = this.max;

        if(high < b_val || (open && high === b_val)) {
          break;
        }
        if(low < b_val || (!open && low === b_val)) {
          for(j=0; j<(this.buckets[i]?this.buckets[i][0]:0); j++) {
            i_val = Stats.prototype._get_nth_in_bucket.call(this, j, i);
            if( (i_val > low || (!open && i_val === low))
              && (i_val < high || (!open && i_val === high))
            ) {
              b.push(i_val);
            }
          }
        }
      }

      b.min = Math.max(low, b.min);
      b.max = Math.min(high, b.max);
    }
    else if(this._config.bucket_precision) {
      let low_i = Math.floor(low/this._config.bucket_precision),
          high_i = Math.floor(high/this._config.bucket_precision)+1;

      for(i=low_i; i<Math.min(this.buckets.length, high_i); i++) {
        for(j=0; j<(this.buckets[i]?this.buckets[i][0]:0); j++) {
          i_val = Stats.prototype._get_nth_in_bucket.call(this, j, i);
          if( (i_val > low || (!open && i_val === low))
            && (i_val < high || (!open && i_val === high))
          ) {
            b.push(i_val);
          }
        }
      }

      b.min = Math.max(low, b.min);
      b.max = Math.min(high, b.max);
    }

    return b;
  },

  copy: function(config) {
    let b = Stats.prototype.band_pass.call(this, this.min, this.max, false, config);

    b.sum = this.sum;
    b.sum_of_squares = this.sum_of_squares;
    b.sum_of_logs = this.sum_of_logs;
    b.sum_of_square_of_logs = this.sum_of_square_of_logs;
    b.zeroes = this.zeroes;

    return b;
  },

  Σ: function() {
    return this.sum;
  },

  Π: function() {
    return this.zeroes > 0 ? 0 : Math.exp(this.sum_of_logs);
  }
};

Stats.prototype.σ=Stats.prototype.stddev;
Stats.prototype.μ=Stats.prototype.amean;
