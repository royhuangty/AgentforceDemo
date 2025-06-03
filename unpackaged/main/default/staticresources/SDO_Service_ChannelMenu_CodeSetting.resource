window._snapinsSnippetSettingsFile = (function() 
  {
    console.log("Code settings file loaded");
   var userId = $A.get("$SObjectType.CurrentUser.Id");
    var email = $A.get("$SObjectType.CurrentUser.Email");
    
    
// Chat menu-item specific settings
    embedded_svc.menu.snippetSettingsFile = {
        Chat: {
            settings: {
                avatarImgURL: '/consumer/resource/SDO_Service_snapinsAssets/snapinsAgentAvatar_40x40px.png',
                smallCompanyLogoImgURL: '/consumer/resource/SDO_Service_snapinsAssets/snapinsMinimizedLogo_30x30px.png',
                waitingStateBackgroundImgURL: '/consumer/resource/SDO_Service_snapinsAssets/snapinsWaitingState_200x60px.png',
                headerBackgroundURL: '/consumer/resource/SDO_Service_snapinsAssets/snapinsHeaderBackgroundImage_320x225px.png',
                chatbotAvatarImgURL: '/consumer/resource/SDO_Service_snapinsAssets/snapinsBotAvatar_40x40px.png',
                prepopulatedPrechatFields: {"Email":email},
                extraPrechatFormDetails: [                                 
                    {"label":"ChatEndUserId__c","value":userId,"displayToAgent":true,"transcriptFields": ["ChatEndUserId__c"]},
                    {"label":"StartURL","value":window.location.href,"transcriptFields":[ "ChatStartURL__c" ],"displayToAgent":true}
                  ]
            }
        }
    };
 
}
                                     )();