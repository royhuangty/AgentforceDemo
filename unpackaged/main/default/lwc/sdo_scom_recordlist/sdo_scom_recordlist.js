import { LightningElement,api,track,wire } from 'lwc';
import getFieldDetails from '@salesforce/apex/Sdo_scom_recordlist_controller.getFieldDetails';
import getTotalRecords from '@salesforce/apex/Sdo_scom_recordlist_controller.getTotalRecords';
import getRecords from '@salesforce/apex/Sdo_scom_recordlist_controller.getRecords';
import {
    _servercall,
    _toastcall,
    _reduceErrors
  } from "./sdo_scom_recordlist_helper";
import { deleteRecord } from "lightning/uiRecordApi";
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import getApiNameOfChild from '@salesforce/apex/Sdo_scom_recordlist_controller.getApiNameOfChild';
import retrieveIconForObject from '@salesforce/apex/Sdo_scom_recordlist_controller.retrieveIconForObject';
import LightningConfirm from "lightning/confirm";
import ToastContainer from 'lightning/toastContainer';
import { SessionContextAdapter } from 'commerce/contextApi';
import { getListInfoByName } from "lightning/uiListsApi";

const editActions = [
    { label: "Edit", name: "edit" },
  ];

const deleteActions = [
    { label: "Delete", name: "delete" },
  ];

const bothActions = [
    { label: "Edit", name: "edit" },
    { label: "Delete", name: "delete" },
];

export default class SdoScomRecordlistview extends LightningElement {
    @api sObjectName;
    @api queryType;
    @api listViewName;
    @api columns;
    @api filters;
    //@api paginationEnabled = false;
    @api paginationRecordsPerStep = 10;
    @api showRowNumberColumn = false;
    @api sortBy;
    @api sortDirection = 'asc';
    //@api hideSearchBar = false;
    @api recordId;
    //@api showCheckboxes;
    @api objectlabel;
    //@api searchText;
    @api newbutton=false;
    @api editbutton = false;
    @api deletebutton = false;
    @api isPreviewMode = false;
    //@api showHistory = false;
    @api tableHeight;
    @api viewMode;
    @track isShowModal = false;
    @track isEditClicked = false;
    @track isAddClicked = false;
    tableElement;
    _wiredResult;

     //Properties for Message / Alert
    @track hasMessage = false;
    @track pageMessageParentDivClass = 'slds-notify slds-notify_alert slds-theme_alert-texture slds-theme_warning';
    @track pageMessageChildDivClass = 'slds-icon_container slds-icon-utility-warning slds-m-right_x-small'
    @track messageTitle = 'No Records';
    @track messageSummary = 'No records found.';
    @track messageIcon = 'utility:warning';
    @track isLoaded=false;
    @track totalRecordCount;
    @track records =[];
    @track error;
    @track queryOffset=0;
    @track headers=[];
    @track cssicon;
    @track urlicon;
    @track apiNameOfObject;
    @track relationShipName;

    //properties required to credit/edit object
    @track firstColumn;
    @track recordFormLabel;
    @track editRecordId;
    @track editObjectName;
    toastContainerObj;
    toastContainerObj = ToastContainer.instance();

    connectedCallback(){
        if (this.queryType.localeCompare('List View') != 0) {
            console.log ("The selected option is " + this.queryType);
            this.methodretrieveIconForObject();
            this.methodgetApiName();
            this.getFieldDetailsMethod();
            this.methodgetTotalRecords();
            this.loadData();
        }
        console.log ("ListView Name " + this.listViewName);
        this.toastContainerObj.toastPosition = 'top-center';
    }

    renderedCallback() {
        this.setHeight();
    }

    setHeight () {
        //set the table height
        if (this.tableHeight) {
            this.template.querySelector('.recordList').style['height'] = this.tableHeight;
        } else {
            //if height is not specified give the default value
            this.template.querySelector('.recordList').style['height'] = "18em";
        }
    }

