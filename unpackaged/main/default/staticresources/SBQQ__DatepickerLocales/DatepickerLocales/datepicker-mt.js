/* Maltese initialisation for the jQuery UI date picker plugin. */
/* Written by Christian Sciberras. */
(function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([ "../datepicker" ], factory );
	} else {

		// Browser globals
		factory( jQuery.datepicker );
	}
}(function( datepicker ) {

datepicker.regional['mt'] = {
	closeText: 'Għalaq',
	prevText: 'Ta Qabel',
	nextText: 'Li Jmiss',
	currentText: 'Illum',
	monthNames: ['Jannar','Frar','Marzu','April','Mejju','Ġunju',
	'Lulju','Awissu','Settembru','Ottubru','Novembru','Diċembru'],
	monthNamesShort: ['Jan', 'Fra', 'Mar', 'Apr', 'Mej', 'Ġun',
	'Lul', 'Awi', 'Set', 'Ott', 'Nov', 'Diċ'],
	dayNames: ['Il-Ħadd', 'It-Tnejn', 'It-Tlieta', 'L-Erbgħa', 'Il-Ħamis', 'Il-Ġimgħa', 'Is-Sibt'],
	dayNamesShort: ['Ħad', 'Tne', 'Tli', 'Erb', 'Ħam', 'Ġim', 'Sib'],
	dayNamesMin: ['Ħ','T','T','E','Ħ','Ġ','S'],
	weekHeader: 'Ġm',
	dateFormat: 'dd/mm/yy',
	firstDay: 1,
	isRTL: false,
	showMonthAfterYear: false,
	yearSuffix: ''};
datepicker.setDefaults($.datepicker.regional['mt']);

return datepicker.regional['mt'];

}));
