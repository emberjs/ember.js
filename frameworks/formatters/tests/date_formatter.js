var date;
module("Date Formatting", {
  setup: function() {
    date = new Date(2011, 7, 12, 10, 15, 25);
  }
});

function fmt(str, date) {
  return str.fmt({ date: date, dateFormatter: SC.DateFormatter });
}

test("Era", function() {
  equals(fmt("%{date:G}", date), "AD", "One G");
  equals(fmt("%{date:GG}", date), "AD", "Two Gs");
  equals(fmt("%{date:GGG}", date), "AD", "Three Gs");
  equals(fmt("%{date:GGGG}", date), "Anno Domini", "Four Gs");
  equals(fmt("%{date:GGGGG}", date), "A", "Five Gs");
  
  date = new Date(-100, 1, 1);
  equals(fmt("%{date:G}", date), "BC", "One G");
  equals(fmt("%{date:GG}", date), "BC", "Two Gs");
  equals(fmt("%{date:GGG}", date), "BC", "Three Gs");
  
  // seems rather politically-incorrect, but from what I can tell, we DO use
  // BC/AD, and BC stands for that. BCE would be Before Common Era.
  equals(fmt("%{date:GGGG}", date), "Before Christ", "Four Gs");
  equals(fmt("%{date:GGGGG}", date), "B", "Five Gs");
});

test("Year", function() {
  date.setFullYear(10);
  equals(fmt("%{date:y}", date), "0");
  equals(fmt("%{date:yy}", date), "10");
  equals(fmt("%{date:yyy}", date), "010");
  equals(fmt("%{date:yyyy}", date), "0010");
  
  date.setFullYear(2010);
  equals(fmt("%{date:y}", date), "0");
  equals(fmt("%{date:yy}", date), "10");
  equals(fmt("%{date:yyy}", date), "010");
  equals(fmt("%{date:yyyy}", date), "2010");
  
  date.setFullYear(-10);
  equals(fmt("%{date:y}", date), "0");
  equals(fmt("%{date:yy}", date), "10");
  equals(fmt("%{date:yyy}", date), "010");
  equals(fmt("%{date:yyyy}", date), "0010");
});

test("Year - Negative for BC", function() {
  date.setFullYear(10);
  equals(fmt("%{date:u}", date), "0");
  equals(fmt("%{date:uu}", date), "10");
  equals(fmt("%{date:uuu}", date), "010");
  equals(fmt("%{date:uuuu}", date), "0010");
  
  date.setFullYear(-10);
  equals(fmt("%{date:u}", date), "-0");
  equals(fmt("%{date:uu}", date), "-10");
  equals(fmt("%{date:uuu}", date), "-010");
  equals(fmt("%{date:uuuu}", date), "-0010");
});