    @wire(getListInfoByName, { objectApiName: '$sObjectName', listViewApiName: '$listViewName' })
    getListViewNameRecords({error, data}){
        if(data){
            console.log ("In ListView MetaData " + JSON.stringify(data));
            
            //First set the label
            this.objectlabel = data["label"]; 
            
            //get all the displayColumns
            var listViewColumns = [];
            for (var displayColumn in data["displayColumns"]) {
                var fieldApiName = data["displayColumns"][displayColumn]["fieldApiName"];
                listViewColumns.push (fieldApiName);
            }

            var filterLogicString = data["filterLogicString"];
            var finalfilterString = [];
            var filter =  '';
            //now get all the filter by information
            for (var filterInfo in data["filteredByInfo"]) {
                // add the fieldAPIName
                var filterFieldName =  data["filteredByInfo"][filterInfo]["fieldApiName"];
                
                //add the opeartor
                var filterOperator =  data["filteredByInfo"][filterInfo]["operator"];
                
                //add operator value
                var filterOperands =  data["filteredByInfo"][filterInfo]["operandLabels"];
                for (var filterOperand in filterOperands) {
                    var eachFilterOperand = data["filteredByInfo"][filterInfo]["operandLabels"][filterOperand];
                    var filterString = this.getFilterLogicString (filterFieldName, filterOperator, eachFilterOperand);
                    filter = filter + filterString;
                    if (filterOperand < filterOperands.length - 1) {
                        filter += ' AND ';
                    }
                    console.log ("Each Filter " + filter);
                }

                //If it is null then it is AND condition
                if (filterLogicString) {
                    filterLogicString = filterLogicString.replace(+filterInfo + 1,filter);
                } else {
                    finalfilterString.push (filter);
                }
                //reset the filter
                filter = '';
            }

            for (var orderInfo in data["orderedByInfo"]) {
                var orderByFieldName = data["orderedByInfo"][orderInfo]["fieldApiName"];
                var isAscending = data["orderedByInfo"][orderInfo]["isAscending"];

                //As of now we only support sigle Field order by so exit
                this.sortBy = orderByFieldName;
                this.sortDirection = isAscending ? 'asc' : 'desc';
                break;
            }

            if (filterLogicString) {
                this.filters = filterLogicString;
            } else {
                console.log ("Constructed Filter String " + finalfilterString);
                this.filters = finalfilterString.join(" AND ");
            }
            this.columns = listViewColumns.join(", ");
            this.queryOffset = 0;

            console.log ("Listview Data columns " + this.columns);
            console.log ("Listview Data filter logic " + this.filters);
            console.log ("Listview Data sort by FieldName " + this.sortBy);
            console.log ("Listview Data sort by Direction " + this.sortDirection);

            //After getting all the metadata now get the records
            this.getFieldDetailsMethod ();
            this.methodgetTotalRecords();
            this.loadData ();

        }else if(error){
            //
        }
    }

     getFilterLogicString (filterFieldName,opeartor, operand) {
        switch (opeartor) {
            case "Equals" :
                return filterFieldName + ' = '+ '\''+ operand + '\'';
                break;
            case "NotEqual" :
                return filterFieldName + ' != '+ '\''+ operand + '\'';
                break; 
            case "Contains" :
                return filterFieldName + ' LIKE ' + '\'%' + operand + '%' + '\'';
                break;  
            case "NotContain" :
                return '(NOT (' + filterFieldName + ' LIKE ' + '\'%' + operand + '%' + '\'))';
                break; 
            case "Includes" :
                return filterFieldName + ' INCLUDES ' + '(' + '\ '+ operand + '\')';
                break; 
            case "Excludes" :
                return filterFieldName + ' EXCLUDES ' + '(' + '\ '+ operand + '\')';;
                break;     
            case "StartsWith" :
                return filterFieldName + ' LIKE ' + '\'' + operand + '%' + '\'';;
                break;       
            case "LessThan":
                return filterFieldName + ' < '+ '\ '+ operand + '\'';
                break; 
            case "LessOrEqual":
                return filterFieldName + ' <= '+ '\ '+ operand + '\'';
                break; 
            case "GreaterThan":
                return filterFieldName +' > '+ '\ '+ operand + '\'';
                break; 
            case "GreaterOrEqual":
                return filterFieldName + ' >= '+ '\ '+ operand + '\'';
                break;  
            default: 
                break;       
        }
    }

    getFieldDetailsMethod(){
        var params={
            objectName:this.sObjectName,
            queryType : this.queryType,
            fieldsToQuery:this.columns,
            filters:this.filters,
            recordId:this.recordId
        };
        _servercall(
            getFieldDetails,
            params,
            this.handleSuccess.bind(this),
            this.handleError.bind(this)
        );
    }

