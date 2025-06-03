/*
@license
dhtmlxScheduler v.4.3.35 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){!function(){function t(t){var i=e._get_section_view();i&&t&&(a=e.getEvent(t)[e._get_section_property()])}var a,i;e.config.collision_limit=1,e.attachEvent("onBeforeDrag",function(e){return t(e),!0}),e.attachEvent("onBeforeLightbox",function(a){var s=e.getEvent(a);return i=[s.start_date,s.end_date],t(a),!0}),e.attachEvent("onEventChanged",function(t){if(!t||!e.getEvent(t))return!0;var a=e.getEvent(t);if(!e.checkCollision(a)){if(!i)return!1;a.start_date=i[0],a.end_date=i[1],
a._timed=this.isOneDayEvent(a)}return!0}),e.attachEvent("onBeforeEventChanged",function(t,a,i){return e.checkCollision(t)}),e.attachEvent("onEventAdded",function(t,a){var i=e.checkCollision(a);i||e.deleteEvent(t)}),e.attachEvent("onEventSave",function(t,a,i){if(a=e._lame_clone(a),a.id=t,!a.start_date||!a.end_date){var s=e.getEvent(t);a.start_date=new Date(s.start_date),a.end_date=new Date(s.end_date)}return a.rec_type&&e._roll_back_dates(a),e.checkCollision(a)}),e._check_sections_collision=function(t,a){
var i=e._get_section_property();return t[i]==a[i]&&t.id!=a.id?!0:!1},e.checkCollision=function(t){var i=[],s=e.config.collision_limit;if(t.rec_type)for(var n=e.getRecDates(t),r=0;r<n.length;r++)for(var d=e.getEvents(n[r].start_date,n[r].end_date),o=0;o<d.length;o++)(d[o].event_pid||d[o].id)!=t.id&&i.push(d[o]);else{i=e.getEvents(t.start_date,t.end_date);for(var l=0;l<i.length;l++)if(i[l].id==t.id){i.splice(l,1);break}}var _=e._get_section_view(),h=e._get_section_property(),c=!0;if(_){for(var u=0,l=0;l<i.length;l++)i[l].id!=t.id&&this._check_sections_collision(i[l],t)&&u++;
u>=s&&(c=!1)}else i.length>=s&&(c=!1);if(!c){var v=!e.callEvent("onEventCollision",[t,i]);return v||(t[h]=a||t[h]),v}return c}}()});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_collision.js.map