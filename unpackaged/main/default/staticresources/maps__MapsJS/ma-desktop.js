// Table - Select all
/*
$(document).ready(function(){ 
    $('#selectAll').click(function(event) {
      if(this.checked) {
          // Iterate each checkbox
          $(':checkbox').each(function() {
              this.checked = true;
          });
      }
      else {
        $(':checkbox').each(function() {
              this.checked = false;
          });
      }
    });
});
*/
    
//Anything that gets to the document will hide the dropdown
$(document).click(function(){
	$('.ma-dropdown--click.in').removeClass('in');
});

//open
$(document).on('click', '.ma-dropdown--click', function(e) {
	e.stopPropagation();
	$('.ma-dropdown--click').removeClass('in');
	$(this).addClass('in');
});

//close on reclick of button
 $(document).on('click', '.ma-dropdown--click.in .ma-button', function(e) {
 	e.stopPropagation();
 	$('.ma-dropdown--click').removeClass('in');
 });


//close on reclick of menu item
 $(document).on('click', '.ma-menu-item.ma-dropdown--click.in .ma-button', function(e) {
 	e.stopPropagation();
 	$('.ma-dropdown--click').removeClass('in');
 });



//=====================================
//select2
//=====================================

$(".select2-input").select2();

//=====================================
// bootstrap tooltips
//=====================================

$(function () {
  $('[data-toggle="tooltip"]').tooltip({
  	 container: 'body',
  	 trigger: 'hover'
  });
});


//=====================================
//datepicker
//=====================================

$(function() {
	$( ".ma-datepicker" ).datepicker();
	$('.ma-datepicker').datepicker( "option", $.datepicker.regional[ sysLocal ] );
});


//=====================================
//checkbox
//=====================================

$(document).on('click', '.ma-checkbox-wrap', function(e) {
	$(this).find('input[type=checkbox]').prop('checked', function(){
		return !this.checked;
	});
});


//=====================================
// search input clear
//=====================================

// show
$(document).on('keyup', '.ma-search-input-clearable', function(e) {
	if ( !$(this).val() ) {
		$(this).siblings('.search-clear-icon').hide();
	}
	else {
		$(this).siblings('.search-clear-icon').show();
	}
});

$(document).on('click', '.search-clear-icon', function(e) {
	$(this).siblings('.ma-search-input-clearable').val('');
	$(this).hide();
});

//clear

//=====================================
//modals
//=====================================

function modalIn($Id) {
	$('body').addClass('modal-in');
	$($Id).addClass('ma-in');
	if ( $($Id).has('.ma-modal-search-input') ) {
		$($Id).find('.ma-modal-search-input').focus();
	} else {}
	$('#OverlayMask').addClass('ma-in');
	$('html').addClass('remove-scroll');
}

function modalOut() {
	$('body').removeClass('modal-in');
	$('#OverlayMask').removeClass('ma-in');
	$('.ma-modal').removeClass('ma-in');
	$('html').removeClass('remove-scroll');
	$('#OverlayMaskError').removeClass('ma-in');
}
		
		// Modals click to close. Add the attribute id and it's value, maModalClose, (id="maModalClose") to any element that you want to use to close your modal		

		$(document).on('click', '#maModalClose', function(e) {
			modalOut();
		});

		// Modals click to trigger corresponding to desktop framework modals
		
		$(document).on('click', '#triggerModal1', function(e){
			modalIn("#modal1");
		});

		$(document).on('click', '#triggerModal2', function(e){
			modalIn("#modal2");
		});

		$(document).on('click', '#triggerModalLarge', function(e){
			modalIn("#modalLarge");
		});

		$(document).on('click', '#triggerModalLargeSimple', function(e){
			modalIn("#modalLargeSimple");
		});

		$(document).on('click', '#triggerModalLargeExample', function(e){
			modalIn("#modalLargeExample");
		});




