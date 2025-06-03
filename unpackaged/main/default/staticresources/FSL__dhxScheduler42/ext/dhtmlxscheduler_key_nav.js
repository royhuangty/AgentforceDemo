/*
dhtmlxScheduler v.4.2.0 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){e._temp_key_scope=function(){function t(e){delete e.rec_type,delete e.rec_pattern,delete e.event_pid,delete e.event_length}e.config.key_nav=!0;var i,a,n=null;e.attachEvent("onMouseMove",function(t,n){i=e.getActionData(n).date,a=e.getActionData(n).section}),e._make_pasted_event=function(n){var s=n.end_date-n.start_date,r=e._lame_copy({},n);if(t(r),r.start_date=new Date(i),r.end_date=new Date(r.start_date.valueOf()+s),a){var d=e._get_section_property();r[d]=e.config.multisection?n[d]:a
}return r},e._do_paste=function(t,i,a){e.addEvent(i),e.callEvent("onEventPasted",[t,i,a])},e._is_key_nav_active=function(){return this._is_initialized()&&!this._is_lightbox_open()&&this.config.key_nav?!0:!1},dhtmlxEvent(document,_isOpera?"keypress":"keydown",function(t){if(!e._is_key_nav_active())return!0;if(t=t||event,37==t.keyCode||39==t.keyCode){t.cancelBubble=!0;var i=e.date.add(e._date,37==t.keyCode?-1:1,e._mode);return e.setCurrentView(i),!0}var a=e._select_id;if(t.ctrlKey&&67==t.keyCode)return a&&(e._buffer_id=a,n=!0,e.callEvent("onEventCopied",[e.getEvent(a)])),!0;
if(t.ctrlKey&&88==t.keyCode&&a){n=!1,e._buffer_id=a;var s=e.getEvent(a);e.updateEvent(s.id),e.callEvent("onEventCut",[s])}if(t.ctrlKey&&86==t.keyCode){var s=e.getEvent(e._buffer_id);if(s){var r=e._make_pasted_event(s);if(n)r.id=e.uid(),e._do_paste(n,r,s);else{var d=e.callEvent("onBeforeEventChanged",[r,t,!1,s]);d&&(e._do_paste(n,r,s),n=!0)}}return!0}})},e._temp_key_scope()});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_key_nav.js.map