test("Quarter", function() {
  date = new Date(2011, 0, 1);
  equals(fmt("%{date:Q}", date), "1");
  equals(fmt("%{date:QQ}", date), "01");
  equals(fmt("%{date:QQQ}", date), "Q1");
  equals(fmt("%{date:QQQQ}", date), "1st quarter");
  
  equals(fmt("%{date:q}", date), "1");
  equals(fmt("%{date:qq}", date), "01");
  equals(fmt("%{date:qqq}", date), "Q1");
  equals(fmt("%{date:qqqq}", date), "1st Quarter");
  
  
  date = new Date(2011, 2, 31);
  equals(fmt("%{date:Q}", date), "1");
  equals(fmt("%{date:QQ}", date), "01");
  equals(fmt("%{date:QQQ}", date), "Q1");
  equals(fmt("%{date:QQQQ}", date), "1st quarter");
  
  equals(fmt("%{date:q}", date), "1");
  equals(fmt("%{date:qq}", date), "01");
  equals(fmt("%{date:qqq}", date), "Q1");
  equals(fmt("%{date:qqqq}", date), "1st Quarter");
  
  date = new Date(2011, 3, 1);
  equals(fmt("%{date:Q}", date), "2");
  equals(fmt("%{date:QQ}", date), "02");
  equals(fmt("%{date:QQQ}", date), "Q2");
  equals(fmt("%{date:QQQQ}", date), "2nd quarter");
  
  equals(fmt("%{date:q}", date), "2");
  equals(fmt("%{date:qq}", date), "02");
  equals(fmt("%{date:qqq}", date), "Q2");
  equals(fmt("%{date:qqqq}", date), "2nd Quarter");
  
  
  date = new Date(2011, 5, 30);
  equals(fmt("%{date:Q}", date), "2");
  equals(fmt("%{date:QQ}", date), "02");
  equals(fmt("%{date:QQQ}", date), "Q2");
  equals(fmt("%{date:QQQQ}", date), "2nd quarter");
  
  equals(fmt("%{date:q}", date), "2");
  equals(fmt("%{date:qq}", date), "02");
  equals(fmt("%{date:qqq}", date), "Q2");
  equals(fmt("%{date:qqqq}", date), "2nd Quarter");
  
  date = new Date(2011, 6, 1);
  equals(fmt("%{date:Q}", date), "3");
  equals(fmt("%{date:QQ}", date), "03");
  equals(fmt("%{date:QQQ}", date), "Q3");
  equals(fmt("%{date:QQQQ}", date), "3rd quarter");
  
  equals(fmt("%{date:q}", date), "3");
  equals(fmt("%{date:qq}", date), "03");
  equals(fmt("%{date:qqq}", date), "Q3");
  equals(fmt("%{date:qqqq}", date), "3rd Quarter");
  
  date = new Date(2011, 8, 30);
  equals(fmt("%{date:Q}", date), "3");
  equals(fmt("%{date:QQ}", date), "03");
  equals(fmt("%{date:QQQ}", date), "Q3");
  equals(fmt("%{date:QQQQ}", date), "3rd quarter");
  
  equals(fmt("%{date:q}", date), "3");
  equals(fmt("%{date:qq}", date), "03");
  equals(fmt("%{date:qqq}", date), "Q3");
  equals(fmt("%{date:qqqq}", date), "3rd Quarter");
  
  date = new Date(2011, 9, 1);
  equals(fmt("%{date:Q}", date), "4");
  equals(fmt("%{date:QQ}", date), "04");
  equals(fmt("%{date:QQQ}", date), "Q4");
  equals(fmt("%{date:QQQQ}", date), "4th quarter");
  
  equals(fmt("%{date:q}", date), "4");
  equals(fmt("%{date:qq}", date), "04");
  equals(fmt("%{date:qqq}", date), "Q4");
  equals(fmt("%{date:qqqq}", date), "4th Quarter");
  
  date = new Date(2011, 11, 31);
  equals(fmt("%{date:Q}", date), "4");
  equals(fmt("%{date:QQ}", date), "04");
  equals(fmt("%{date:QQQ}", date), "Q4");
  equals(fmt("%{date:QQQQ}", date), "4th quarter");
  
  equals(fmt("%{date:q}", date), "4");
  equals(fmt("%{date:qq}", date), "04");
  equals(fmt("%{date:qqq}", date), "Q4");
  equals(fmt("%{date:qqqq}", date), "4th Quarter");
  
  
});