//=====================================
//tabs
//=====================================

    /*
	$(document).on('click', '.ma-tab-link', function(){
		var tab_id = $(this).attr('data-tab');
		$(this).siblings('.ma-tab-link').removeClass('active');
		$("#"+tab_id).siblings('.ma-tab-content').removeClass('active');
		$(this).addClass('active');
		$("#"+tab_id).addClass('active');
	});
	*/

	$(document).on('click', '.ma-tab-link-home', function(){
		var tab_id = $(this).attr('data-tab');
		$(this).siblings('.ma-tab-link-home').removeClass('active');
		$("#"+tab_id).siblings('.ma-tab-content').removeClass('active');
		$(this).addClass('active');
		$("#"+tab_id).addClass('active');
	});

	// Add and Remove Tabs
	
	/*
	$('#addRemove').w2tabs({
		name: 'tabs',
		active: 'tab1',
		tabs: [
			{ id: 'tab1', caption: 'Closable Tab', closable: true }
		]
	});

	var ind = 2;

	function addTab() {
	    w2ui.tabs.add({ id: 'tab'+ind, caption: 'New Tab', closable: true });
	    ind++;
	}

	$("#addRemove table tbody tr").append("<td id='tabs_tabs_tab_tab1000000' style=' valign='middle'><div class='w2ui-tab' onclick='addTab()'>+ Add Tab</div></td>")
	*/

//=====================================
// Menus
//=====================================


//sibling toggle for menu items that are grouped

$(document).on('click', '.ma-sibling-toggle', function(){
	$(this).siblings('.ma-sibling-toggle').removeClass('active');
	$(this).addClass('active');
});

//show/hide secondary menus
	$(document).on('click', '.ma-menu-bar-has-secondary .ma-menu-item', function(){
		var menu_id = $(this).attr('data-secondary-menu');
		$("#"+menu_id).siblings('.ma-menu-bar-secondary').addClass('ma-hidden');
		$("#"+menu_id).removeClass('ma-hidden');
	});



//=====================================
// Slide over menu
//=====================================


//slide in
$(document).on('click', '.ma-so-menu-trigger', function(e) {
	var menu_id = $(this).attr('data-so-menu');
	$("#"+menu_id).addClass('in');
	$('body').addClass('modal-in');
});

//slide out
$(document).on('click', '.ma-so-menu-close', function(e) {
	$('.ma-so-menu-container').removeClass('in');
	$('body').removeClass('modal-in');
});




//=====================================
// Toasts
//=====================================

$(document).on('click', '.ma-toast-close', function(e) {
	$(this).closest('.ma-toast').removeClass('ma-in');
});




