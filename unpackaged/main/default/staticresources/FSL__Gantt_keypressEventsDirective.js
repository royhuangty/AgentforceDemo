'use strict';

/*
	Keypress events handler
	Only keys that registered on "registeredKeys" will result in a broadcast
*/

(function () {

	angular.module('serviceExpert').directive('keypressEvents', ['$rootScope', 'StateService', function ($rootScope, StateService) {

		var registeredKeys = [13, 16, 18, 27, 37, 38, 39, 40, 48, 49, 50, 51, 55, 69, 70, 73, 77, 79, 83, 84, 85, 87, 90, 96, 97, 98, 99, 103];

		return {
			restrict: 'C',
			link: function link() {
				angular.element('body').bind('keydown', function (e) {

					if (StateService.isUserIdle()) {
						return;
					}

					// broadcast only if we registered the key
					if (registeredKeys.indexOf(e.which) > -1) $rootScope.$broadcast('keypress', e);else e.stopPropagation();
				});
			}
		};
	}]).directive('fslKeyPress', function () {
		return {
			restrict: 'A',
			link: function link(scope, element, attrs) {
				element.bind('keypress', function (e) {
					e.stopPropagation();
					if (e.keyCode === 13 || e.keyCode === 32) {
						angular.element(e.target).trigger('click');
					}
				});
			}
		};
	}).directive('fslTabSwitch', function () {
		var keys = {
			end: 35,
			home: 36,
			left: 37,
			up: 38,
			right: 39,
			down: 40
		};

		var direction = {
			37: -1,
			38: -1,
			39: 1,
			40: 1
		};

		function switchTabOnArrowPress(event, role) {
			var pressed = event.keyCode;
			var tabs = event.target.parentElement.querySelectorAll('[role="' + role + '"]');
			for (var i = 0; i < tabs.length; ++i) {
				tabs[i].index = i;
			};

			if (direction[pressed] !== undefined) {
				var target = event.target;
				//let isNextVisible = isElementVisible(tabs[target.index + direction[pressed]], $(tabs[0]).offset().top, $(tabs[0]).outerHeight(true));

				if (target.index !== undefined) {
					if (tabs[target.index + direction[pressed]]) {
						// && (role !== 'table' || isNextVisible)) {
						tabs[target.index + direction[pressed]].focus();
					} else if (pressed === keys.left || pressed === keys.up) {
						if (tabs[tabs.length - 1]) tabs[tabs.length - 1].focus();
					} else if (pressed === keys.right || pressed === keys.down) {
						if (tabs[0]) tabs[0].focus();
					}
				}
			}
		}

		// this function checks if target element is on the same height as first element of ul
		// function isElementVisible(targetElement, firstTop, firstHeight) {
		// 	if (targetElement)
		// 		return Math.ceil($(targetElement).offset().top) >= (firstTop);
		// }

		return {
			restrict: 'A',
			link: function link(scope, element, attrs) {
				element.bind('keydown', function (e) {
					if (e.keyCode === keys.left || e.keyCode === keys.right || e.keyCode === keys.up || e.keyCode === keys.down) {
						switchTabOnArrowPress(e, attrs.role);
						e.stopPropagation();
						e.preventDefault();
					}
				});
			}
		};
	});
})();