ArcGIS.tokenHelpers = {
	accessTokens: {},
    generateAccessToken: function(url) {
        var dfd = jQuery.Deferred();
        var requestURL = url + '?f=json';
        var requestData = {
            ajaxResource: 'ArcGISAPI',
            securityToken: MASystem.MergeFields.Security_Token,
            action: 'get',
            requestURL: requestURL
        };
        ArcGIS.ajaxRequest(requestData).then(function(response) {
            if (response.success) {
                var responseData = response.data;
                if (responseData.error && responseData.error.code == 499) {
                    // Token required
                    var requestData = {
                        ajaxResource: 'ArcGISAPI',
                        securityToken: MASystem.MergeFields.Security_Token,
                        action: 'get',
                        requestURL: ArcGIS.tokenHelpers.extractServiceURL(url) + '/rest/info?f=json'
                    };
                    ArcGIS.ajaxRequest(requestData).then(function(response) {
                        if (response.success) {
                            // Token service available
                            var responseData = response.data;
                            if (responseData.authInfo.isTokenBasedSecurity) {
                                var tokenServicesURL = removeTrailingSlashesFromURL(responseData.authInfo.tokenServicesUrl);
                                var hostURL = extractHostURL(url);
                                MA.Popup.showMAPopup({
                                    template: $('#templates .arcgis-server-login').clone(),
                                    popupId: 'arcGISServerLogin',
                                    width: 400,
                                    title: 'Request for Permission: \n' + hostURL,
                                    buttons: [{
										text: 'Cancel',
										type: 'slds-button_neutral',
										onTap: function(e) {
											dfd.resolve({
												success: false,
												error: requestData.requestURL + ' canceled by user'
											})
										}
									}, {
                                        text: 'Unsecured',
                                        type: 'slds-button_neutral',
                                        onTap: function(e) {
                                            // Some servers don't require a login and the client may not even have login credentials.
                                            // unsecured server
                                            dfd.resolve({
                                                success: true,
                                                accessToken: ''
                                            });
                                        }
                                    }, {
                                        text: 'Login',
                                        type: 'slds-button_brand step1',
                                        onTap: function(e) {
                                            var requestData = {
                                                ajaxResource: 'ArcGISAPI',
                                                securityToken: MASystem.MergeFields.Security_Token,
                                                action: 'generateToken',
                                                tokenServicesURL: tokenServicesURL,
                                                username: $('#arcGISServerLogin .arc-server-username').val(),
                                                password: $('#arcGISServerLogin .arc-server-password').val()
                                                // client: 'referer',
                                                // expiration: '1440',
                                                // format: 'pjson',
                                                // referer: url
                                            };
                                            ArcGIS.ajaxRequest(requestData).then(function(response) {
                                                if (response.success) {
                                                    dfd.resolve({
                                                        success: true,
                                                        accessToken: response.token
                                                    });
                                                }
                                                else {
                                                    dfd.resolve({
                                                        success: false,
                                                        error: 'login failed'
                                                    });
                                                }
                                            });
                                        }
                                    }]
                                });
                            }
                            else {
                                // unsecured server?
                                dfd.resolve({
                                    success: true,
                                    accessToken: ''
                                });
                            }
                        }
                        else {
                            dfd.resolve({
                                success: false,
                                error: response.error || MASystem.Labels.Common_Refresh_And_Try_Again
                            });
                        }
                    });
                }
                else {
                    // public layers
                    dfd.resolve({
                        success: true,
                        accessToken: null
                    });
                }
            }
            else {
                dfd.resolve({
                    success: false,
                    error: response.error || MASystem.Labels.Common_Refresh_And_Try_Again
                });
            }
        });
        return dfd.promise();
    },
    getAccessTokenKey: function(url) {
		url = ArcGIS.secureURL(url);
        var hostURL = extractHostURL(url);
        return hostURL.toLowerCase().endsWith('.arcgis.com') ? hostURL : ArcGIS.tokenHelpers.extractServiceURL(url);
    },
    hasAccessToken: function(url) {
        var key = ArcGIS.tokenHelpers.getAccessTokenKey(url);
        // undefined: server never tried, '': server already tried and known unsecured
        return ArcGIS.tokenHelpers.accessTokens[key] != undefined;
    },
    setAccessToken: function(url, accessToken) {
        // check if the accessToken is json or string... if json, try to find the token
        // var formattedAccessToken = accessToken;
        // var jsonToken = accessToken;
        // try {
        //     jsonToken = JSON.parse(accessToken);
        // } catch (err) {
        //     // the access token is likely a string and is good in current format
        // }
        // if (typeof jsonToken === 'object') {
        //     var possibleTokenKeys = ['token']; // add more options if token is not standard
        //     // this may not be needed, but trying to plan ahead
        //     for (var i = 0; i < possibleTokenKeys.length; i++) {
        //         var key = possibleTokenKeys[i];
        //         if (jsonToken.hasOwnProperty(key)) {
        //             formattedAccessToken = jsonToken[key];
        //             break;
        //         }
        //     }
        // }
        var key = ArcGIS.tokenHelpers.getAccessTokenKey(url);
        ArcGIS.tokenHelpers.accessTokens[key] = accessToken;
    },
    getAccessToken: function(url) {
        var key = ArcGIS.tokenHelpers.getAccessTokenKey(url);
        // Return an empty token to construct a valid request URL if no token is found for URL.
        // Use hasAccessToken() to determine if token is undefined (server never tried yet) or empty (unsecured server).
        var accessToken = ArcGIS.tokenHelpers.accessTokens[key] != undefined ? ArcGIS.tokenHelpers.accessTokens[key] : '';
        return accessToken;
    },
	createAccessTokenParameter: function(url, first, next) {
		//  token && first ==  1 && next ==  1: ?token=...&
		//  token && first ==  1 && next ==  0: ?token=...
		//  token && first ==  1 && next == -1: ?token=...&
		//  token && first ==  0 && next ==  1: &token=...&
		//  token && first ==  0 && next ==  0: &token=...
		//  token && first ==  0 && next == -1: &token=...&
		//  token && first == -1 && next ==  1:  token=...&
		//  token && first == -1 && next ==  0:  token=...
		//  token && first == -1 && next == -1:  token=...&
		// !token && first ==  1 && next ==  1: ?
		// !token && first ==  1 && next ==  0:
		// !token && first ==  1 && next == -1:
		// !token && first ==  0 && next ==  1: &
		// !token && first ==  0 && next ==  0:
		// !token && first ==  0 && next == -1:
		// !token && first == -1 && next ==  1: &
		// !token && first == -1 && next ==  0:
		// !token && first == -1 && next == -1:

		// ArcGIS REST server responds with {error: {code: 498, message: "Invalid Token", details: []}} when an empty token is passed for public layers.
		// We shouldn't pass any token parameter in this case.
		var accessToken = ArcGIS.tokenHelpers.getAccessToken(url);
		var tokenParameter = accessToken ? (first > 0 ? '?' : (first == 0 ? '&' : '')) + 'token=' + accessToken + (next ? '&' : '') : (first > 0 ? (next > 0 ? '?' : '') : (next > 0 ? '&' : ''));
		return tokenParameter;
	},
    extractServiceURL: function(url) {
        // https://host.example.com/arcgis/rest/... => https://host.example.com/arcgis
        // https://host.example.com/arcgis/tokens/... => https://host.example.com/arcgis
        return url.replace(/^((?:https?:\/\/)?.+?)\/(?:rest|tokens)\/.*$/, '$1');
    }
};
