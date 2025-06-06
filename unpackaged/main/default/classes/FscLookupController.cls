public without sharing class FscLookupController {
    
    @AuraEnabled
    public static List<SObject> search(String searchTerm, String objectName, String fieldsToSearch, String fieldsToReturn, Integer numRecordsToReturn, String whereClause, String orderByClause) {
        System.debug('in search: searchTerm='+ searchTerm +'. objectName='+ objectName +'. fieldsToSearch='+ fieldsToSearch +'. fieldsToReturn='+ fieldsToReturn +'. numRecordsToReturn='+ numRecordsToReturn +'.');
        List<SObject> returnRecords = new List<SObject>();
        Map<String, Schema.SObjectField> fieldMap = getFieldMap(objectName);
        String objectNameField = getNameField(objectName);
        String searchFieldString;
        if (String.isBlank(fieldsToSearch)) {
            fieldsToSearch = '';
        }
        fieldsToSearch = fieldsToSearch.replaceAll('(\\s+)', '');
        System.debug('fieldsToSearch = '+ fieldsToSearch);
        if (String.isBlank(fieldsToReturn)) {
            fieldsToReturn = '';
        }
        fieldsToReturn = fieldsToReturn.replaceAll('(\\s+)', '');
        System.debug('fieldsToReturn = '+ fieldsToReturn);


        if (!String.isBlank(searchTerm)) {
            if (String.isBlank(fieldsToSearch)) {
                fieldsToSearch = objectNameField;
            } else if (fieldsToSearch.toLowerCase() == 'all') {
            }

            List<String> searchFieldList = new List<String>();
            for (String searchField : fieldsToSearch.split(',')) {
                System.debug('searching for !'+ searchField +'!, or !'+ searchField.trim()+'!');
                System.debug('found '+ fieldMap.get(searchField));
                if (fieldMap.get(searchField).getDescribe().getType().name() == 'String')
                    searchFieldList.add(searchField +' LIKE \'%'+ searchTerm +'%\'');
                // else 
                    // searchFieldList.add(searchField +' = \''+ searchTerm +'\'');
            }
            searchFieldString = String.join(searchFieldList, ' OR ');
        }

        if (String.isBlank(fieldsToReturn)) {
            // fieldsToReturn = 'Id, '+ objectNameField;
            fieldsToReturn = objectNameField;
        // } else {
        //     fieldsToReturn = String.join(splitAndTrim(fieldsToReturn), ',');
        }

        String queryString = 'SELECT '+ fieldsToReturn +' FROM '+ objectName;
        // Integer whereComponents = (String.isBlank(whereClause) ? 0 : 1) + (String.isBlank(searchFieldString) ? 0 : 1);
        if (!String.isBlank(whereClause) || !String.isBlank(searchFieldString)) {
            queryString +=' WHERE ';
            if (!String.isBlank(whereClause) && !String.isBlank(searchFieldString)) {
                queryString += '('+ searchFieldString +') AND ('+ whereClause +')';
            } else {
                queryString += String.isBlank(searchFieldString) ? whereClause : searchFieldString;
            }
        }
        if (!String.isBlank(orderByClause)) {
            queryString += ' ORDER BY '+ orderByClause;
        }
        if (numRecordsToReturn > 0) {
            queryString += ' LIMIT '+ numRecordsToReturn;
        }
        System.debug('queryString = '+ queryString);
        returnRecords = Database.query(queryString);
        return returnRecords;
    }

    @AuraEnabled(cacheable=true)
    public static List<SObject> getRecordsFromIds(String objectName, String fieldsToReturn, List<String> idsToRetrieve){        
        // return search(null, objectName, )        
        List<String> recordIds = new List<String>();
        for (String recordId : idsToRetrieve) {
            recordIds.add('\''+ recordId +'\'');
        }
        String whereClauseString = 'Id IN ('+ String.join(recordIds, ',') +')';
        return search(null, objectName, null, fieldsToReturn, 0, whereClauseString, null);
    }

    @AuraEnabled(cacheable=true)
    public static List<SObject> getRecentlyViewed(String objectName, String fieldsToReturn, Integer numRecordsToReturn, String whereClause){
        // try {
            if (!(numRecordsToReturn > 0)) {
                numRecordsToReturn = 5;
            }
            List<RecentlyViewed> recentViews = search(null, 'RecentlyViewed', null, 'Id', numRecordsToReturn, 'Type = \''+ objectName +'\'', 'LastReferencedDate DESC');
            if (recentViews.size() == 0) {
                return new List<SObject>();
            }
            List<String> recordIds = new List<String>();
            for (RecentlyViewed recentView : recentViews) {
                recordIds.add('\''+ recentView.Id +'\'');
            }
            String whereClauseString = 'Id IN ('+ String.join(recordIds, ',') +')';
            if (!String.isBlank(whereClause)) {
                whereClauseString += ' AND '+ whereClause;
            }
            return search(null, objectName, null, fieldsToReturn, numRecordsToReturn, whereClauseString, 'LastReferencedDate DESC');
        // } catch (Exception e) {
        //     System.debug('Error in getRecentlyViewed: '+ e);
        //     return null;
        // }
    }

    // Knowledge_Day__c = '{!Get_KDVG_Member.Knowledge_Day__c}'

    public static List<String> splitAndTrim(String inputString) {
        return splitAndTrim(inputString, ',');
    }

    public static List<String> splitAndTrim(String inputString, String delimiter) {
        List<String> splitStrings = inputString.split(delimiter);
        for (String splitString : splitStrings) {
            splitString = splitString.trim();
            System.debug('trimmed version is !'+ splitString +'!');
        }
        System.debug('returning '+ splitStrings);
        return splitStrings;
    }

    public static Map<String, Schema.SObjectField> getFieldMap(String objectName) {
        return ((SObject)(Type.forName('Schema.'+objectName).newInstance())).getSObjectType().getDescribe().fields.getMap();
    }

    public static String getNameField(String objectName) {
        Map<String, Schema.SObjectField> fieldMap = getFieldMap(objectName);
        if (fieldMap.containsKey('Name') && fieldMap.get('Name').getDescribe().IsNameField()) {
            return 'Name';
        }
        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldResult = fieldMap.get(fieldName).getDescribe();
            if (fieldResult.IsNameField()) {
                return fieldResult.getName();
            }
        }
        return null;
    }
}