/* Bengali Bangladesh initialization for the jQuery UI date picker plugin. */
/* Written Tuman (tuman.cse03@gmail.com) */
(function( factory ) {
  if ( typeof define === "function" && define.amd ) {

    // AMD. Register as an anonymous module.
    define([ "../datepicker" ], factory );
  } else {

    // Browser globals
    factory( jQuery.datepicker );
  }
}(function( datepicker ) {

datepicker.regional['bn-BD'] = {
  closeText: 'রূধা',
  prevText: 'পূর্ববর্তী',
  nextText: 'পরবর্তী',
  currentText: 'আজ',
  monthNames: ['জানুয়ারী','ফেব্রুয়ারী','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
  monthNamesShort: ['জানু.','ফেব্রু.','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগ.','সেপ্টে.','অক্টো.','নভে.','ডিসে.'],
  dayNamesShort: ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'],
  dayNames: ['রবি.','সোম.','মঙ্গল.','বুধ.','বৃহস্পতি.','শুক্র.','শনি.'],
  dayNamesMin: ['র','স','ম','ব','ব','শ','শ'],
  weekHeader: 'সপ্তাহ',
  dateFormat: 'dd-mm-yy',
  firstDay: 1,
  isRTL: false,
  showMonthAfterYear: false,
  yearSuffix: ''
};
datepicker.setDefaults(datepicker.regional['bn-BD']);

return datepicker.regional['bn-BD'];

}));