test("Month", function() {
  //
  // make the standalone month names distinctive
  //
  SC.stringsFor('english', {
    "SC.Date.Month.StandAlone.January.Abbreviated": "SJan",
    "SC.Date.Month.StandAlone.January.Full": "SJanuary",
    "SC.Date.Month.StandAlone.January.Letter": "SJ",

    "SC.Date.Month.StandAlone.February.Abbreviated": "SFeb",
    "SC.Date.Month.StandAlone.February.Full": "SFebruary",
    "SC.Date.Month.StandAlone.February.Letter": "SF",

    "SC.Date.Month.StandAlone.March.Abbreviated": "SMar",
    "SC.Date.Month.StandAlone.March.Full": "SMarch",
    "SC.Date.Month.StandAlone.March.Letter": "SM",

    "SC.Date.Month.StandAlone.April.Abbreviated": "SApr",
    "SC.Date.Month.StandAlone.April.Full": "SApril",
    "SC.Date.Month.StandAlone.April.Letter": "SA",

    "SC.Date.Month.StandAlone.May.Abbreviated": "SMay",
    "SC.Date.Month.StandAlone.May.Full": "SMay",
    "SC.Date.Month.StandAlone.May.Letter": "SM",

    "SC.Date.Month.StandAlone.June.Abbreviated": "SJun",
    "SC.Date.Month.StandAlone.June.Full": "SJune",
    "SC.Date.Month.StandAlone.June.Letter": "SJ",

    "SC.Date.Month.StandAlone.July.Abbreviated": "SJul",
    "SC.Date.Month.StandAlone.July.Full": "SJuly",
    "SC.Date.Month.StandAlone.July.Letter": "SJ",

    "SC.Date.Month.StandAlone.August.Abbreviated": "SAug",
    "SC.Date.Month.StandAlone.August.Full": "SAugust",
    "SC.Date.Month.StandAlone.August.Letter": "SA",

    "SC.Date.Month.StandAlone.September.Abbreviated": "SSep",
    "SC.Date.Month.StandAlone.September.Full": "SSeptember",
    "SC.Date.Month.StandAlone.September.Letter": "SS",

    "SC.Date.Month.StandAlone.October.Abbreviated": "SOct",
    "SC.Date.Month.StandAlone.October.Full": "SOctober",
    "SC.Date.Month.StandAlone.October.Letter": "SO",

    "SC.Date.Month.StandAlone.November.Abbreviated": "SNov",
    "SC.Date.Month.StandAlone.November.Full": "SNovember",
    "SC.Date.Month.StandAlone.November.Letter": "SN",

    "SC.Date.Month.StandAlone.December.Abbreviated": "SDec",
    "SC.Date.Month.StandAlone.December.Full": "SDecember",
    "SC.Date.Month.StandAlone.December.Letter": "SD"
  });
  
  
  function check(month, one, two, three, four, five) {
    date = new Date(2011, month, 1);
    equals(fmt("%{date:M}", date), one);
    equals(fmt("%{date:MM}", date), two);
    equals(fmt("%{date:MMM}", date), three);
    equals(fmt("%{date:MMMM}", date), four);
    equals(fmt("%{date:MMMMM}", date), five);
  }
  
  check(0,  "1",  "01", "Jan", "January", "J");
  check(1,  "2",  "02", "Feb", "February", "F");
  check(2,  "3",  "03", "Mar", "March", "M");
  check(3,  "4",  "04", "Apr", "April", "A");
  check(4,  "5",  "05", "May", "May", "M");
  check(5,  "6",  "06", "Jun", "June", "J");
  check(6,  "7",  "07", "Jul", "July", "J");
  check(7,  "8",  "08", "Aug", "August", "A");
  check(8,  "9",  "09", "Sep", "September", "S");
  check(9,  "10", "10", "Oct", "October", "O");
  check(10, "11", "11", "Nov", "November", "N");
  check(11, "12", "12", "Dec", "December", "D");
  
  function checkL(month, one, two, three, four, five) {
    date = new Date(2011, month, 1);
    equals(fmt("%{date:L}", date), one);
    equals(fmt("%{date:LL}", date), two);
    equals(fmt("%{date:LLL}", date), three);
    equals(fmt("%{date:LLLL}", date), four);
    equals(fmt("%{date:LLLLL}", date), five);
  }

  checkL(0,  "1",  "01", "SJan", "SJanuary", "SJ");
  checkL(1,  "2",  "02", "SFeb", "SFebruary", "SF");
  checkL(2,  "3",  "03", "SMar", "SMarch", "SM");
  checkL(3,  "4",  "04", "SApr", "SApril", "SA");
  checkL(4,  "5",  "05", "SMay", "SMay", "SM");
  checkL(5,  "6",  "06", "SJun", "SJune", "SJ");
  checkL(6,  "7",  "07", "SJul", "SJuly", "SJ");
  checkL(7,  "8",  "08", "SAug", "SAugust", "SA");
  checkL(8,  "9",  "09", "SSep", "SSeptember", "SS");
  checkL(9,  "10", "10", "SOct", "SOctober", "SO");
  checkL(10, "11", "11", "SNov", "SNovember", "SN");
  checkL(11, "12", "12", "SDec", "SDecember", "SD");
  
});



//
// Week Number: Not done...
//


//
// Day
//
test("Day", function() {
  date = new Date(2011, 1, 2);
  fmt("%{date:d}", date, "2");
  fmt("%{date:dd}", date, "02");
  
  date = new Date(2011, 1, 12);
  fmt("%{date:d}", date, "12");
  fmt("%{date:dd}", date, "12");
});

test("Day of Year", function() {
  date = new Date(2011, 0, 1);
  equals(fmt("%{date:D}", date), "1");
  
  date = new Date(2011, 1, 1);
  equals(fmt("%{date:D}", date), "32");
});