    handleSuccess(data) {
        data = data.fieldNameToDetailsMap;
        var columns = [];
			if (data) {
                var index = 0;
                var length = Object.keys(data).length;;
				for (var fieldName in data) {
                    
					var fieldLabel = data[fieldName]["label"];
					var fieldDisplaytype = data[fieldName]["displaytype"];
                    var fieldApiName = data[fieldName]["apiname"];
                    console.log ("Processing FieldName " + fieldName + " with type  " + fieldDisplaytype);

                    //fieldDisplaytype is reference it is not supported in datatable so show it as text
                    if (fieldDisplaytype === 'reference') {
                        fieldDisplaytype = 'text';
                    }
                    if (index == length - 1) {
                        //for the first field insert an link
                        console.log ("This is the button field " + fieldApiName);
                        columns.push({
                            type: 'button',
                            label: fieldLabel,
                            fieldName: fieldApiName,
                            sortable: true,
                            sortDirection: (this.sortBy == fieldApiName && this.sortDirection=='asc') ? true :false,
                            sortedBy:this.sortBy == fieldApiName ? true : false,
                            typeAttributes: { 
                                label: { 
                                    fieldName: fieldApiName 
                                },
                                variant: 'base'
                            }
                        });
                    }
                    else {
                        if (fieldDisplaytype === 'currency') {
                            columns.push({
                                type: fieldDisplaytype,
                                label: fieldLabel,
                                fieldName: fieldApiName,
                                sortable: true,
                                sortDirection: (this.sortBy == fieldApiName && this.sortDirection=='asc') ? true :false,
                                sortedBy:this.sortBy == fieldApiName ? true : false ,
                                typeAttributes: {
                                    currencyCode: {
                                      fieldName: 'CurrencyIsoCode'
                                    },
                                    currencyDisplayAs: 'code',
                                    step: '0.01',
                                    maximumFractionDigits: '2'
                                  },
                                cellAttributes: {
                                    alignment: 'left'
                                  },  
                            });
                        } else {
                            columns.push({
                                type: fieldDisplaytype,
                                label: fieldLabel,
                                fieldName: fieldApiName,
                                sortable: true,
                                sortDirection: (this.sortBy == fieldApiName && this.sortDirection=='asc') ? true :false,
                                sortedBy:this.sortBy == fieldApiName ? true : false
                            });
                        }
                    }
                    index = index + 1;
                }
                //reverse the columns to preserve the order
                columns = columns.reverse()

                if (this.editbutton && this.deletebutton) {
                    columns.push({
                        type: "action",
                        typeAttributes: { rowActions: bothActions,menuAlignment: 'right' },
                    });

                }
                else if (this.editbutton) {
                    columns.push({
                        type: "action",
                        typeAttributes: { rowActions: editActions,menuAlignment: 'right' },
                    });
                }
                else if (this.deletebutton) {
                    columns.push({
                        type: "action",
                        typeAttributes: { rowActions: deleteActions,menuAlignment: 'right' },
                    });
                }
                this.headers=columns;
            }
    }

    methodgetTotalRecords(){
        var params=
        {
            objectName:this.sObjectName,
            filters : this.filters,
            recordId:this.recordId,
            queryType: this.queryType
        };
        _servercall(
            getTotalRecords,
            params,
            this.handleSuccesstotalrecords.bind(this),
            this.handleError.bind(this)
        );
    }

    handleSuccesstotalrecords(data){
        this.totalRecordCount=data.totalrecords;
    }

    methodgetApiName(){
        var params={
            recordId:this.recordId,
            objectName:this.sObjectName,
        };
        _servercall(
            getApiNameOfChild,
            params,
            this.handleSuccessobjectname.bind(this),
            this.handleError.bind(this)
        );
    }

    handleSuccessobjectname(data){
        this.apiNameOfObject=data.maptoReturn.Apiname;
        this.relationShipName=data.maptoReturn.fieldname;
    }

    methodretrieveIconForObject(){
        var params={
            objectname:this.sObjectName,
            recordId:this.recordId
        };
        _servercall(
            retrieveIconForObject,
            params,
            this.handleSuccessicon.bind(this),
            this.handleError.bind(this)
        );
    }

    handleSuccessicon(data) {
        this.cssicon=data.iconPropertyMap.iconStyle;
        this.urlicon=data.iconPropertyMap.iconURL;
    }
    
