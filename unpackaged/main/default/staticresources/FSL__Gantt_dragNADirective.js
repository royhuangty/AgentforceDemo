'use strict';

/*
    
    dragging na (creating new one)

*/

(function () {

    angular.module('serviceExpert').directive('dragNA', function () {
        return {
            restrict: 'CAE',
            scope: { dragService: '=' },
            link: function link(scope, element, attributes, ctlr) {

                // set cached elements
                if (!cachedDomElements.draggedBreak) {
                    cachedDomElements.draggedBreak = $('#draggedBreak');
                }

                if (!cachedDomElements.draggedBreakDiv) {
                    cachedDomElements.draggedBreakDiv = $('#draggedBreak div');
                }

                element.bind('dragstart', function (eventObject) {

                    var breakDuration = document.querySelector('#breakDuration').dataset.duration;
                    breakDuration = parseInt(breakDuration);

                    // set service as json for datatransfer
                    eventObject.originalEvent.dataTransfer.setData('text', 'absenceNA_' + breakDuration); // service id... explorer is crap so naming it "text"

                    // set draggble break ghost text
                    var naHours = Math.floor(breakDuration / 60),
                        naMinutes = breakDuration % 60;

                    cachedDomElements.draggedBreakDiv.html(window.customLabels.AbsenceCreatorFormat.replaceAll(naHours, naMinutes));

                    // viewable hours on the gantt, after filtering them
                    var availableHours = getMinAndMaxHoursToDisplay();

                    // calculate size of event
                    var startTime = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60);
                    var endDate = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60);

                    endDate.setMinutes(endDate.getMinutes() + breakDuration);

                    var startPoint = getXPositionOfEvent({ start_date: startTime, end_date: endDate }, false, scheduler.matrix[scheduler._mode]);
                    var endPoint = getXPositionOfEvent({ start_date: startTime, end_date: endDate }, true, scheduler.matrix[scheduler._mode]);
                    var meetingLength = endPoint - startPoint + 4;

                    // set draggble service ghost width
                    cachedDomElements.draggedBreak.css('width', meetingLength + 'px');

                    var crt = document.getElementById('draggedBreak').cloneNode(true);

                    document.body.appendChild(crt);
                    var testDataTransfer = window.DataTransfer;
                    if ('setDragImage' in testDataTransfer.prototype)
                        // *-------------------RTL support---------------*/ 
                        var positionY = document.querySelector('html').getAttribute('dir') === 'rtl' ? meetingLength : 0;
                    eventObject.originalEvent.dataTransfer.setDragImage(crt, positionY, 40);
                });
            }
        };
    });
})();