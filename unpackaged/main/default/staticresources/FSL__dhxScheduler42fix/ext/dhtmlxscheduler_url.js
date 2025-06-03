/*
dhtmlxScheduler v.4.2.0 Stardard

This software is covered by GPL license. You also can obtain Commercial or Enterprise license to use it in non-GPL project - please contact sales@dhtmlx.com. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
scheduler.attachEvent("onTemplatesReady",function(){function e(e){n=e,scheduler.getEvent(e)&&scheduler.showEvent(e)}function t(){for(var e={},t=(document.location.hash||"").replace("#","").split(","),r=0;r<t.length;r++){var s=t[r].split("=");2==s.length&&(e[s[0]]=s[1])}return e}var r=!0,s=scheduler.date.str_to_date("%Y-%m-%d"),a=scheduler.date.date_to_str("%Y-%m-%d"),n=null;scheduler.attachEvent("onBeforeEventDisplay",function(e){return n=e.id,!0}),scheduler.attachEvent("onAfterEventDisplay",function(){return n=null,!0
}),scheduler.attachEvent("onBeforeViewChange",function(i,d,l,o){if(r){r=!1;var _=t();if(_.event)try{if(scheduler.getEvent(_.event))return e(_.event),!1;var c=scheduler.attachEvent("onXLE",function(){e(_.event),scheduler.detachEvent(c)})}catch(h){}if(_.date||_.mode){try{this.setCurrentView(_.date?s(_.date):null,_.mode||null)}catch(h){this.setCurrentView(_.date?s(_.date):null,l)}return!1}}var u=["date="+a(o||d),"mode="+(l||i)];n&&u.push("event="+n);var v="#"+u.join(",");return document.location.hash=v,!0
})});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_url.js.map