    loadData(){
        this.isLoaded=false;
        let flatData;
        var params={
            objectName : this.sObjectName, 
            queryType  : this.queryType,
            listViewName : this.listViewName,
            fieldsToQuery : this.columns, 
            filters : this.filters,
            sortField:this.sortBy,
            sortDirect: this.sortDirection,
            recordId:this.recordId,
            offset : this.queryOffset,
            limitrec:this.paginationRecordsPerStep
        };
        return  getRecords(params)
        .then(result => {
            if (result.message == 'Success') {
                if (result.payload != undefined && result.message == 'Success') {
                    var payload = JSON.parse(result.payload);
                    if (payload.lstDataTableRecs != undefined) {
                        result = payload.lstDataTableRecs.lstDataTableData;
                        flatData = JSON.parse(JSON.stringify(result));
                        console.log("Data " + JSON.stringify(flatData));
                        let updatedRecords = [...this.records, ...flatData];
                        this.records = updatedRecords;
                        this.isLoaded=true;
                        this.hasMessage=false;
                        var listOfObjects=[];
                        listOfObjects=this.records;
                        for(var i = 0; i < listOfObjects.length;i++){
                            var obj = listOfObjects[i];
                            var url = '';
                            for(var prop in obj){  
                                if(!obj.hasOwnProperty(prop)) continue;
                                if(typeof obj[prop] == 'object' && typeof obj[prop] != 'Array'){
                                    obj = Object.assign(obj, this.flattenObject(prop,obj[prop]));
                                }
                                else if(typeof obj[prop] == 'Array'){
                                    for(var j = 0; j < obj[prop].length; j++){
                                        obj[prop+'_'+j] = Object.assign(obj,this.flattenObject(prop,obj[prop]));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
        .catch(error => {
           //this.handleError(error);
        });
    }

    flattenObject(propName,obj){
        var flatObject = [];
        for(var prop in obj){
            //if this property is an object, we need to flatten again
            var propIsNumber = isNaN(propName);
            var preAppend = propIsNumber ? propName+'_' : '';
            if(typeof obj[prop] == 'object'){
                flatObject[preAppend+prop] = Object.assign(flatObject, this.flattenObject(preAppend+prop,obj[prop]) );
            }    
            else{
                flatObject[preAppend+prop] = obj[prop];
            }
        }
        return flatObject;
    }

    loadMoreData(event) {
        this.tableElement = event.target;
        this.tableElement.isLoading = true;
        this.isLoaded=false;
        if(this.records.length > this.queryOffset){
            this.queryOffset = this.queryOffset + this.paginationRecordsPerStep;
            this.loadData()
                .then(()=> {
                    this.tableElement.isLoading = false;
                });
        } else {
            this.tableElement.isLoading = false;
            this.isLoaded=true;
            this.tableElement.enableInfiniteLoading = false;
        }
        this.isLoaded=true;
    }

    // handleSearchText(event) {
    //     this.isLoaded=false;
    //     this.searchText = event.detail.searchText;
    //     if(this.searchText.length>2){
    //         this.methodsearchrecords();
    //     }else{
    //         this.queryOffset=0;
    //         this.paginationRecordsPerStep=50000;
    //         this.records = [];
    //         this.loadData();
    //         this.methodgetTotalRecords();
    //     }
    //     this.isLoaded=true;
    // }

    // methodsearchrecords(){
    //     this.isLoaded=false;
    //     var params=
    //     { 
    //         objectName : this.sObjectName, 
    //         queryType: this.queryType ,
    //         fieldsToQuery : this.columns, 
    //         filters : this.filters,
    //         sortField:this.sortBy,
    //         sortDirect: this.sortDirection,
    //         recordId:this.recordId,
    //         offset : 0,
    //         limitrec:50000,
    //         searchSTring:this.searchText
    //     };
    //     utility._servercall(
    //         searchrecords,
    //         params,
    //         this.handleSuccesssearch.bind(this),
    //         this.handleError.bind(this)
    //     );
    //     this.isLoaded=true;
    // }

    // handleSuccesssearch(data){
    //     this.records = data.maptoReturn.records;
    //     this.totalRecordCount=data.maptoReturn.total;
    //     var listOfObjects=[];
    //     listOfObjects=this.records;
    //     for(var i = 0; i < listOfObjects.length;i++){
    //         var obj = listOfObjects[i];
    //         for(var prop in obj){      
    //             if(!obj.hasOwnProperty(prop)) continue;
    //             if(typeof obj[prop] == 'object' && typeof obj[prop] != 'Array'){
    //                 obj = Object.assign(obj, this.flattenObject(prop,obj[prop]));
    //             }
    //             else if(typeof obj[prop] == 'Array'){
    //                 for(var j = 0; j < obj[prop].length; j++){
    //                     obj[prop+'_'+j] = Object.assign(obj,this.flattenObject(prop,obj[prop]));
    //                 }
    //             }
    //         }
    //     }
    // }

    getError(error){
        if (error) {
            this.hasMessage = true;
            this.preparePageMessage(
                'slds-notify slds-notify_alert slds-theme_alert-texture slds-theme_error',
                'slds-icon_container slds-icon-utility-error slds-m-right_x-small',
                'Error',
                JSON.stringify(error),
                'utility:error'
            );
            // display server exception in toast msg 
            this.isLoaded = true;
        }
    }

    @wire(SessionContextAdapter)
    updateSessionContext({ data }) {
        this.isPreviewMode = data?.isPreview === true;
    }

    handleError(data) {
        if (!this.isPreviewMode) {
            this.getError(data);
            this.dispatchEvent(_toastcall('Something went wrong',_reduceErrors(data),'error','pester'));
            this.isLoaded = true;  
        }
    }

    preparePageMessage(pageMessageParentDivClass, pageMessageChildDivClass, messageTitle, messageSummary, messageIcon) {
        this.pageMessageParentDivClass = pageMessageParentDivClass;
        this.pageMessageChildDivClass = pageMessageChildDivClass;
        this.messageTitle = messageTitle;
        this.messageSummary = messageSummary;
        this.messageIcon = messageIcon;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === undefined) {
            //if the action is undefined then it is show details event
            this.showDetails (row);
        } else {
            switch (actionName) {
            case "edit":
                this.editRecord(row);
                break;
            case "delete":
                this.deleteRow(row);
                break;
            default:
                break;
            }
        }
    }

    showDetails(row) {
        this.isShowModal = true;
        this.isEditClicked = true;
        this.isAddClicked = false;
        this.recordFormLabel = "View " + this.sObjectName;
        this.viewMode = "view";
        this.editObjectName = this.sObjectName;
        this.editRecordId = row["Id"];
    }

    editRecord(row) {
        this.isShowModal = true;
        this.isEditClicked = true;
        this.isAddClicked = false;
        this.recordFormLabel = "Edit " + this.sObjectName;
        this.editRecordId = row["Id"];
        this.editObjectName = this.sObjectName;
        this.viewMode = "edit";
    }

    addRecord () {
        this.isShowModal = true;
        this.isEditClicked = false;
        this.isAddClicked = true;
        this.recordFormLabel = "Add " + this.sObjectName;
        this.editObjectName = this.sObjectName;
    }


    onAddHandleSuccess ( event ) {
        this.showToast(this.sObjectName + ' Created', 'Record ID: ' + event.detail.id, 'success');
        //reset the query
        this.queryOffset=0;
        this.records = [];
        this.loadData();
        this.methodgetTotalRecords();
    }

    onEditHandleSuccess ( event ) {
        this.showToast('Record Update', this.sObjectName + ' Updated Successfully', 'success');
        this.queryOffset=0;
        this.records = [];
        this.loadData();
    }

    hideModalBox() { 
        //reset everything
        this.isShowModal = false;
        this.isEditClicked = false;
        this.isAddClicked = false;
    }

    findRowIndexById(id) {
        let ret = -1;
        this.records.some((row, index) => {
          if (row.Id === id) {
            ret = index;
            return true;
          }
          return false;
        });
        return ret;
    }


    async deleteRow(row) {
        const result = await LightningConfirm.open({
            message: "Are you sure you want to delete the record?",
            variant: "headerless",
            label: "This is the aria-label value",
        });
        if (result == true) {
            let id = row["Id"],
            index = this.findRowIndexById(id);
            if (index !== -1) {
            deleteRecord(id)
                .then(() => {
                this.records = this.records
                    .slice(0, index)
                    .concat(this.records.slice(index + 1));
                //call the total records    
                this.methodgetTotalRecords();    
                this.showToast("Success", "Record deleted", "success");
                })
                .catch((error) => {
                this.showToast("Error deleting record", JSON.stringify(error), "error");
                });
            }
        }
   }
    

    showToast(title, message, variant) {
        this.dispatchEvent(
          new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
          })
        );
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    onHandleSort( event ) {
        this.isLoaded = false;
        const { fieldName: sortedBy, sortDirection } = event.detail;
        var reverse = sortDirection === 'asc' ? 1 : -1;
        const cloneData = [...this.records];
        let table = JSON.parse(JSON.stringify(cloneData));
        table.sort((a,b) => 
              {return a[sortedBy] > b[sortedBy] ? 1 * reverse : -1 * reverse}
        );
        this.records = table;
        this.sortDirection = sortDirection;
        this.sortBy = sortedBy;
        this.isLoaded = true;
    }
}