test("Day of Week", function() {
  SC.stringsFor("English", {
    "SC.Date.Day.StandAlone.Monday.Abbreviated": "SMon",
    "SC.Date.Day.StandAlone.Monday.Full": "SMonday",
    "SC.Date.Day.StandAlone.Monday.Letter": "SM",

    "SC.Date.Day.StandAlone.Tuesday.Abbreviated": "STue",
    "SC.Date.Day.StandAlone.Tuesday.Full": "STuesday",
    "SC.Date.Day.StandAlone.Tuesday.Letter": "ST",

    "SC.Date.Day.StandAlone.Wednesday.Abbreviated": "SWed",
    "SC.Date.Day.StandAlone.Wednesday.Full": "SWednesday",
    "SC.Date.Day.StandAlone.Wednesday.Letter": "SW",

    "SC.Date.Day.StandAlone.Thursday.Abbreviated": "SThu",
    "SC.Date.Day.StandAlone.Thursday.Full": "SThursday",
    "SC.Date.Day.StandAlone.Thursday.Letter": "SR",

    "SC.Date.Day.StandAlone.Friday.Abbreviated": "SFri",
    "SC.Date.Day.StandAlone.Friday.Full": "SFriday",
    "SC.Date.Day.StandAlone.Friday.Letter": "SF",

    "SC.Date.Day.StandAlone.Saturday.Abbreviated": "SSat",
    "SC.Date.Day.StandAlone.Saturday.Full": "SSaturday",
    "SC.Date.Day.StandAlone.Saturday.Letter": "SS",

    "SC.Date.Day.StandAlone.Sunday.Abbreviated": "SSun",
    "SC.Date.Day.StandAlone.Sunday.Full": "SSunday",
    "SC.Date.Day.StandAlone.Sunday.Letter": "SS"
  });
  
  function check(day, number, abbr, full, letter) {
    date = new Date(2011, 7, day);
    equals(fmt("%{date:E}", date), abbr);
    equals(fmt("%{date:EE}", date), abbr);
    equals(fmt("%{date:EEE}", date), abbr);
    equals(fmt("%{date:EEEE}", date), full);
    equals(fmt("%{date:EEEEE}", date), letter);
    
    equals(fmt("%{date:e}", date), "" + number);
    equals(fmt("%{date:ee}", date), "0" + number);
    equals(fmt("%{date:eee}", date), abbr);
    equals(fmt("%{date:eeee}", date), full);
    equals(fmt("%{date:eeeee}", date), letter);
    
    equals(fmt("%{date:c}", date), "" + number);
    equals(fmt("%{date:cc}", date), "0" + number);
    equals(fmt("%{date:ccc}", date), "S" + abbr);
    equals(fmt("%{date:cccc}", date), "S" + full);
    equals(fmt("%{date:ccccc}", date), "S" + letter);
  }
  
  // the first is the day of the month of August 2011; the second is the
  // expected day-of-week number
  check(1, 2, "Mon", "Monday", "M");
  check(2, 3, "Tue", "Tuesday", "T");
  check(3, 4, "Wed", "Wednesday", "W");
  check(4, 5, "Thu", "Thursday", "R");
  check(5, 6, "Fri", "Friday", "F");
  check(6, 7, "Sat", "Saturday", "S");
  check(7, 1, "Sun", "Sunday", "S");

});


test("Period", function() {
  // one in the morning...
  date = new Date(2011, 7, 1, 1);
  equals(fmt("%{date:a}", date), "AM");
  
  date = new Date(2011, 7, 1, 11);
  equals(fmt("%{date:a}", date), "AM");
  
  date = new Date(2011, 7, 1, 12);
  equals(fmt("%{date:a}", date), "PM");
  
});


