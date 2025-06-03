var allAJAXTestsResults = [];
var isRunAll = false;
const allAJAXTestNames = [Integrity_Checker_InactiveRemoteSitesTest];

function Integrity_Checker_InactiveRemoteSitesTest(sessionId) {
    var inactiveRemoteSitesAfterPromise;
    return new Promise((resolve) => {
        const FSLRemoteSiteUrls = ["https://fsl-gis.cloud.clicksoftware.com",
                                   "https://fsl-geocoding.cloud.clicksoftware.com",
                                   "https://fsl-optimize.cloud.clicksoftware.com",
                                   "https://svcexpert-prod.cloud.clicksoftware.com"];
        var parser = new DOMParser();
        var baseUrl = window.location.origin;
        var dataStr = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:tooling.soap.sforce.com">' +
                                '<soapenv:Header>' +
                                    '<urn:SessionHeader>' +
                                        '<urn:sessionId>' + sessionId + '</urn:sessionId>' +
                                    '</urn:SessionHeader>' +
                                '</soapenv:Header>' +
                                '<soapenv:Body>' +
                                    '<urn:query>' +
                                        '<urn:queryString>SELECT id, SiteName, EndpointUrl, isActive FROM RemoteSiteSetting where isActive = false </urn:queryString>' +
                                    '</urn:query>' +
                                '</soapenv:Body>' +
                              '</soapenv:Envelope>';
            


            var inactiveRemoteSitesList = [];
           // var examples;
            var inactiveRemoteSitesObj = 
            {
                //Ronit S. old test, rewrote it
                APEXClassName: "",
                issueDescriptionLong: 'Field Service uses remote sites for schedule optimization and geocoding. If you don\'t have remote sites activated, these features don\'t work as expected.',
                moreInfoURL: 'https://help.salesforce.com/articleView?id=configuring_remoteproxy.htm&type=5',
                Category: "Remote Sites",
                Status: "Compliant",
                issueDescription: "Remote Sites are Inactive - OLD",
                failureMsg: 'Inactive Remote Sites',
                issueType: "Critical",
                recommendedValue: "Activate remote sites.",
                yourValue: "",
               // example: "these remote sites are not ok: ",
                examples2: {},
                testName: "Integrity_Checker_InactiveRemoteSitesTest" , 
                bestPractice: 'From Setup, navigate to Remote Site Settings. Make sure that all of the Field Service managed package remote sites are marked as active. ',
                inactiveRemoteSitesList: inactiveRemoteSitesList,
                logicEngine:'LS',
            };
            var resultObj = {};
            
            var examples = [];
           
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function(e) {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    var parser = new DOMParser();
                    var response = xmlhttp;
                    var xmlDoc = parser.parseFromString(response, "text/xml");
                    var res = response.responseXML.getElementsByTagName("sf:EndpointUrl");
                    var siteName = response.responseXML.getElementsByTagName("sf:SiteName");
                    var siteId = response.responseXML.getElementsByTagName("sf:Id");
                    var siteIsActive = response.responseXML.getElementsByTagName("sf:IsActive");

                    for (let i=0;i<res.length;i++){
                        if (FSLRemoteSiteUrls.includes(res[i].innerHTML)){
                            inactiveRemoteSitesObj.inactiveRemoteSitesList.push(res[i].innerHTML);
                        }
                    }
                    if (inactiveRemoteSitesObj.inactiveRemoteSitesList.length > 0){
                        inactiveRemoteSitesObj.Status = "Failed";
                        inactiveRemoteSitesObj.displayIconName = 'utility:close';
                        //inactiveRemoteSitesObj.truthy = false;
                        inactiveRemoteSitesObj.isActive = false;
                        inactiveRemoteSitesObj.yourValue = "Found " + inactiveRemoteSitesList.length + " occurrences of the issue  \n";
                        for(var i = 0; i< inactiveRemoteSitesList.length; i++)
                        {
                           //  inactiveRemoteSitesObj.examples2 = {"name" :  siteName[i].innerHTML, "link" : res[i].innerHTML};component.set("v.url", window.location.origin);
                           examples.push({"name" :  siteName[i].innerHTML, "link" : window.location.origin +'/'+ siteId[i].innerHTML, "site Adrress":res[i].innerHTML, "Active": siteIsActive[i].innerHTML});
                           console.log(inactiveRemoteSitesObj.examples);
                        }
                        inactiveRemoteSitesObj.examples2 = examples;
                        //inactiveRemoteSitesObj.examples2.({"Name" : "HELLO"});
                        inactiveRemoteSitesObj.examplesSize =inactiveRemoteSitesList.length; 
 
                    }
                    else {
                        inactiveRemoteSitesObj.displayIconName = 'utility:check';
                        inactiveRemoteSitesObj.yourValue = "All Field Service Remote sites are active";
                        inactiveRemoteSitesObj.isActive = "true";
                    }

                    
                    resolve(inactiveRemoteSitesObj);
                }
            }
                    xmlhttp.open('POST', baseUrl + '/services/Soap/T/59.0');
                    xmlhttp.setRequestHeader('Content-Type', 'text/xml');
                    xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
                    xmlhttp.setRequestHeader('SOAPAction', '""'); 
                    xmlhttp.send(dataStr);
    });
}

