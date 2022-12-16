
import got from 'got';

let beocontent = {}

// Proxy B&O NetRadio to Loxone Internet Radio 
beocontent.netradio = {}

beocontent.netradio.getpresets = async (url) => {

    let [, , , service, user, requestId, start, length] = url.split('/');

    // Get TuneIn presets from First BeoZone
    var source = zone[14].beolink.ip;
    var url = `http://${source}:8080/BeoContent/radio/netRadioProfile/favoriteList/id%3df1/favoriteListStation`;

    try {
        var response = JSON.parse((await got(url)).body);
    }
    catch (error) {
        logger.info(`[BeoContent] Error on HTTP request`)
        return
    }

    let netradioPresets = {

        id: requestId,
        totalitems: response.favoriteListStationList.total,
        start: +start,
        name: "Presets",
        items: []
    }

    for (var key in response.favoriteListStationList.favoriteListStation) {
        netradioPresets.items[key] = {}
        netradioPresets.items[key].audiopath = response.favoriteListStationList.favoriteListStation[key]['station'].id
        netradioPresets.items[key].contentType = "Playlists"
        netradioPresets.items[key].coverurl = response.favoriteListStationList.favoriteListStation[key]['station']['image'][0].url
        netradioPresets.items[key].id = response.favoriteListStationList.favoriteListStation[key]['station'].id
        netradioPresets.items[key].name = response.favoriteListStationList.favoriteListStation[key]['station'].name
        netradioPresets.items[key].sort = ""
        netradioPresets.items[key].station = response.favoriteListStationList.favoriteListStation[key]['station'].liveDescription
        netradioPresets.items[key].type = 2
    }

    return netradioPresets;

}

export default beocontent;
