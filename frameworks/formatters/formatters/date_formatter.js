/**
  SC.DateFormatter is used with String.fmt to format dates with a format
  string. For example:

      "My date: %{date:yyyy} %{date:MM} %{date:dd}".fmt(myDate, SC.DateFormatter)

  You can use almost any of the Unicode Technical Standard #35 (draft 10)
  formatting strings.  See:

    http://unicode.org/reports/tr35/tr35-10.html#Date_Format_Patterns

  Note that you can only put one (yyyy, MM, dd) per token, but you can put as
  many tokens as you'd like.

*/
SC.DateFormatter = function(date, f) {
  if (!date) {
    throw new Error("No date passed to date formatter.");
  } else if (!date.getFullYear) {
    throw new Error("Object passed to date formatter was not a date!");
  }
  
  // f is expected to be a character, potentially repeated.
  // What we do is figure out what letter, and how many times it is repeated.
  // we also sanity-check.
  if (!f) {
    throw new Error("No formatting string passed to date formatter. Date: " + date);
  }
  
  var len = f.length, first = f[0], idx;
  for (idx = 1; idx < len; idx++) {
    if (f[idx] !== first) {
      throw new Error("Invalid format string for a date; all characters must be the same: " + f + "; date: " + date);
    }
  }
  
  var formatter = SC.DateFormatter[first];
  if (!formatter) {
    throw new Error("No formatter `" + first + "` exists for date: " + date);
  }
  
  return formatter(date, len);
};

//
// Era
//
SC.DateFormatter.G = function(date, count) {
  var era = "SC.Date.Era.";
  era += date.getFullYear() >= 0 ? "AD" : "BC";
  
  if (count <= 3) {
    // Abbreviated era (AD, BC, etc.)
    return (era + ".Abbreviated").loc();
  } else if (count === 4) {
    return (era + ".Full").loc();
  } else if (count === 5) {
    return (era + ".Letter").loc();
  } else {
    throw new Error("Invalid era format: expected at most 5 digits; found " + count + ".");
  }
};

//
// Year
//
SC.DateFormatter.y = function(date, count) {
  // this is expected to be the year not accounting for AD/BC.
  // JavaScript stores it as a negative for BC years, so we need to
  // do a Math.abs()
  var year = Math.abs(date.getFullYear()).toString();
  while (year.length < count) { year = '0' + year; }
  year = year.substr(year.length - count);
  return year;
};

// We only support gregorian calendars, so YYYY would mean the same as yyyy
SC.DateFormatter.Y = function(date, count) {
  return SC.DateFormatter.y(date, count);
};

// u just doesn't do Math.abs
SC.DateFormatter.u = function(date, count) {
  var lt0 = date.getFullYear() < 0;
  var year = Math.abs(date.getFullYear()).toString();
  
  while (year.length < count) { year = '0' + year; }
  year = year.substr(year.length - count);
  
  return (lt0 ? "-" : "") + year;
};

//
// Quarter
//
// I am not overly sure what "standAlone" is, but I think it may be for those
// cases where the month is "standalone" and therefore should be capitalized,
// and such...
SC.DateFormatter.Q = function(date, count, isStandAlone) {
  var month = date.getMonth(),
      quarter = Math.floor(month / 3) + 1,
      quarterName = "SC.Date.Quarter." + (isStandAlone ? "StandAlone." : "") + 
        "Q" + quarter;
  
  if (count === 1) {
    return "" + quarter;
  } else if (count === 2) {
    return "0" + quarter;
  } else if (count === 3) {
    return (quarterName + ".Abbreviated").loc();
  } else if (count == 4) {
    return (quarterName + ".Full").loc();
  } else {
    throw new Error("Unrecognized number of characters for quarter: " + count);
  }
};

SC.DateFormatter.q = function(date, count) {
  return SC.DateFormatter.Q(date, count, YES);
};

//
// Month
//

// It is a bit easier to translate an english month name to another language
// than to translate a number like 0, 1, 2, etc.--especially because you have
// no idea, as a translator: are we beginning at 0, or at 1?
SC.DateFormatter.ENGLISH_MONTH_NAMES = [
  "January", "February", "March", 
  "April", "May", "June",
  "July", "August", "September",
  "October", "November", "December"
];

SC.DateFormatter.M = function(date, count, isStandAlone) {
  
  var month = date.getMonth(),
      monthString = "" + (month + 1),
      monthName = "SC.Date.Month." + (isStandAlone ? "StandAlone." : "") + 
        SC.DateFormatter.ENGLISH_MONTH_NAMES[month];
  
  if (count === 1) {
    return monthString;
  } else if (count === 2) {
    if (monthString.length < 2) monthString = "0" + monthString;
    return monthString;
  } else if (count === 3) {
    return (monthName + ".Abbreviated").loc();
  } else if (count === 4) {
    return (monthName + ".Full").loc();
  } else if (count === 5) {
    return (monthName + ".Letter").loc();
  } else {
    throw new Error("The number of Ms or Ls must be from 1 to 5. Supplied: " + count);
  }
};

SC.DateFormatter.L = function(date, count) {
  return SC.DateFormatter.M(date, count, YES);
};

// OMITTED: l; used only with Chinese calendar.
SC.DateFormatter.l = function() { throw new Error("`l` date formatter not implemented."); };