function prepareDataForRunningAJAXTests(event){
    var testsToRun = event.getParam("AjaxTestsToRun");
    var isRerunFailedTests = event.getParam("isRerunFailedTests");
    if (testsToRun.length === 0){ // if testsToRun is empty it means we need to run all tests
        testsToRun = allAJAXTestNames;
        isRunAll = true;
        runAjaxTests(sessionId,event.getSource(),testsToRun,isRerunFailedTests,isRunAll);
    }
    else { // not run all tests
        prepareDataForSpecificTests(sessionId,event.getSource(),testsToRun,isRerunFailedTests);
    }
}
function getSessionIdAndSendToLC(event){
    var cmp = event.getSource();
    var eve = cmp.getEvent("Integrity_Checker_getSessionId");
    eve.setParams({"sessionIdParam" : sessionId});
    eve.fire();
}

function runAjaxTests(sessionId,cmp,testNames,isRerunFailedTests,isRunAll){
    var allAjaxTestResults = [];
    var promises = [];
    testNames.forEach(singleTest => {
        promises.push(singleTest(sessionId));
    })
    Promise.all(promises)
    .then((results) => {
        results.forEach(singleResult => {
            //allAjaxTestResults = upsertToList(singleResult, allAjaxTestResults);//Ronit S. Hiding the Remote Site tests written in APEX
        })
        sendResultsToLC(cmp,allAjaxTestResults,isRerunFailedTests,isRunAll);        
    });
    
}
function sendResultsToLC(cmp,results,isRerunFailedTests,isRunAll){
    var eve = cmp.getEvent("Integrity_Checker_SoapResults");
    eve.setParams( {"data":results} );
    eve.setParams({"isRunAll":isRunAll});
    eve.setParams({"isRerunFailedTests": isRerunFailedTests});
    eve.fire();
}

function upsertToList(item,list){
    const index = list.findIndex(_item => _item.testName === item.testName);
    if (index > -1) list[index] = item;
    else list.push(item);

    return list;
}
function runAllAJAXTestsAgain(event){
    runAjaxTests(sessionId,event.getSource(),allAJAXTestNames,false,true);
}
function prepareDataForSpecificTests(sessionId,event,testsToRun,isRerunFailedTests){
    var testsToRunConvertedToFns = [];
    testsToRun.forEach(testToRunAsString => testsToRunConvertedToFns.push(eval(testToRunAsString)));

    runAjaxTests(sessionId,event,testsToRunConvertedToFns,isRerunFailedTests,false);
}


