/* Irish Ireland initialization for the jQuery UI date picker plugin. */
/* Written by Stuart. */
(function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([ "../datepicker" ], factory );
	} else {

		// Browser globals
		factory( jQuery.datepicker );
	}
}(function( datepicker ) {

datepicker.regional['ga'] = {
	closeText: 'Gar',
	prevText: 'Roimhe',
	nextText: 'Ansin',
	currentText: 'lá atá inniu ann',
	monthNames: ['Eanáir','Feabhra','Márta','Aibreán','Bealtaine','Meitheamh',
	'Iúil','Lúnasa','Meán Fómhair','Deireadh Fómhair','Samhain','Nollaig'],
	monthNamesShort: ['Ean','Feabh','Már','Aib','Bealt','Meith',
	'Iúil','Lún','M.Fómh','D.Fómh','Samh','Noll'],
	dayNames: ['Dé Domhnaigh','Dé Luain','Dé Máirt','Dé Céadaoin','Déardaoin','Dé hAoine','Dé Sathairn'],
	dayNamesShort: ['Domh','Luan','Máir','Céad','Déar','Aoi','Sath'],
	dayNamesMin: ['Do','Lu','Má','Cé','De','Ao','Sa'],
	weekHeader: 'Tse',
	dateFormat: 'dd/mm/yy',
	firstDay: 2,
	isRTL: false,
	showMonthAfterYear: false,
	yearSuffix: ''};
datepicker.setDefaults(datepicker.regional['ga']);

return datepicker.regional['ga'];

}));
