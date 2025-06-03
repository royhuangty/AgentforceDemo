
document.addEventListener("DOMContentLoaded",function()
{
    mapboxgl.accessToken = '' || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA'
    MA.map = new mapboxgl.Map({
        container: 'mapdiv', // container id
        style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
        center: [-83.40, 33.433], // starting position [lng, lat]
        zoom: 9 // starting zoom
    });

    getCustomTiles().then((mapTiles) => {
        const tileHTML = buildMapTiles(mapTiles);
        document.querySelector('#sidebar-content .tileInfo').innerHTML = tileHTML;
    }).catch((err) => {
        console.warn(err);
    });
});

// load custom tiles
function getCustomTiles() {
    return new Promise((resolve, reject) => {
        var requestData = {
            ajaxResource: 'UserAJAXResources',
            action: 'get_user_prefs',
            id: MASystem.User.Id
        };
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequestReadOnly,
            requestData,
            (response, event) => {
                if (event.status) {
                    const { success = false, mapTiles = [] } = response;
                    if (success) {
                        console.log(mapTiles);
                        resolve(mapTiles);
                    } else
                    {
                        var errMsg = response != undefined ? (response.message || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin) : MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                        reject(new Error(rrMsg));
                    }
                } else {
                    reject(new Error(event.message));
                }
            }, { buffer: false, escape: false }
        );
    });
}

function buildMapTiles(tiles) {
    let sampleHTML = '';
    for(var i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const options = tile.maps__Options__c;
        try {
            const parsedOptions = JSON.parse(options);
            sampleHTML += `<span class="slds-radio" title="${parsedOptions.url}">
                <input onchange="changeTile('${tile.Id}','${parsedOptions.url}')" type="radio" id="radio-${i}" data-type="raster" name="mapTiles" value="${parsedOptions.url}" />
                <label class="slds-radio__label" for="radio-${i}">
                    <span class="slds-radio_faux"></span>
                    <span class="slds-form-element__label">${tile.Name}</span>
                </label>
            </span>`;
        } catch (e) {
            console.warn('unable to get tile options');
        }
    }
    return sampleHTML;
}
function changeTile(tileId, url) {
    if (!MA.map.getSource(`tile_${tileId}`)) {
        console.log('load');
        const newURL = url.replace(/{zoom}/g,'{z}').replace(/{latitude}/g,'{x}').replace(/{longitude}/g,'{y}').replace(/https/g, 'http');
        MA.map.addSource(`tile_${tileId}`, {
            "type": "raster",
            "tiles": [newURL],
            "tileSize": 256
        });
    }
    removeTile();

    // add the layer
    MA.map.addLayer({
        'id': 'customTile',
        'type': 'raster',
        'source': `tile_${tileId}`
    });
}

function removeTile(clear) {
    // remove previous tile layers
    if (MA.map.getLayer('customTile')) {
        MA.map.removeLayer('customTile');
    }
    if (clear) {
        document.querySelectorAll('input[name="mapTiles"]').forEach((el) => {
            el.checked = false
        });
    }
}