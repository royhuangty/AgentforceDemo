public with sharing class B2B_Moodboard_Controller {

    @AuraEnabled(cacheable=false)
    public static Map<String, String> getMoodBoardNames(String userId, String effectiveAccountId) {

        Map<String, String> moodBoardMap = new Map<String, String>();

        List<B2B_Mood_Board__c> moodBoardList = new List<B2B_Mood_Board__c>();

        if(Schema.sObjectType.B2B_Mood_Board__c.fields.Id.isAccessible()
            && Schema.sObjectType.B2B_Mood_Board__c.fields.Name.isAccessible()
            && Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Name__c.isAccessible()
            && Schema.sObjectType.B2B_Mood_Board__c.fields.OwnerId.isAccessible()
            && Schema.sObjectType.B2B_Mood_Board__c.fields.Account__c.isAccessible()) {
            moodBoardList = [Select Id, Name, Mood_Board_Name__c from B2B_Mood_Board__c where OwnerId = :userId and Account__c = :effectiveAccountId];
        }

        if(moodBoardList.size() > 0) {
            for(B2B_Mood_Board__c mb : moodBoardList) {
                moodBoardMap.put(mb.Id, mb.Mood_Board_Name__c);
            }
        }

        return moodBoardMap;

    }

    @AuraEnabled(cacheable=false)
    /*
        Retrieves the data for the saved mood board.
        Retrieves the product info and adds that to the data returned to the client.

        NOTE: do not use cacheable=true on this method, or the Connect Api calls will fail.
    */
    public static String getMoodBoardData(String userId, String moodBoardId, String communityId, String webstoreId, String effectiveAccountId, Boolean includePrices) {

        System.debug('getMoodBoardData() - begin');

        // System.debug('userId: ' + userId);
        // System.debug('moodBoardId: ' + moodBoardId);
        // System.debug('communityId: ' + communityId);
        // System.debug('webstoreId: ' + webstoreId);
        // System.debug('effectiveAccountId: ' + effectiveAccountId);
        // System.debug('includePrices: ' + includePrices);

        String data = null;

        try {

            // Lookup the webstore ID associated with the community
            if(webstoreId == null) {
                webstoreId = resolveCommunityIdToWebstoreId(communityId);

                // System.debug('webstoreId: ' + webstoreId);
            }
            
            String jsonData = null;

            final String [] objFields = new String[]{'Id'
                                                    ,'Name'
                                                    ,'OwnerId'
                                                    ,'Mood_Board_Data__c'
                                                };

            List<B2B_Mood_Board__c> moodBoardList = new List<B2B_Mood_Board__c>();

            if(Schema.sObjectType.B2B_Mood_Board__c.fields.Id.isAccessible()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Name.isAccessible()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.OwnerId.isAccessible()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Data__c.isAccessible()) {
                moodBoardList = [Select Id, Name, Mood_Board_Data__c from B2B_Mood_Board__c where OwnerId = :userId and Id = :moodBoardId];
            }
            else {
                throw new CustomException('You are not authorized to read B2B Moodboard records');
            }

            if(moodBoardList.size() > 0) {
                B2B_Mood_Board__c mb = moodBoardList.get(0);

                jsonData = mb.Mood_Board_Data__c;
            }

            List<Object> mbList = (List<Object>)JSON.deserializeUntyped(jsonData);

            List<Object> productList = getMoodboardProductDetailsApex(mbList, webstoreId, effectiveAccountId);

            if(includePrices) {
                getMoodboardProductPriceDetailsApex(productList, webstoreId, effectiveAccountId);
            }

            data = JSON.serialize(productList);

        }
        catch (Exception e) {
            System.debug('Exception: ' + e.getMessage());
            System.debug('Line #: ' + e.getLineNumber());
            System.debug(e.getStackTraceString());
        }

        return data;

    }

    /*
        Utilzes the Connect Apex API to retrieve the product details for each product Id in the saved mood board data.
    */
    private static List<Object> getMoodboardProductDetailsApex(List<Object> mbList, String webstoreId, String effectiveAccountId) {

        System.debug('getMoodboardProductDetails() - begin');

        Boolean excludeFields = false;
        List<String> mediaGroups = new List<String>();
        Boolean excludeMedia = false;
        Boolean excludeEntitlementDetails = true;
        Boolean excludePrimaryProductCategory = true;

        List<String> fields = new List<String>();
        fields.add('StockKeepingUnit');
        fields.add('Name');
        fields.add('Description');

        List<B2B_Moodboard_Util.ProductDetailWrapper> productList = new List<B2B_Moodboard_Util.ProductDetailWrapper>();

        // The following List is used only for test coverage purposes.
        List<String> productIdList = new List<String>();

        for(Object obj : mbList) {

            Map<String, Object> mbProduct = (Map<String, Object>)obj;

            String productId = (String)mbProduct.get('id');

            productIdList.add(productId);

        }


        for(Object obj : mbList) {

            Map<String, Object> mbProduct = (Map<String, Object>)obj;

            String productId = (String)mbProduct.get('id');

            Integer sequence = (Integer)mbProduct.get('sequence');
            Integer top = (Integer)mbProduct.get('t');
            Integer left = (Integer)mbProduct.get('l');
            Integer height = (Integer)mbProduct.get('h');
            Integer width = (Integer)mbProduct.get('w');
            Integer zIndex = (Integer)mbProduct.get('z');

            ConnectApi.ProductDetail detail = null;

            if(Test.isRunningTest() == false) {
                // Call the Connect Apex API
                // TODO what happens if the user is not entitled to the product?
                detail = ConnectApi.CommerceCatalog.getProduct(
                    webstoreId
                    , productId
                    , effectiveAccountId
                    , fields
                    , excludeFields
                    , mediaGroups
                    , excludeMedia
                    , excludeEntitlementDetails
                    , excludePrimaryProductCategory);
            }
            else {
                // Load the test data
                if(B2B_Moodboard_ControllerTestUtils.productList == null) {
                    
                    B2B_Moodboard_ControllerTestUtils.productList = B2B_Moodboard_ControllerTestUtils.getProducts(productIdList);
                }

                detail = B2B_Moodboard_ControllerTestUtils.getProductDetailTest(productId);
            }

            B2B_Moodboard_Util.ProductDetailWrapper product = new B2B_Moodboard_Util.ProductDetailWrapper();

            product.defaultImage = detail.defaultImage;

            // Need to convert the field data returned to match how the search REST API returns that data.
            Map<String, Object> fieldsMap = new Map<String, Object>();

            for(String fieldName : detail.fields.keySet()) {
                String fieldValue = detail.fields.get(fieldName);

                Map<String, String> fieldValueMap = new Map<String, String>{'value' => fieldValue};

                fieldsMap.put(fieldName, fieldValueMap);

            }

            product.fields = fieldsMap;

            product.entitlement = detail.entitlement;
            product.mediaGroups = detail.mediaGroups;
            product.primaryProductCategoryPath = detail.primaryProductCategoryPath;
            product.id = detail.id;
            product.name = detail.fields.get('Name');

            // This is mood board specific
            product.sequence = sequence;
            product.top = top;
            product.left = left;
            product.height = height;
            product.width = width;
            product.zIndex = zIndex;

            productList.add(product);

        }

        return productList;

    }

    /*
        Utilzes the Connect Apex API to retrieve the product pricing for each product Id in the saved mood board data.
    */
    private static void getMoodboardProductPriceDetailsApex(List<Object> productList, String webstoreId, String effectiveAccountId) {

        System.debug('getMoodboardProductPriceDetails() - begin');

        List<ConnectApi.PricingLineItemInput> pricingLineItems = new List<ConnectApi.PricingLineItemInput>();

        ConnectApi.PricingInput pricingInput = new ConnectApi.PricingInput();

        for(Object obj : productList) {

            B2B_Moodboard_Util.ProductDetailWrapper product = (B2B_Moodboard_Util.ProductDetailWrapper)obj;

            String productId = product.id;

            ConnectApi.PricingLineItemInput lineItem = new ConnectApi.PricingLineItemInput();
            lineItem.productId = productId;
    
            pricingLineItems.add(lineItem);

        }

        // System.debug('pricingLineItems size = ' + pricingLineItems.size());

        pricingInput.pricingLineItems = pricingLineItems;

        ConnectApi.PricingResult result = null;

        if(Test.isRunningTest() == false) {
            result = ConnectApi.CommerceStorePricing.getProductPrices(webstoreId, effectiveAccountId, pricingInput);
        }
        else {
            List<String> productIdList = new List<String>();

            for(ConnectApi.PricingLineItemInput lineItem : pricingLineItems) {
    
                String productId = lineItem.productId;
        
                productIdList.add(productId);
    
            }

            // Load the test data
            if(B2B_Moodboard_ControllerTestUtils.pricebookEntryMap == null) {
                    
                B2B_Moodboard_ControllerTestUtils.pricebookEntryMap = B2B_Moodboard_ControllerTestUtils.getPricebookEntries(productIdList);
            }

            result = B2B_Moodboard_ControllerTestUtils.getProductPricingTest(productIdList);
        }

        //System.debug('result: ' + JSON.serialize(result));

        List<ConnectApi.PricingResultLineItem> pricingLineItemResults = result.pricingLineItemResults;

        // Put all of the pricing results into a Map by productId
        Map<String, ConnectApi.PricingResultLineItem> pricingMap = new Map<String, ConnectApi.PricingResultLineItem>();

        for(ConnectApi.PricingResultLineItem resultLineItem : pricingLineItemResults) {

            String productId = resultLineItem.productId;

            pricingMap.put(productId, resultLineItem);

        }

        //System.debug('pricingMap: ' + JSON.serialize(pricingMap));

        for(Object obj : productList) {

            B2B_Moodboard_Util.ProductDetailWrapper product = (B2B_Moodboard_Util.ProductDetailWrapper)obj;

            String productId = product.id;

            if(productId.length() > 15) {
                productId = productId.substring(0, 15);
            }

            if(pricingMap.containsKey(productId)) {

                // System.debug('pricing found for product: ' + product.name);

                ConnectApi.PricingResultLineItem resultLineItem = pricingMap.get(productId);

                B2B_Moodboard_Util.ProductPricingWrapper prices = new B2B_Moodboard_Util.ProductPricingWrapper();

                prices.listPrice = resultLineItem.listPrice;
                prices.unitPrice = resultLineItem.unitPrice;
                prices.pricebookEntryId = resultLineItem.pricebookEntryId;

                product.prices = prices;

            }

        }

    }

    @AuraEnabled
    public static Map<String, Object> saveMoodBoard(String userId, String moodBoardId, String moodBoardName, String effectiveAccountId, String data) {

        Map<String, Object> responseMap = new Map<String, Object>();

        // System.debug('userId: ' + userId);
        // System.debug('moodBoardId: ' + moodBoardId);
        // System.debug('moodBoardName: ' + moodBoardName);
        // System.debug('effectiveAccountId: ' + effectiveAccountId);
        // System.debug('data: ' + data);
        
        String response;

        try {

            if (
                Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Name__c.isCreateable()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Data__c.isCreateable()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Account__c.isCreateable()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Name__c.isUpdateable()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Mood_Board_Data__c.isUpdateable()
                && Schema.sObjectType.B2B_Mood_Board__c.fields.Account__c.isUpdateable()){

                B2B_Mood_Board__c mb = new B2B_Mood_Board__c(
                    Mood_Board_Name__c = moodBoardName
                    , Mood_Board_Data__c = data
                    , Account__c = effectiveAccountId
                );

                if(moodBoardId != null) {
                    mb.Id = moodBoardId;
                    update mb;
                }
                else {
                    insert mb;
                }

                responseMap.put('moodboardId', mb.Id);
                
            }
            else {
                throw new CustomException('You are not authorized to create B2B Moodboard records');
            }

            Message msg = new Message();
            msg.title = Label.B2B_MB_Processing_Complete;
            msg.message = Label.B2B_MB_Moodboard_saved_successfully;
            msg.severity = SUCCESS;
            msg.toast = true;

            addMessage(msg, null, responseMap);

        }
        catch (Exception err) {
            Message msgErr = new Message();
            msgErr.title = Label.B2B_MB_Processing_Error_Title;
            msgErr.message = err.getMessage();
            msgErr.severity = ERROR;
            addMessage(msgErr, null, responseMap);
        }

        List<Message> retMessages = (List<Message>)responseMap.get('messages');

        String messagesJson = JSON.serialize(retMessages);
        // System.debug('messagesJson: ' + messagesJson);
        responseMap.put('messagesJson', messagesJson);

        return responseMap;

    }

    @AuraEnabled
    public static Map<String, Object> deleteMoodBoard(String moodBoardId) {

        Map<String, Object> responseMap = new Map<String, Object>();

        // System.debug('userId: ' + userId);
        // System.debug('moodBoardId: ' + moodBoardId);
        // System.debug('moodBoardName: ' + moodBoardName);
        // System.debug('effectiveAccountId: ' + effectiveAccountId);
        // System.debug('data: ' + data);
        
        String response;

        try {

            if (Schema.sObjectType.B2B_Mood_Board__c.isDeletable()){

                B2B_Mood_Board__c mb = new B2B_Mood_Board__c(
                    Id = moodBoardId
                );

                delete mb;                
                
            }
            else {
                throw new CustomException('You are not authorized to delete B2B Moodboard records');
            }

            Message msg = new Message();
            msg.title = Label.B2B_MB_Processing_Complete;
            msg.message = Label.B2B_MB_Moodboard_deleted_successfully;
            msg.severity = SUCCESS;
            msg.toast = true;

            addMessage(msg, null, responseMap);

        }
        catch (Exception err) {
            Message msgErr = new Message();
            msgErr.title = Label.B2B_MB_Processing_Error_Title;
            msgErr.message = err.getMessage();
            msgErr.severity = ERROR;
            addMessage(msgErr, null, responseMap);
        }

        List<Message> retMessages = (List<Message>)responseMap.get('messages');

        String messagesJson = JSON.serialize(retMessages);
        // System.debug('messagesJson: ' + messagesJson);
        responseMap.put('messagesJson', messagesJson);

        return responseMap;

    }
    
    @AuraEnabled(cacheable=true)
    /*
        Retrieves products based on the search term or category id provided.
        @searchTerm: entered by the user.
        @categoryId: entered by the System Admin as a component property value.

    */
    public static Map<String, Object> getProducts(String searchTerm, String communityId, String webstoreId, String effectiveAccountId, Boolean includePrices, Integer pageSize, String categoryId) {
        
        Map<String, Object> responseMap = new Map<String, Object>();

        String searchResults = '';

        try {

            // System.debug('communityId: ' + communityId);

            // Lookup the webstore ID associated with the community
            if(webstoreId == null) {
                webstoreId = resolveCommunityIdToWebstoreId(communityId);

                // System.debug('webstoreId: ' + webstoreId);
            }

            //Make sure your Salesforce instance URL is added in remote site settings
            String sfdcURL = URL.getSalesforceBaseUrl().toExternalForm();

            // System.debug('sfdcURL: ' + sfdcURL);

            B2B_Mood_Board_Settings__c cs = B2B_Mood_Board_Settings__c.getOrgDefaults();

            if(cs.REST_API_Domain__c == null || cs.REST_API_Domain__c.trim() == '') {
                throw new CustomException('Component configuration is not complete.  Contact the store administrator for assistance.');
            }

            String domain = cs.REST_API_Domain__c;

            String restAPIURL = domain + '/services/data/v49.0/commerce/webstores/' + webStoreId + '/search/product-search';

            if(effectiveAccountId != null) {
                restAPIURL += '?effectiveAccountId=' + effectiveAccountId;
            }

            // System.debug('restAPIURL: ' + restAPIURL);

            Map<String, Object> searchInput = new Map<String, Object>();

            if(categoryId != null && categoryId != '') {
                searchInput.put('categoryId', categoryId);
            }
            else {
                searchInput.put('searchTerm', searchTerm);
            }
            

            List<String> fieldList = new List<String>();
            fieldList.add('StockKeepingUnit');
            fieldList.add('Name');
            fieldList.add('Description');

            searchInput.put('fields', fieldList);

            searchInput.put('page', 0);
            searchInput.put('pageSize', pageSize);

            if(includePrices) {
                searchInput.put('includePrices', true);
            }

            HttpRequest httpRequest = new HttpRequest();  
            httpRequest.setMethod('POST');
            httpRequest.setHeader('Content-Type', 'application/json');
            httpRequest.setHeader('Authorization', 'OAuth ' + UserInfo.getSessionId());
            httpRequest.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionID());
            httpRequest.setEndpoint(restAPIURL);

            String requestBody = JSON.serialize(searchInput);

            // System.debug('requestBody: ' + requestBody);

            httpRequest.setBody(requestBody);

            Http http = new Http();
            HttpResponse httpResponse = http.send(httpRequest);

            // System.debug('httpResponse.getStatusCode(): ' + httpResponse.getStatusCode());

            if (httpResponse.getStatusCode() == 200 || httpResponse.getStatusCode() == 201 ) {

                // System.debug('body: ' + httpResponse.getBody());

                searchResults = httpResponse.getBody();
            } else {
                String responseBody = httpResponse.getBody();

                List<Object> errorMessages = (List<Object>)JSON.deserializeUntyped(responseBody);

                for(Object message : errorMessages) {
                    Map<String, Object> errorMessage = (Map<String, Object>)message;

                    Message msgErr = new Message();
                    msgErr.title = Label.B2B_MB_Processing_Error_Title;
                    msgErr.message = (String)errorMessage.get('message');
                    msgErr.severity = ERROR;
                    addMessage(msgErr, null, responseMap);

                }

            }
        }
        catch(Exception e) {
                System.debug('ERROR: '+ e.getMessage());

                Message msgErr = new Message();
                        msgErr.title = Label.B2B_MB_Processing_Error_Title;
                        msgErr.message = e.getMessage();
                        msgErr.severity = ERROR;
                        addMessage(msgErr, null, responseMap);

        }

        // System.debug(' ** response ** : ' + response );

        responseMap.put('searchResults', searchResults);

        List<Message> retMessages = (List<Message>)responseMap.get('messages');

        String messagesJson = JSON.serialize(retMessages);
        // System.debug('messagesJson: ' + messagesJson);
        responseMap.put('messagesJson', messagesJson);

        return responseMap;

    }

    public static final Integer ADD_TO_CART_MAX = 100;

    @AuraEnabled
    public static Map<String, Object> addMoodBoardProductsToTheCart(String userId, String communityId, String webstoreId, String moodBoardName, String effectiveAccountId, String activeCartOrId, String data) {

        Map<String, Object> responseMap = new Map<String, Object>();

        List<Object> moodBoardList = (List<Object>)JSON.deserializeUntyped(data);

        List<String> itemsList = new List<String>();
        List<ConnectApi.CartItemInput> linesToAdd = new List<ConnectApi.CartItemInput>();
        List<ConnectApi.BatchInput> batchInputList = new List<ConnectApi.BatchInput>();
        ConnectApi.BatchResult[] batchResults = null;

        try {

            for(Object obj : moodBoardList) {

                Map<String, Object> itemMap = (Map<String, Object>)obj;

                String productId = (String)itemMap.get('id');

                itemsList.add(productId);
            }

            linesToAdd = createCartItems(itemsList, responseMap);

            batchInputList = createBatchInputLines(linesToAdd, responseMap);

            if(batchInputList.size() <= ADD_TO_CART_MAX) {

                if(Test.isRunningTest() == false) {
                    batchResults = addItemsToCart(webstoreId, effectiveAccountId, activeCartOrId, batchInputList);

                    // System.debug('batchResults: ' + JSON.serialize(batchResults));

                    System.debug('batchResults size = ' + batchResults.size());

                }

                processBatchResults(batchResults, responseMap);

                responseMap.put('totItems', batchInputList.size());
            }
            else {

                throw new CustomException(Label.B2B_MB_Distribute_Products_Error_Message);
                
            }

        }
        catch (Exception err) {

            Message msgErr = new Message();
            msgErr.title = Label.B2B_MB_Processing_Error_Title;
            msgErr.message = err.getMessage();
            msgErr.severity = ERROR;
            addMessage(msgErr, null, responseMap);

            updateResponseMapTotalValue('totErrors', moodBoardList.size(), responseMap);
        }
        finally {            
                
            Integer totErrors = (Integer)responseMap.get('totErrors');
            Integer totSuccess = (Integer)responseMap.get('totSuccess');

            if(totErrors > 0) {

                Message msgErr = new Message();
                msgErr.title = Label.B2B_MB_Processing_Error_Title;
                msgErr.message = Label.B2B_MB_Items_not_added_to_cart.replace('{0}', totErrors.format());
                msgErr.severity = ERROR;
                msgErr.toast = true;

                addMessage(msgErr, 0, responseMap);

            }

            if(totSuccess > 0) {

                Message msg = new Message();
                msg.title = Label.B2B_MB_Add_to_cart_processing_complete;
                msg.message = Label.B2B_MB_Items_added_to_cart_successfully.replace('{0}', totSuccess.format());
                msg.severity = SUCCESS;
                msg.toast = true;

                addMessage(msg, 0, responseMap);
            }

        }

        List<Message> retMessages = (List<Message>)responseMap.get('messages');

        String messagesJson = JSON.serialize(retMessages);
        // System.debug('messagesJson: ' + messagesJson);
        responseMap.put('messagesJson', messagesJson);

        return responseMap;

    }

    /*
        Creates a CartItemInput object for each item.
    */
    private static List<ConnectApi.CartItemInput> createCartItems(List<String> itemsList, Map<String, Object> responseMap) {

        System.debug('--- createCartItems() begin');

        List<ConnectApi.CartItemInput> linesToAdd = new List<ConnectApi.CartItemInput>();

        for (String item : itemsList) {
            
            ConnectApi.CartItemInput lineToAdd = new ConnectApi.CartItemInput();

            lineToAdd.productId = item;
            lineToAdd.quantity = '1';
            lineToAdd.type = ConnectApi.CartItemType.Product;

            linesToAdd.add(lineToAdd);
            
        }

        //System.debug('size = ' + linesToAdd.size());

        System.debug('--- createCartItems() exit');

        return linesToAdd;

    }

    /*
        Creates a BatchInput object for each CartInputItem.
        Returns a list of BatchInput objects.
    */
    private static List<ConnectApi.BatchInput> createBatchInputLines(List<ConnectApi.CartItemInput> linesToAdd, Map<String, Object> responseMap) {

        System.debug('--- createBatchInputLines() begin');

        List<ConnectApi.BatchInput> batchInputList = new List<ConnectApi.BatchInput>();

        for (ConnectApi.CartItemInput item : linesToAdd) {
            ConnectApi.BatchInput batchInput = new ConnectApi.BatchInput(item);
            batchInputList.add(batchInput);
        }

        // System.debug('batchInputList.size: ' + batchInputList.size());

        System.debug('--- createBatchInputLines() exit');

        return batchInputList;

    }

    private static ConnectApi.BatchResult[] addItemsToCart(String webstoreId, String effectiveAccountId, String activeCartOrId, List<ConnectApi.BatchInput> batchInputList) {

        System.debug('--- addItemsToCart() begin');

        ConnectApi.BatchResult[] batchResults = ConnectApi.CommerceCart.addItemsToCart(webstoreId, effectiveAccountId, activeCartOrId, batchInputList);

        System.debug('--- addItemsToCart() exit');

        return batchResults;
    }

    private static void processBatchResults(ConnectApi.BatchResult[] batchResults, Map<String, Object> responseMap) {

        System.debug('--- processBatchResults() begin');

        Integer i = 0;
        Integer totErrors = 0;
        Integer totSuccess = 0;

        if(batchResults != null) {

            for(ConnectApi.BatchResult batchResult : batchResults) {

                // System.debug('batchResult: ' + JSON.serialize(batchResult));

                ConnectApi.CartItem cartItem;

                if(batchResult.getResult() instanceof ConnectApi.CartItem) {
                    cartItem = (ConnectApi.CartItem)batchResult.getResult();
                }

                if(cartItem != null) {

                    // System.debug('cartItem: ' + JSON.serialize(cartItem));

                    if(batchResult.isSuccess == false) {
                        totErrors++;
                    }
                    else {
                        totSuccess++;
                    }
                }

                i++;

            }

        }

        // System.debug('totErrors: ' + totErrors);

        updateResponseMapTotalValue('totSuccess', totSuccess, responseMap);

        updateResponseMapTotalValue('totErrors', totErrors, responseMap);

        System.debug('--- processBatchResults() exit');

    }

    private static void updateResponseMapTotalValue(String key, Integer value, Map<String, Object> responseMap) {

        if(responseMap.containsKey(key)) {
            Integer tempTot = (Integer)responseMap.get(key);
            tempTot += value;
            responseMap.put(key, tempTot);
        }
        else {
            responseMap.put(key, value);
        }

    }

    /*
        This method is used to convert the community Id to the web store Id.
    */

    @AuraEnabled
    public static String resolveCommunityIdToWebstoreId(String communityId) {
        if(communityId == null || communityId == '') {
            return null;
        }
        
        String webstoreId = null;

        List<WebStoreNetwork> wsnList = new List<WebStoreNetwork>();

        if(Schema.sObjectType.WebStoreNetwork.fields.WebStoreId.isAccessible()
        && Schema.sObjectType.WebStoreNetwork.fields.NetworkId.isAccessible()) {
            wsnList = [SELECT WebStoreId FROM WebStoreNetwork WHERE NetworkId = :communityId];
        }

        if(wsnList.size() > 0) {
            WebStoreNetwork wsn = wsnList.get(0);
            webstoreId = wsn.WebStoreId;
        }

        return webstoreId;
    }

    public static void addMessage(Message msg, Integer pos, Map<String, Object> responseMap) {

        List<Message> retMessages = null;

        if(responseMap.containsKey('messages')) {
            retMessages = (List<Message>)responseMap.get('messages');
        }
        else {
            retMessages = new List<Message>();
        }

        if(pos == null) {
            retMessages.add(msg);
        }
        else if(retMessages.size() <= 0) {
            retMessages.add(msg);
        }
        else {
            retMessages.add(pos, msg);
        }

        responseMap.put('messages', retMessages);

    }

    public static final String ERROR = 'error';
    public static final String INFO = 'info';
    public static final String SUCCESS = 'success';
    public static final String WARN = 'warn';

    public class Message {

        public String severity {get; set;}
        public String title {get; set;}
        public String message {get; set;}
        public Boolean toast {get; set;}

        public Message() {
            toast = true;
        }

    }

    public class CustomException extends Exception {}

}