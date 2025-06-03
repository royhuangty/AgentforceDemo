({
    loadProductRecommendations : function(cmp,event,helper) {
        try {
            cmp.set("v.loading", true);
            var action = cmp.get("c.getRecommendations");
            var el = document.createElement('a');
            el.href = window.location.href;
            var storeName = el.pathname.split('/')[1];
            console.log('storename = ' + storeName);
            
            action.setParams({
                recommender : cmp.get("v.recommender"),
                anchorValues : cmp.get("v.anchorValues"),
                storeNameValue : storeName,
                cookie: document.cookie
            });
            // Create a callback that is executed after
            // the server-side action returns
            action.setCallback(this, function(response) {
                var state = response.getState();
                if (state === "SUCCESS") {
                    try {
                        let data = JSON.parse(response.getReturnValue());
                        console.log("return value: " + response.getReturnValue());
                        let products = data.productPage.products;
                        // Keep it simple, only show 4 products
                        //cmp.set("v.products", products.slice(0, 4));
                        
                        for (let i = 0; i < products.length; i++){
                            if(products[i].defaultImage.url.indexOf('https')>= 0){
                                products[i].defaultImage.url = products[i].defaultImage.url;
                                
                            }else{
                                products[i].defaultImage.url = `/${storeName}/s/sfsites/c${products[i].defaultImage.url}`;
                            
                            }
                           
                        }
                        cmp.set("v.products", products.slice(0, 4));

                        cmp.set("v.uuid", data.uuid);
                        cmp.set("v.loading", false);
                        let showProducts = products.length > 0;
                        cmp.set("v.showProducts", showProducts);
                        // Only send the viewReco activity when we display the product recommendations
                        if (showProducts) {
                            helper.sendViewRecoActivity(cmp, helper);
                     
    
                        }
                    } catch (err) {
                        console.error('Error fetching recommendations', err);
                        cmp.set("v.loading", false);
                    }
                } else if (state === "ERROR"){
                    var foutmelding = response.getError();
                    console.log("Error State: " + foutmelding[0].message);
                }
            });
            $A.enqueueAction(action);
        } catch (error) {
            console.error('Failed to load recommendations: ', error);
            cmp.set("v.loading", false);
        }
    },
    // The recommender names we pass into the Connect API are in a different format
    // than the recommender names we pass into the activities api.
    recommenderNames: {
        "RecentlyViewed" : "recently-viewed",
        "SimilarProducts" : "similar-products",
        "MostViewedByCategory" : "most-viewed-by-category",
        "TopSelling" : "top-selling",
        "Upsell" : "upsell"
    },

    formatPrice: function(price, curr) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr}).format(price);
    },

    sendViewRecoActivity: function(cmp, helper) {
        let trackViewReco = cmp.find('activitiesApi').trackViewReco;
        let recName = helper.recommenderNames[cmp.get("v.recommender")]
        let products = cmp.get('v.products').map(p => ({id: p.id}));
        let uuid = cmp.get("v.uuid");
        trackViewReco(recName, uuid, products);
    },

    getProductDetailProductId: function() {
        let pageProductIdMatch = window.location.href.match(new RegExp('01t[a-zA-Z0-9]{15}'));
        let pid = pageProductIdMatch ? pageProductIdMatch[0] : null;
        return pid;
    },

    getCategoryDetailCategoryId: function(){
        let categoryIdMatch = window.location.href.match(new RegExp('0ZG[a-zA-Z0-9]{12}'));
        let pid = categoryIdMatch ? categoryIdMatch[0] : null;
        return pid;
    },

    

    
})