//=====================================
// Tables
//=====================================

	// Add Row And Remove Row Dynamically
	function addRow() {
	    var table = document.getElementById("table");
	    var row = table.insertRow(1);
	    var cell1 = row.insertCell(0);
	    var cell2 = row.insertCell(1);
	    cell1.innerHTML = "Col 1";
	    cell2.innerHTML = "Col 2";
	}
	function removeRow() {
		document.getElementById("table").deleteRow(1);
	}

	// add and inline remove row

	$(document).ready(function () {
	    var counter = 0;

	    $("#addInfiniteRows").on("click", function () {

	        counter = $('#addDeleteTable tr').length - 2;

	        var newRow = $("<tr>");
	        var cols = "";

	        cols += '<td><div>Col ' + counter + '</div></td>';
	        cols += '<td><div>Col ' + counter + '</div></td>';

	        cols += '<td><button type="button" class="btn-del"><div class="icon ma-icon-close"></div></button></td>';
	        newRow.append(cols);
	        
	        $("table#addDeleteTable").append(newRow);
	        counter++;
	    });


	    $("table#addDeleteTable").on("click", ".btn-del", function (event) {
	        $(this).closest("tr").remove();
	        counter -= 1
	        $('#addrow').attr('disabled', false).prop('value', "Add Row");
	    });


	});

	// Sort Table Columns -- insert below jQuery script tag and above your .js script tag in HTML file: <script type='text/javascript' src="http://tablesorter.com/__jquery.tablesorter.min.js"></script>
	/*
	$(document).ready(function() { 
        $("#sortAway").tablesorter(); 
    } );

    $(document).ready(function() { 
        $("#sortExample").tablesorter(); 
    } );

    $(document).ready(function() { 
        $("#combinationTable").tablesorter(); 
    } );
	*/

	// Search Table
	$("#search").keyup(function(){
        _this = this;
        $.each($("#searchTable tbody tr"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();                
        });
    });

    $("#combinationSearch").keyup(function(){
        _this = this;
        $.each($("#combinationTable tbody tr"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();                
        });
    });

    // Expand rows with more data
	/*
    $('tr.expand-tr').click(function(){
	    $(this).nextUntil('tr.expand-tr').css('display', function(i,v){
	        return this.style.display === 'table-row' ? 'none' : 'table-row';
	    });
	});
	*/
	$(document).on('click', 'tr.expand-tr', function () {
	    $(this).nextUntil('tr.expand-tr').css('display', function(i,v){
	        return this.style.display === 'table-row' ? 'none' : 'table-row';
	    });
	});
	$(document).on('click', '.expand-tr', function () {
	    $(this).find('.minus, .plus').toggleClass('minus plus')
	});
	$(document).on('click', '.expand-tr', function () {
	    $(this).find('.background--white, .background--gray').toggleClass('background--white background--gray')
	});

	// Checbox select all
	$('#all').click(function(event) {
		if(this.checked) {
			$(':checkbox').each(function() {
				this.checked = true;
			});
		}
		else {
			$(':checkbox').each(function() {
				this.checked = false;
			});
		}
	});

	// Paginated tables after
	$('table.paginated-after2').each(function() {
	    var currentPage = 0;
	    var numPerPage = 2;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after4').each(function() {
	    var currentPage = 0;
	    var numPerPage = 4;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after6').each(function() {
	    var currentPage = 0;
	    var numPerPage = 6;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after8').each(function() {
	    var currentPage = 0;
	    var numPerPage = 8;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after10').each(function() {
	    var currentPage = 0;
	    var numPerPage = 10;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after15').each(function() {
	    var currentPage = 0;
	    var numPerPage = 15;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-after20').each(function() {
	    var currentPage = 0;
	    var numPerPage = 20;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertAfter($table).find('span.page-number:first').addClass('active');
	});


	// Paginated tables before
	$('table.paginated-before2').each(function() {
	    var currentPage = 0;
	    var numPerPage = 2;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before4').each(function() {
	    var currentPage = 0;
	    var numPerPage = 4;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before6').each(function() {
	    var currentPage = 0;
	    var numPerPage = 6;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before8').each(function() {
	    var currentPage = 0;
	    var numPerPage = 8;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before10').each(function() {
	    var currentPage = 0;
	    var numPerPage = 10;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before15').each(function() {
	    var currentPage = 0;
	    var numPerPage = 15;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
	$('table.paginated-before20').each(function() {
	    var currentPage = 0;
	    var numPerPage = 20;
	    var $table = $(this);
	    $table.bind('repaginate', function() {
	        $table.find('tbody tr').hide().slice(currentPage * numPerPage, (currentPage + 1) * numPerPage).show();
	    });
	    $table.trigger('repaginate');
	    var numRows = $table.find('tbody tr').length;
	    var numPages = Math.ceil(numRows / numPerPage);
	    var $pager = $('<div class="pager"></div>');
	    for (var page = 0; page < numPages; page++) {
	        $('<span class="page-number"></span>').text(page + 1).bind('click', {
	            newPage: page
	        }, function(event) {
	            currentPage = event.data['newPage'];
	            $table.trigger('repaginate');
	            $(this).addClass('active').siblings().removeClass('active');
	        }).appendTo($pager).addClass('clickable');
	    }
	    $pager.insertBefore($table).find('span.page-number:first').addClass('active');
	});
















