'use strict';

(function () {

    angular.module('serviceExpert').directive('csGroupActions', ['$compile', function ($compile) {

        function linkFunc(scope, element) {

            var $moreMenu = $('<ul class="moreQuickActionsContainer"></ul>'),
                $lastChild = void 0,
                keepLooking = void 0;

            angular.element(element[0]).on('click', function (e) {

                e.stopPropagation();

                $('#MainActionContainer').hide();

                var allQuickActions = $(element).parent().parent().children(),
                    last = $(allQuickActions).last(),
                    first = $(allQuickActions).first(),
                    firstTop = $(first).offset().top,
                    firstHeight = $(first).outerHeight(true);

                if ($moreMenu.hasClass('viewMoreActive')) {
                    $moreMenu.removeClass('viewMoreActive');
                    $moreMenu.empty();
                    $moreMenu.remove();
                    return;
                }

                if (needViewMore($(last), firstTop, firstHeight)) {

                    //runs through overflowing actions
                    for (var i = allQuickActions.length - 1; i > 1; i--) {
                        $lastChild = $(allQuickActions[i]);
                        keepLooking = needViewMore($lastChild, firstTop, firstHeight);

                        if (!keepLooking) {
                            continue;
                        } else {

                            var $li = $('<li></li>');
                            $lastChild.find('> div:first-child').clone().removeClass('quickActionGoLeft quickCustomActionGoLeft').addClass('menuQuickAction').css({ marginBottom: '0', border: 'none', width: '87%' }).appendTo($li);

                            $li.css({ display: 'block' }).appendTo($moreMenu);
                            $compile($li)(scope);
                        }
                    }

                    //reverse the list
                    $($moreMenu.children().get().reverse()).appendTo($moreMenu);

                    //add menu to btn
                    $(element).append($moreMenu);

                    //take care of view more click
                    $moreMenu.addClass('viewMoreActive');
                    $moreMenu.show();

                    var moreTop = $moreMenu.offset().top,
                        moreHeight = $moreMenu.outerHeight(true);

                    if (!needViewMore($('#TaskListPagination'), moreTop, moreHeight)) {
                        $('#TaskListItems').animate({
                            //scrollTop: $('#TaskListItems').scrollTop() + $moreMenu.children().length*36
                            scrollTop: $('#TaskListItems').scrollTop() + ($moreMenu.children().length * 36 > 180 ? 180 : $moreMenu.children().length * 36)
                        }, 500);
                    }
                }

                angular.element('body').on('mousedown', function (e) {

                    var classNames = ["moreQuickActionsBtn", "menuQuickAction", "fa-caret-down"];

                    for (var _i = 0; _i < classNames.length; _i++) {
                        if (e.target.classList.contains(classNames[_i]) || e.target.parentNode && e.target.parentNode.classList.contains(classNames[_i])) return;
                    }

                    if ($moreMenu.hasClass('viewMoreActive')) {
                        $moreMenu.removeClass('viewMoreActive');
                        $moreMenu.empty();
                        $moreMenu.remove();

                        angular.element('body').off('mousedown');
                    }
                });
            });
        }

        // this function checks if target element is on the same height as first element of ul
        function needViewMore(targetElement, firstTop, firstHeight) {
            return Math.ceil($(targetElement).offset().top) >= firstTop + firstHeight;
        }

        return {
            restrict: 'A',
            link: linkFunc
        };
    }]).directive('csLastAction', ['utils', 'listQuickActionsService', function (utils, listQuickActionsService) {

        function updateNoDropDownLastQuickAction(element) {
            element.hide();
            element.parent().children()[0].classList.add("lastQuickAction");
        }
        function linkFunc(scope, element, attrs) {

            var $el = $(element),
                service = scope.service,
                actionName = attrs.csLastAction,
                customActions = utils.getCustomActions('list');

            if (listQuickActionsService.isLastVisibleQuickAction(actionName, service) && customActions.length === 0) {
                updateNoDropDownLastQuickAction($el);
            }
        }

        return {
            restrict: 'A',
            link: linkFunc
        };
    }]);
})();