//
// Omitted for now: Week Number
//
SC.DateFormatter.w = function(date, count) {
  throw new Error("Week number currently not supported for date formatting.");
};

SC.DateFormatter.W = function(date, count) {
  throw new Error("Week number currently not supported for date formatting.");
};

//
// Day
//
SC.DateFormatter.d = function(date, count) {
  // day of month
  var dayString = "" + date.getDate();
  if (count > dayString.length) dayString = "0" + dayString;
  return dayString;
};

SC.DateFormatter.D = function(date, count) {
  // day of year
  var firstDayOfYear = new Date(date.getFullYear(), 0, 1),
      timestamp = firstDayOfYear.getTime(),
      diff = date.getTime() - timestamp,
      days = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  
  days = "" + days;
  while (days.length < count) days = "0" + days;
  return days;
};

SC.DateFormatter.F = function(date, count) {
  // day of week in month; for instance, 2 if it is the second wednesday in the month.
  throw new Error("Day of week in month (F) is not supported in date formatting");
};

SC.DateFormatter.g = function(date, count) {
  // Julian day, modified: should be based on local timezone,
  // and, more than that, local timezone midnight (not noon)
  throw new Error("Julian day not supported in date formatting.");
};

//
// Week Day
//

// See discussion of using a mapping to english names for months...
SC.DateFormatter.ENGLISH_DAY_NAMES = [
  // JavaScript starts week on Sunday
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];


SC.DateFormatter.E = function(date, count) {
  // E is like e, except that it doesn't ever create a day-of-week number,
  // and therefore, if the count is less than three, it should be coerced
  // up to three, because it means the same thing (short day)
  if (count < 3) count = 3;
  return SC.DateFormatter.e(date, count);
};

SC.DateFormatter.e = function(date, count, isStandAlone) {
  var day = date.getDay(),
      dayString = "" + (day + 1),
      dayName = "SC.Date.Day." + (isStandAlone ? "StandAlone." : "") +
        SC.DateFormatter.ENGLISH_DAY_NAMES[day];
  
  if (count === 1) {
    return dayString;
  } else if (count === 2) {
    dayString = "0" + dayString;
    return dayString;
  } else if (count === 3) {
    return (dayName + ".Abbreviated").loc();
  } else if (count === 4) {
    return (dayName + ".Full").loc();
  } else if (count === 5) {
    return (dayName + ".Letter").loc();
  } else {
    throw new Error("Unrecognized number of `e`s, `c`s, or `E`s in date format string.");
  }
};

SC.DateFormatter.c = function(date, count) {
  return SC.DateFormatter.e(date, count, YES);
};



//
// Period
//
SC.DateFormatter.a = function(date, count) {
  if (count !== 1) {
    throw new Error("`a` can only be included in a date format string once.");
  }
  
  var name = "SC.Date.Period." + (date.getHours() > 11 ? "PM" : "AM");
  return name.loc();
};

//
// Hour
//
// upper-case: 0-based. WEIRD PART: upper-case H and lower-case k are
// 24 hour. WTF? This makes NO SENSE AT ALL!
SC.DateFormatter._h = function(date, count, is24, base) {
  var hour = date.getHours();
  if (!is24) hour = hour % 12;
  if (base) {
    if (!is24) {
      // if hour is 0, then we need to make it 12.
      if (hour === 0) hour = 12;
    } else {
      // if hour is 0, hour needs to be 24
      if (hour === 0) hour = 24;
    }
  }
  
  var hourStr = "" + hour;
  if (hourStr.length < count) hourStr = "0" + hourStr;
  
  return hourStr;
};

SC.DateFormatter.h = function(date, count) {
  return SC.DateFormatter._h(date, count, NO, 1);
};

SC.DateFormatter.H = function(date, count) {
  return SC.DateFormatter._h(date, count, YES, 0);
};

SC.DateFormatter.K = function(date, count) {
  return SC.DateFormatter._h(date, count, NO, 0);
};

SC.DateFormatter.k = function(date, count) {
  return SC.DateFormatter._h(date, count, YES, 1);
};

//
// Minute
//
SC.DateFormatter.m = function(date, count) {
  var str = "" + date.getMinutes();
  if (str.length < count) str = "0" + str;
  return str;
};

SC.DateFormatter.s = function(date, count) {
  var str = "" + date.getSeconds();
  if (str.length < count) str = "0" + str;
  return str;
};

SC.DateFormatter.S = function(date, count) {
  var fraction = date.getMilliseconds() / 1000.0,
      mult = Math.pow(10, count);
  
  fraction = Math.round(fraction * mult);
  fraction = "" + fraction;
  
  while(fraction.length < count) fraction="0" + fraction;
  return fraction;
};

SC.DateFormatter.A = function(date, count) {
  // ms in day...
  var timestamp = new Date(date.getFullYear(), date.getMonth(), date.getDay()).getTime();
  var res = date.getTime() - timestamp;
  res = "" + res;
  while (res.length < count) res = "0" + res;
  return res;
};

SC.DateFormatter.z = 
SC.DateFormatter.Z = 
SC.DateFormatter.v = 
SC.DateFormatter.V = function(date, count) {
  throw new Error("Timezone not supported in date format strings.");
};


