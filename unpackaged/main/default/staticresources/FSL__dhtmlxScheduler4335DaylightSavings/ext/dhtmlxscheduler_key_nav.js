/*
@license
dhtmlxScheduler v.4.3.35 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){e._temp_key_scope=function(){function t(e){e=e||window.event,d.x=e.clientX,d.y=e.clientY}function a(){for(var t=document.elementFromPoint(d.x,d.y);t&&t!=e._obj;)t=t.parentNode;return!(t!=e._obj)}function i(e){delete e.rec_type,delete e.rec_pattern,delete e.event_pid,delete e.event_length}e.config.key_nav=!0;var n,r,s=null,d={};document.body?dhtmlxEvent(document.body,"mousemove",t):dhtmlxEvent(window,"load",function(){dhtmlxEvent(document.body,"mousemove",t)}),e.attachEvent("onMouseMove",function(t,a){
n=e.getActionData(a).date,r=e.getActionData(a).section}),e._make_pasted_event=function(t){var a=t.end_date-t.start_date,s=e._lame_copy({},t);if(i(s),s.start_date=new Date(n),s.end_date=new Date(s.start_date.valueOf()+a),r){var d=e._get_section_property();e.config.multisection?s[d]=t[d]:s[d]=r}return s},e._do_paste=function(t,a,i){e.addEvent(a),e.callEvent("onEventPasted",[t,a,i])},e._is_key_nav_active=function(){return this._is_initialized()&&!this._is_lightbox_open()&&this.config.key_nav?!0:!1},
dhtmlxEvent(document,_isOpera?"keypress":"keydown",function(t){if(!e._is_key_nav_active())return!0;if(t=t||event,37==t.keyCode||39==t.keyCode){t.cancelBubble=!0;var i=e.date.add(e._date,37==t.keyCode?-1:1,e._mode);return e.setCurrentView(i),!0}var n=e._select_id;if(t.ctrlKey&&67==t.keyCode)return n&&(e._buffer_id=n,s=!0,e.callEvent("onEventCopied",[e.getEvent(n)])),!0;if(t.ctrlKey&&88==t.keyCode&&n){s=!1,e._buffer_id=n;var r=e.getEvent(n);e.updateEvent(r.id),e.callEvent("onEventCut",[r])}if(t.ctrlKey&&86==t.keyCode&&a(t)){
var r=e.getEvent(e._buffer_id);if(r){var d=e._make_pasted_event(r);if(s)d.id=e.uid(),e._do_paste(s,d,r);else{var o=e.callEvent("onBeforeEventChanged",[d,t,!1,r]);o&&(e._do_paste(s,d,r),s=!0)}}return!0}})},e._temp_key_scope()});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_key_nav.js.map