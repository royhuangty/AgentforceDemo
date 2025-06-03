
            /* data example to pass in:
                var sidebarSettings = {
                    sectionRef: 'content-wrapper',
                    menuItems:[
                        {label: 'Dashboard', isActive: false, div: 'dashboard-div'},
                        {label: 'Details',
                            nested: [
                                {label: 'Details', isActive: false, div: 'details-div'},
                                {label: 'Devices', isActive: true, div: 'devices-div'},
                                {label: 'Events', isActive: false, div: 'events-div'},
                            ]
                        },
                        {label: 'Errors', isActive: false, div: 'errors-div'},
                    ]
                };
            */

    function MASidebarNav(sidebarSettings) {
        this.sidebarSettings = sidebarSettings;
        this.CreateSidebar();
    }

    MASidebarNav.prototype.CreateSidebar = function() {
        var sectionRef = this.sidebarSettings.sectionRef ? this.sidebarSettings.sectionRef : "content-wrapper";

        var sideBarNav = '<div><nav id="maVerticalNav-' + sectionRef + '" class="slds-nav-vertical"><ul>';

        var LiveSidebar = {
            displaySection: function(sectionId) {
                //loop over all divs and hide them
                $('.ma-body-content.' + sectionRef).removeClass('is-active');
                $('#' + sectionId).addClass('is-active');
            }
        }

        for (var menuItemIndex = 0; menuItemIndex < this.sidebarSettings.menuItems.length; menuItemIndex++) {
            if (this.sidebarSettings.menuItems[menuItemIndex].nested) {
                sideBarNav += '<li class="slds-nav-vertical__item slds-nested-nav-item-is-active ' + sectionRef + '">';
                sideBarNav += '<div class="slds-nested-nav-item_header">' +  this.sidebarSettings.menuItems[menuItemIndex].label + '</div>';
                sideBarNav += '<ul class="slds-nested-nav-vertical">';

                for (var nestedMenuItemIndex = 0; nestedMenuItemIndex < this.sidebarSettings.menuItems[menuItemIndex].nested.length; nestedMenuItemIndex++) {
                    sideBarNav += '<li>';
                    sideBarNav += '<a href="javascript:void(0);" class="nav-items ' + sectionRef
                                + (this.sidebarSettings.menuItems[menuItemIndex].nested[nestedMenuItemIndex].isActive ? ' slds-is-active" ' : '" ')
                                + 'div-ref="' + this.sidebarSettings.menuItems[menuItemIndex].nested[nestedMenuItemIndex].div + '">';
                    sideBarNav += '<div class="indicator-dot"></div>';
                    sideBarNav += this.sidebarSettings.menuItems[menuItemIndex].nested[nestedMenuItemIndex].label;
                    sideBarNav += '</a>';
                    sideBarNav += '</li>';

                    if (this.sidebarSettings.menuItems[menuItemIndex].nested[nestedMenuItemIndex].isActive) {
                        LiveSidebar.displaySection(this.sidebarSettings.menuItems[menuItemIndex].nested[nestedMenuItemIndex].div);
                    }
                }

                sideBarNav += '</ul>';
                sideBarNav += '</li>';
            }
            else {
                sideBarNav += '<li class="slds-nav-vertical__item ' + sectionRef + (this.sidebarSettings.menuItems[menuItemIndex].isActive ? ' slds-is-active' : '')+ '">';
                sideBarNav += '<a href="javascript:void(0);" class="slds-nav-vertical__action nav-items ' + sectionRef + '" div-ref="' + this.sidebarSettings.menuItems[menuItemIndex].div + '">'
                            + this.sidebarSettings.menuItems[menuItemIndex].label + '</a>';
                sideBarNav += '</li>';

                if (this.sidebarSettings.menuItems[menuItemIndex].isActive) {
                    LiveSidebar.displaySection(this.sidebarSettings.menuItems[menuItemIndex].div);
                }
            }
        }

        sideBarNav += '</ul></nav></div>';

        $('#' + sectionRef).prepend(sideBarNav);

        $("a.nav-items." + sectionRef).click(function() {

            LiveSidebar.displaySection($(this).attr("div-ref"));

            $('a.slds-is-active.' + sectionRef).removeClass('slds-is-active');
            $('li.slds-is-active.' + sectionRef).removeClass('slds-is-active');
            $('li.slds-nested-nav-item-is-active.' + sectionRef).removeClass('slds-nested-nav-item-is-active');
            if ($(this).closest("ul").hasClass("slds-nested-nav-vertical")) {
                $(this).closest("li.slds-nav-vertical__item").addClass("slds-nested-nav-item-is-active");
            }

            if($(this).has("div.indicator-dot").length) {
                $(this).addClass('slds-is-active');
            }
            else {
                $(this).closest("li.slds-nav-vertical__item").addClass("slds-is-active");
            }

            $('#currentPageHeader').text($(this).text());

        });

        if (this.sidebarSettings.onComplete) {

            if (typeof(this.sidebarSettings.onComplete) === "function") {
                this.sidebarSettings.onComplete();
            }

        }

    }
