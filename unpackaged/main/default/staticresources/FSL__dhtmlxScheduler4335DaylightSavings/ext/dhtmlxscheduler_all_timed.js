/*
@license
dhtmlxScheduler v.4.3.35 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){!function(){e.config.all_timed="short";var t=function(e){return!((e.end_date-e.start_date)/36e5>=24)};e._safe_copy=function(t){var a=null,i=null;return t.event_pid&&(a=e.getEvent(t.event_pid)),a&&a.isPrototypeOf(t)?(i=e._copy_event(t),delete i.event_length,delete i.event_pid,delete i.rec_pattern,delete i.rec_type):i=e._lame_clone(t),i};var a=e._pre_render_events_line;e._pre_render_events_line=function(i,s){function n(e){var t=r(e.start_date);return+e.end_date>+t}function r(t){
var a=e.date.add(t,1,"day");return a=e.date.date_part(a)}function d(t,a){var i=e.date.date_part(new Date(t));return i.setHours(a),i}if(!this.config.all_timed)return a.call(this,i,s);for(var o=0;o<i.length;o++){var l=i[o];if(!l._timed)if("short"!=this.config.all_timed||t(l)){var _=this._safe_copy(l);_.start_date=new Date(_.start_date),n(l)?(_.end_date=r(_.start_date),24!=this.config.last_hour&&(_.end_date=d(_.start_date,this.config.last_hour))):_.end_date=new Date(l.end_date);var h=!1;_.start_date<this._max_date&&_.end_date>this._min_date&&_.start_date<_.end_date&&(i[o]=_,
h=!0);var c=this._safe_copy(l);if(c.end_date=new Date(c.end_date),c.start_date<this._min_date?c.start_date=d(this._min_date,this.config.first_hour):c.start_date=d(r(l.start_date),this.config.first_hour),c.start_date<this._max_date&&c.start_date<c.end_date){if(!h){i[o--]=c;continue}i.splice(o+1,0,c)}}else i.splice(o--,1)}var u="move"==this._drag_mode?!1:s;return a.call(this,i,u)};var i=e.get_visible_events;e.get_visible_events=function(e){return this.config.all_timed&&this.config.multi_day?i.call(this,!1):i.call(this,e);
},e.attachEvent("onBeforeViewChange",function(t,a,i,s){return e._allow_dnd="day"==i||"week"==i,!0}),e._is_main_area_event=function(e){return!!(e._timed||this.config.all_timed===!0||"short"==this.config.all_timed&&t(e))};var s=e.updateEvent;e.updateEvent=function(t){var a,i=e.config.all_timed&&!(e.isOneDayEvent(e._events[t])||e.getState().drag_id);i&&(a=e.config.update_render,e.config.update_render=!0),s.apply(e,arguments),i&&(e.config.update_render=a)}}()});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_all_timed.js.map