test("Hour", function() {
  // 12:00 AM
  date = new Date(2011, 7, 1, 0);
  
  // h: 12hr, 12:00 == 12:00
  equals(fmt("%{date:h}", date), "12");
  equals(fmt("%{date:hh}", date), "12");
  
  // K: 12hr, 12:00 == 0:00
  equals(fmt("%{date:K}", date), "0");
  equals(fmt("%{date:KK}", date), "00");
  
  // H: 24hr, 24:00 == 0:00
  equals(fmt("%{date:H}", date), "0");
  equals(fmt("%{date:HH}", date), "00");
  
  // k: 24hr, 24:00 == 24:00
  equals(fmt("%{date:k}", date), "24");
  equals(fmt("%{date:kk}", date), "24");
  
  
  // 1:00 AM
  date = new Date(2011, 7, 1, 1);
  
  // h: 12hr, 12:00 == 12:00
  equals(fmt("%{date:h}", date), "1");
  equals(fmt("%{date:hh}", date), "01");
  
  // K: 12hr, 12:00 == 0:00
  equals(fmt("%{date:K}", date), "1");
  equals(fmt("%{date:KK}", date), "01");
  
  // H: 24hr, 24:00 == 0:00
  equals(fmt("%{date:H}", date), "1");
  equals(fmt("%{date:HH}", date), "01");
  
  // k: 24hr, 24:00 == 24:00
  equals(fmt("%{date:k}", date), "1");
  equals(fmt("%{date:kk}", date), "01");
  
  
  
  // 11:00 AM
  date = new Date(2011, 7, 1, 11);
  
  // h: 12hr, 12:00 == 12:00
  equals(fmt("%{date:h}", date), "11");
  equals(fmt("%{date:hh}", date), "11");
  
  // K: 12hr, 12:00 == 0:00
  equals(fmt("%{date:K}", date), "11");
  equals(fmt("%{date:KK}", date), "11");
  
  // H: 24hr, 24:00 == 0:00
  equals(fmt("%{date:H}", date), "11");
  equals(fmt("%{date:HH}", date), "11");
  
  // k: 24hr, 24:00 == 24:00
  equals(fmt("%{date:k}", date), "11");
  equals(fmt("%{date:kk}", date), "11");
  
  
  // 12:00 PM
  date = new Date(2011, 7, 1, 12);
  
  // h: 12hr, 12:00 == 12:00
  equals(fmt("%{date:h}", date), "12");
  equals(fmt("%{date:hh}", date), "12");
  
  // K: 12hr, 12:00 == 0:00
  equals(fmt("%{date:K}", date), "0");
  equals(fmt("%{date:KK}", date), "00");
  
  // H: 24hr, 24:00 == 0:00
  equals(fmt("%{date:H}", date), "12");
  equals(fmt("%{date:HH}", date), "12");
  
  // k: 24hr, 24:00 == 24:00
  equals(fmt("%{date:k}", date), "12");
  equals(fmt("%{date:kk}", date), "12");
  
  
  // 1:00 PM
  date = new Date(2011, 7, 1, 13);
  
  // h: 12hr, 12:00 == 12:00
  equals(fmt("%{date:h}", date), "1");
  equals(fmt("%{date:hh}", date), "01");
  
  // K: 12hr, 12:00 == 0:00
  equals(fmt("%{date:K}", date), "1");
  equals(fmt("%{date:KK}", date), "01");
  
  // H: 24hr, 24:00 == 0:00
  equals(fmt("%{date:H}", date), "13");
  equals(fmt("%{date:HH}", date), "13");
  
  // k: 24hr, 24:00 == 24:00
  equals(fmt("%{date:k}", date), "13");
  equals(fmt("%{date:kk}", date), "13");
  
});

test("Minutes", function() {
  date = new Date(2011, 7, 1, 13, 9);
  equals(fmt("%{date:m}", date), "9");
  equals(fmt("%{date:mm}", date), "09");
  
  date = new Date(2011, 7, 1, 13, 12);
  equals(fmt("%{date:m}", date), "12");
  equals(fmt("%{date:mm}", date), "12");
});

test("Seconds", function() {
  date = new Date(2011, 7, 1, 13, 1, 9);
  equals(fmt("%{date:s}", date), "9");
  equals(fmt("%{date:ss}", date), "09");
  
  date = new Date(2011, 7, 1, 13, 1, 19);
  equals(fmt("%{date:s}", date), "19");
  equals(fmt("%{date:ss}", date), "19");
});

test("Fractional seconds", function() {
  date = new Date(2011, 7, 1);
  
  date.setMilliseconds(100);
  equals(fmt("%{date:S}", date), "1");
  
  date.setMilliseconds(151);
  equals(fmt("%{date:S}", date), "2");
  equals(fmt("%{date:SS}", date), "15");
  equals(fmt("%{date:SSS}", date), "151");
  
  date.setMilliseconds(1);
  equals(fmt("%{date:S}", date), "0");
  equals(fmt("%{date:SS}", date), "00");
  equals(fmt("%{date:SSS}", date), "001");
  
  
});

test("Milliseconds in day", function() {
  date = new Date(2011, 7, 1, 0, 1, 1);
  date.setMilliseconds(100);
  
  equals(fmt("%{date:A}", date), "61100");
  equals(fmt("%{date:AAAAA}", date), "61100");
  equals(fmt("%{date:AAAAAA}", date), "061100");
});


