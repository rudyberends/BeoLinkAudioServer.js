import http from 'http';
import websocket from 'websocket';
import querystring from 'querystring';
import * as fs from 'fs';
import NodeRSA from 'node-rsa';
import beozone from '../beolink/beozone.js';
import beoremote from '../beolink/beoremote.js'

const rsaKey = new NodeRSA({b: 2048});
rsaKey.setOptions({encryptionScheme: 'pkcs1'});

const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": "true"
  };

let wsConnections = new Set();

const audioserver = {}

audioserver.start = async () => {

    logger.info(`[${config.audioserver.name}] Starting AudioServer`)
    
    appHTTP() // Http Webserver with WebSocket extension for Loxone APP on PORT 7091
    msHTTP() // Webserver and WebSocket for Miniserver (New AudioServer Protocol)
}

audioserver.pushAudioEvents = async (zone) => {

    const audioEventsMessage = JSON.stringify({
        audio_event: [zone.track],
    });
    
    wsConnections.forEach((connection) => {
        connection.send(audioEventsMessage);
    });
}

// Http Webserver with WebSocket extension for Loxone APP on PORT 7091
async function appHTTP() {

    const appHTTP = http.createServer(async (req, res) => {

        config.audioserver.webserver = req.headers.host
        
        // Static files for Album ART
        const params = req.url.split('/');

        if (params[1] === 'static') {
        
            let type = 'text/html'

            switch (params[2]) {
                case 'icons':
                    type = 'image/svg'
                    break
                case 'img':
                    type = 'image/jpeg'
                    break
            }
       
            logger.info(`[AudioServer][HTTP] Album ART Request: ${req.url}`)

            fs.readFile(`.${req.url}`, (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404: File not found');
                } 
                else {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.writeHead(200, { 'Content-Type': type });
                    res.end(data);
                }
            });
            return;
        }

        logger.info(`[${config.audioserver.name}][appHTTP] Loxone API Request: ${req.url}`)

        try {
            res.writeHead(200, headers);
            res.end(await handleMessage(req.url));
        }
        catch (err) {
            res.writeHead(500, headers);
            res.end(err.stack);
        }
    });

    const appWsServer = new websocket.server({
        httpServer: appHTTP,
        autoAcceptConnections: true,
    });

    appWsServer.on('connect', (connection) => {
        wsConnections.add(connection);

        connection.on('message', async (message) => {
            logger.info(`[${config.audioserver.name}][appHTTP][WebSocket] Loxone Request: ${message.utf8Data}`)

            if (message.type !== 'utf8') {
                throw new Error('Unknown message type: ' + message.type);
            }

            connection.sendUTF(await handleMessage(message.utf8Data));
        });

        connection.on('close', () => {
            wsConnections.delete(connection);
        });

        connection.send('LWSS V 2.3.9.2 | ~API:1.6~');
    });

    appHTTP.listen(7091);
}

// Webserver and WebSocket for Miniserver (New AudioServer Protocol)
async function msHTTP() {

    const msHTTP = http.createServer(async (req, res) => {
    });

    const msWsServer = new websocket.server({
        httpServer: msHTTP,
        autoAcceptConnections: true,
    });

    msWsServer.on('connect', (connection) => {
        wsConnections.add(connection);

        connection.on('message', async (message) => {
            logger.info(`[${config.audioserver.name}][msHTTP][WebSocket] Loxone Request: ${message.utf8Data}`)

            if (message.type !== 'utf8') {
                throw new Error('Unknown message type: ' + message.type);
            }

            connection.sendUTF(await handleMessage(message.utf8Data));
        });

        connection.on('close', () => {
            wsConnections.delete(connection);
        });

        connection.send("MINISERVER V 'LWSS V 2.3.9.2 " + config.audioserver.macID + " | ~API:1.6~ | Session-Token: 8WahwAfULwEQce9Yu0qIE9L7QMkXFHbi0M9ch9vKcgYArPPojXHpSiNcq0fT3lqL");
    });

    msHTTP.listen(7095);
}

async function handleMessage(method) {

    if (method.startsWith('/'))
        method = method.slice(1);
    const index = method.indexOf('?');
    const url = index === -1 ? method : method.substr(0, index);
    const query = querystring.parse(method.substr(url.length + 1));

    switch (true) {
        /*
        case /(?:^|\/)poweroff(?:\/|$)/.test(url):
            return powerOff(url);

        case /(?:^|\/)audio\/cfg\/all(?:\/|$)/.test(url):
            return audioCfgAll(url);

        case /(?:^|\/)audio\/cfg\/equalizer\//.test(url):
            return audioCfgEqualizer(url);

        case /(?:^|\/)audio\/cfg\/geteq\//.test(url):
            return audioCfgGetEq(url);

        case /(?:^|\/)audio\/cfg\/seteq/.test(url):
            return audioCfgSetEq(url);

        case /(?:^|\/)audio\/cfg\/favorites\/addpath\//.test(url):
            return audioCfgFavoritesAddPath(url);

        case /(?:^|\/)audio\/cfg\/favorites\/delete\//.test(url):
            return audioCfgFavoritesDelete(url);

        case /(?:^|\/)audio\/cfg\/getfavorites\//.test(url):
            return audioCfgGetFavorites(url);

        */
        case /(?:^|\/)audio\/cfg\/getinputs(?:\/|$)/.test(url):
            return audioCfgGetInputs(url);

        case /(?:^|\/)audio\/cfg\/getkey(?:\/|$)/.test(url):
            return audioCfgGetKey(url);
        
        case /(?:^|\/)audio\/cfg\/getmediafolder(?:\/|$)/.test(url):
            return audioCfgGetMediaFolder(url, []);

        case /(?:^|\/)audio\/cfg\/get(?:paired)?master(?:\/|$)/.test(url):
            return audioCfgGetMaster(url);

        case /(?:^|\/)audio\/cfg\/getplayersdetails(?:\/|$)/.test(url):
            return audioCfgGetPlayersDetails(url);

        case /(?:^|\/)audio\/cfg\/getplaylists2\/lms(?:\/|$)/.test(url):
            return audioCfgGetPlaylists(url);

        case /(?:^|\/)audio\/cfg\/getradios(?:\/|$)/.test(url):
            return audioCfgGetRadios(url);

        case /(?:^|\/)audio\/cfg\/getroomfavs\//.test(url):
            return audioCfgGetRoomFavs(url);

        case /(?:^|\/)audio\/cfg\/get(?:available)?services(?:\/|$)/.test(url):
            return audioCfgGetServices(url);

        case /(?:^|\/)audio\/cfg\/getservicefolder(?:\/|$)/.test(url):
            return audioCfgGetServiceFolder(url);

        case /(?:^|\/)audio\/cfg\/getsyncedplayers(?:\/|$)/.test(url):
            return audioCfgGetSyncedPlayers(url);
/*
        case /(?:^|\/)audio\/cfg\/globalsearch\/describe(?:\/|$)/.test(url):
            return audioCfgGlobalSearchDescribe(url);

        case /(?:^|\/)audio\/cfg\/globalsearch\//.test(url):
            return audioCfgGlobalSearch(url);

        case /(?:^|\/)audio\/cfg\/search\//.test(url):
            return audioCfgSearch(url);

        case /(?:^|\/)audio\/cfg\/iamaminiserver(?:done)?\//.test(url):
            return audioCfgIAmAMiniserver(url);

        case /(?:^|\/)audio\/cfg\/miniserverport\//.test(url):
            return audioCfgMiniserverPort(url);

        case /(?:^|\/)audio\/cfg\/input\/[^\/]+\/rename\//.test(url):
            return audioCfgInputRename(url);

        case /(?:^|\/)audio\/cfg\/input\/[^\/]+\/type\//.test(url):
            return audioCfgInputType(url);

        case /(?:^|\/)audio\/cfg\/mac(?:\/|$)/.test(url):
            return audioCfgMac(url);

        case /(?:^|\/)audio\/cfg\/playlist\/create(?:\/|$)/.test(url):
            return audioCfgPlaylistCreate(url);

        case /(?:^|\/)audio\/cfg\/playlist\/update(?:\/|$)/.test(url):
            return audioCfgPlaylistUpdate(url);

        case /(?:^|\/)audio\/cfg\/playlist\/deletelist\//.test(url):
            return audioCfgPlaylistDeleteList(url);
*/
        case /(?:^|\/)audio\/cfg\/scanstatus(?:\/|$)/.test(url):
            return audioCfgScanStatus(url);
/*
        case /(?:^|\/)audio\/cfg\/rescan(?:\/|$)/.test(url):
            return audioCfgRescan(url);

        case /(?:^|\/)audio\/cfg\/storage\/add(?:\/|$)/.test(url):
            return audioCfgStorageAdd(url);

        case /(?:^|\/)audio\/cfg\/upload(?:\/|$)/.test(url):
            return audioUpload(url, data);

        case /(?:^|\/)audio\/grouped\/playuploadedfile(?:\/|$)/.test(url):
            return playUploadedFile(url);

        case /(?:^|\/)audio\/cfg\/defaultvolume(?:\/|$)/.test(url):
            return audioCfgDefaultVolume(url);

        case /(?:^|\/)audio\/cfg\/maxvolume(?:\/|$)/.test(url):
            return audioCfgMaxVolume(url);

        case /(?:^|\/)audio\/cfg\/eventvolumes(?:\/|$)/.test(url):
            return audioCfgEventVolumes(url);

        case /(?:^|\/)audio\/cfg\/audiodelay(?:\/|$)/.test(url):
            return audioCfgAudioDelay(url);

        case /(?:^|\/)audio\/\d+\/(?:(fire)?alarm|bell|wecker)(?:\/|$)/.test(url):
            return audioAlarm(url);

        case /(?:^|\/)audio\/\d+\/favoriteplay(?:\/|$)/.test(url):
            return audioFavoritePlay(url, []);
*/
        case /(?:^|\/)audio\/\d+\/getqueue(?:\/|$)/.test(url):
            return audioGetQueue(url, []);
/*
        case /(?:^|\/)audio\/\d+\/identifysource(?:\/|$)/.test(url):
            return audioIdentifySource(url);

        case /(?:^|\/)audio\/\d+\/library\/play(?:\/|$)/.test(url):
            return audioLibraryPlay(url);

        case /(?:^|\/)audio\/\d+\/linein/.test(url):
            return audioLineIn(url);

        case /(?:^|\/)audio\/\d+\/off/.test(url):
            return audioOff(url);

        case /(?:^|\/)audio\/\d+\/on/.test(url):
            return audioOn(url);

        case /(?:^|\/)audio\/\d+\/sleep\/\d+(?:\/|$)/.test(url):
            return audioSleep(url);

        case /(?:^|\/)audio\/\d+\/pause(?:\/|$)/.test(url):
            return audioPause(url);

        case /(?:^|\/)audio\/\d+\/stop(?:\/|$)/.test(url):
            return audioStop(url);

        case /(?:^|\/)audio\/\d+\/(?:play|resume)(?:\/|$)/.test(url):
            return audioPlay(url);

        case /(?:^|\/)audio\/\d+\/playurl\//.test(url):
            return audioPlayUrl(url);

        case /(?:^|\/)audio\/\d+\/addurl\//.test(url):
            return audioAddUrl(url);

        case /(?:^|\/)audio\/\d+\/inserturl\//.test(url):
            return audioInsertUrl(url);

        case /(?:^|\/)audio\/\d+\/playlist\//.test(url):
            return audioPlaylist(url);

        case /(?:^|\/)audio\/\d+\/position\/\d+(?:\/|$)/.test(url):
            return audioPosition(url);

        case /(?:^|\/)audio\/\d+\/queueminus(?:\/|$)/.test(url):
            return audioQueueMinus(url);

        case /(?:^|\/)audio\/\d+\/queueplus(?:\/|$)/.test(url):
            return audioQueuePlus(url);

        case /(?:^|\/)audio\/\d+\/queue\/\d+(\/|$)/.test(url):
            return audioQueueIndex(url);

        case /(?:^|\/)audio\/\d+\/queue\/play\/\d+(\/|$)/.test(url):
            return audioQueuePlay(url);

        case /(?:^|\/)audio\/\d+\/queueremove\/\d+(\/|$)/.test(url):
            return audioQueueDelete(url);

        case /(?:^|\/)audio\/\d+\/queue\/remove\/\d+(\/|$)/.test(url):
            return audioQueueRemove(url);

        case /(?:^|\/)audio\/\d+\/queue\/clear(\/|$)/.test(url):
            return audioQueueClear(url);

        case /(?:^|\/)audio\/\d+\/queuemove\/\d+\/\d+(\/|$)/.test(url):
            return audioQueueMove(url);

        case /(?:^|\/)audio\/\d+\/queue\/move\/\d+\/before\/\d+(\/|$)/.test(url):
        case /(?:^|\/)audio\/\d+\/queue\/move\/\d+\/end/.test(url):
            return audioQueueMoveBefore(url);

        case /(?:^|\/)audio\/\d+\/queueadd(\/|$)/.test(url):
            return audioQueueAdd(url);

        case /(?:^|\/)audio\/\d+\/queueinsert(\/|$)/.test(url):
            return audioQueueInsert(url);

        case /(?:^|\/)audio\/\d+\/repeat\/\d+(?:\/|$)/.test(url):
            return audioRepeat(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/delete\/\d+(\/|$)/.test(url):
            return audioRoomFavDelete(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/play\/\d+(?:\/|$)/.test(url):
            return audioRoomFavPlay(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/play/.test(url):
            return audioRoomFavPlayId(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/plus(?:\/|$)/.test(url):
            return audioRoomFavPlus(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/savepath\/\d+\//.test(url):
        case /(?:^|\/)audio\/\d+\/roomfav\/saveid\/\d+\//.test(url):
            return audioRoomFavSavePath(url);

        case /(?:^|\/)audio\/\d+\/roomfav\/saveexternalid\/\d+\//.test(url):
            return audioRoomFavSaveExternalId(url);

        case /(?:^|\/)audio\/cfg\/roomfavs\/\d+\/copy\/\d+/.test(url):
            return audioRoomFavsCopy(url);

        case /(?:^|\/)audio\/cfg\/roomfavs\/\d+\/reorder/.test(url):
            return audioRoomFavsReorder(url);

        case /(?:^|\/)audio\/cfg\/roomfavs\/\d+\/delete/.test(url):
            return audioRoomFavsDelete(url);

        case /(?:^|\/)audio\/cfg\/roomfavs\/\d+\/setplus/.test(url):
            return audioRoomFavsSetPlus(url);

        case /(?:^|\/)audio\/cfg\/roomfavs\/\d+\//.test(url):
            return audioRoomFavsAdd(url);

        case /(?:^|\/)audio\/\d+\/serviceplay\//.test(url):
            return audioServicePlay(url);

        case /(?:^|\/)audio\/\d+\/serviceplayinsert\//.test(url):
            return audioServicePlayInsert(url);

        case /(?:^|\/)audio\/\d+\/serviceplayadd\//.test(url):
            return audioServicePlayAdd(url);

        case /(?:^|\/)audio\/\d+\/shuffle/.test(url):
            return audioShuffle(url);

        case /(?:^|\/)audio\/\d+\/sync\/\d+(?:\/|$)/.test(url):
            return audioSync(url);

        case /(?:^|\/)audio\/\d+\/unsync(?:\/|$)/.test(url):
            return audioUnSync(url);

        case /(?:^|\/)audio\/cfg\/unsyncmulti(?:\/|$)/.test(url):
            return audioUnSyncMulti(url);

        case /(?:^|\/)audio\/\d+\/volume\/[+-]?\d+(?:\/|$)/.test(url):
            return audioVolume(url);

        case /(?:^|\/)audio\/\d+\/tts\/[^\/]+\/\d+(?:\/|$)/.test(url):
            return audioTTS(url);

        // Audioserver support
        */
        case /(?:^|\/)audio\/cfg\/ready/.test(url):
            return audioCfgReady(url);
        
        case /(?:^|\/)audio\/\d+\/status/.test(url):
            return audioGetStatus(url);
        
        case /(?:^|\/)audio\/cfg\/getconfig/.test(url):
            return audioCfgGetConfig(url);
        
        case /(?:^|\/)audio\/cfg\/setconfig/.test(url):
            return audioCfgSetConfig(url);

        case /(?:^|\/)audio\/cfg\/miniservertime/.test(url):
            return audioCfgMiniservertime(url);

        case /(?:^|\/)audio\/cfg\/speakertype/.test(url):
            return audioCfgSpeakerType(url);

        case /(?:^|\/)audio\/cfg\/volumes/.test(url):
            return audioCfgVolumes(url);

        case /(?:^|\/)audio\/cfg\/playername/.test(url):
            return audioCfgPlayername(url);

        case /(?:^|\/)secure\/hello/.test(url):
            return secureHello(url);

        case /(?:^|\/)secure\/init/.test(url):
            return secureInit(url);

        case /(?:^|\/)secure\/pair/.test(url):
            return securePair(url);

        case /(?:^|\/)secure\/info\/pairing/.test(url):
            return secureInfoPairing(url);

        case /(?:^|\/)secure\/authenticate/.test(url):
            return secureAuthenticate(url);

        case /(?:^|\/)audio\/\d+\/on|off|play|resume|pause|queueminus|queueplus|volume|test\/\[+-]?(?:\/|$)/.test(url):
            await beoremote.action(url);

        default:
            return unknownCommand(url);
    }
}

function secureHello(url) {
    const [, , id, pub_key] = url.split('/');
    return '{"command":"secure/hello","error":0,"public_key":"' + pub_key + '"}'
}

function secureInit(url) {
    const [, , jwt] = url.split('/');
    return '{"command":"secure/init","error":0,"jwt":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJleHAiOiAxNjQwNjEwMTQ0LAogICJpYXQiOiAxNjQwNjEwMDg0LAogICJzZXNzaW9uX3Rva2VuIjogIjhXYWh3QWZVTHdFUWNlOVl1MHFJRTlMN1FNa1hGSGJpME05Y2g5dktjZ1lBclBQb2pYSHBTaU5jcTBmVDNscUwiLAogICJzdWIiOiAic2VjdXJlLXNlc3Npb24taW5pdC1zdWNjZXNzIgp9.Zd5M55YPirdugqlGr7u6iB-kM_oFqnvMnpxL8gj58vF2L4ocpSY6S8OB_4f8LeIB2AIYikN5U6R0UALJ3Oahxa0gq9qKDoNrjC7-Q8wAe1rEhDbvdWtaRzmgiHnivrz0cNsyeYGBX8c5Ix6pLI8URGjR1Ox2lbxBt_pVZ-MyEvhVNSJ0-DttclqIAgr_24tVmwe6lleT5eKyBoQVAcGJP-3LSdORKckHTCRw6aaf6sOQ7AtK37SXgnHB6J4g2wErvyw29mMAmDTbR8vZUCmTxgnmhbrks02AZITLaDeGAYTlSASWDSl84L9wkWOWk0pufZIGG0zcXgL8EoWD8cw_fIhbh-LXODEY5251u0DlVtaI_6J6o2j8jy_WvsSqKh-sqqy-ygScwPkLgFua7GNlppaHUGsFaEg0rVdLvVAiIV3mbOGnis1RuWcTWY9iuPVxFTODxkOZNRgZttBb_NFa8lQPJKwwhA33YC1hJ6DE3xEC2rvc4LGE400nLKnELNKpFNsom07JFSQQq8NV3Z1lzTksa8ANdXrV080J8x0c1Bt4dcUyx3lzFE8XG3DsLXCnL2YsJ9ik2jdSBZL8grnoQjqvJWaX3j47P0VM-jaMICVb6QcVP-nNB7k5n1qQGASsbkhcB1nffzE_wLooUe4iLxJQ2dkCM1n7ngXDF6HK0_A"}'
}

function securePair(url) {
    return emptyCommand(url, []);
}

function secureInfoPairing(url) {
    return '{"command":"secure/info/pairing","error":-84,"master":"' + config.miniserver.mac + '","peers":[]}'
}

function secureAuthenticate(url) {
    return emptyCommand(url, "authentication successful");
}

function audioCfgReady(url) {
    return emptyCommand(url, { "session": 547541322864 });
}

function audioCfgGetKey(url) {
    const data = [{pubkey: rsaKey.keyPair.n.toString(16), exp: rsaKey.keyPair.e }];
    return emptyCommand(url, data);
  }

async function audioCfgGetConfig(url) {
    return emptyCommand(url, {"crc32":config.miniserver.musicCRC,"extensions":[]});
}

async function audioCfgSetConfig(url) {
    logger.error(`[${config.audioserver.name}][msHTTP][WebSocket] MiniServer UpdateConfig Request`)
    beozone.init();
    return emptyCommand(url, []);
}

async function audioCfgMiniservertime(url) {
    return emptyCommand(url, true);
}

function audioCfgSpeakerType(url) {
    return emptyCommand(url, []);
}

async function audioCfgGetInputs(url) {
    return emptyCommand(url, []);
}

async function audioCfgGetServices(url) {
    return emptyCommand(url, []);
}

async function audioCfgScanStatus(url) {
    return emptyCommand(url, [{scanning: 0}]);
}

function audioCfgPlayerOpts(url) {
    return emptyCommand(url, []);
}

function audioCfgVolumes(url) {
    return emptyCommand(url, []);
}

function audioCfgPlayername(url) {
    return emptyCommand(url, []);
}

function audioGetStatus(url) {
    const [, zoneId] = url.split('/');
    audioserver.pushAudioEvents(zone[zoneId])
    // Send empty response. BeoNotify will push the right values
    return response(url, 'status', [])
}

async function audioGetQueue(url) {
    const [, zoneId, , start, length] = url.split('/');
    const zone = this._zones[zoneId];
  

    /*
    if (+zoneId > 0) {
      let {total, items} = await zone.getQueueList().get(undefined, +start, +length);

      if (total === 0) {
        items = +start === 0 ? [zone.getTrack()] : [];
        total = 1;
      }

      return this._response(url, 'getqueue', [
        {
          id: +zoneId,
          totalitems: total,
          start: +start,
          items: items.map(this._convert(2, 0, +start)),
        },
      ]);
    }
*/
/*
{
    "getqueue_result": [
        {
            "id": 1,
            "items": [
                {
                    "album": "",
                    "artist": "",
                    "audiopath": "linein:504F94F042A3#1000001",
                    "audiotype": 3,
                    "coverurl": "http://10.7.10.151:7091/imgcache/?item=linein&icontype=8&enabled=1&viaproxy=170ab4fc-0261-9bac-ffffc581ef707fce",
                    "duration": 0,
                    "icontype": 8,
                    "qindex": 0,
                    "station": "",
                    "title": "SatRadio",
                    "unique_id": "linein:504F94F042A3#1000001",
                    "user": ""
                }
            ],
            "shuffle": false,
            "start": 0,
            "totalitems": 1
        }
    ],
    "command": "audio/1/getqueue/0/50"
}
    */

    //return response(url, 'getqueue', []);
    return response(url, 'getqueue', [   {
        "id": 1,
        "items": [
            {
                "album": "",
                "artist": "",
                "audiopath": "linein:504F94F042A3#1000001",
                "audiotype": 3,
                "coverurl": "http://10.7.10.151:7091/imgcache/?item=linein&icontype=8&enabled=1&viaproxy=170ab4fc-0261-9bac-ffffc581ef707fce",
                "duration": 0,
                "icontype": 8,
                "qindex": 0,
                "station": "",
                "title": "SatRadio",
                "unique_id": "linein:504F94F042A3#1000001",
                "user": ""
            }
        ],
        "shuffle": false,
        "start": 0,
        "totalitems": 1
    }]);
}

function audioCfgGetRoomFavs(url) {

    const [, , , zoneId] = url.split('/');

    return response(url, 'getroomfavs', [

        {
            "id": parseInt(zoneId),
            "totalitems": 3,
            "start": 0,
            "items": [
                {
                    "type": "tunein",
                    "slot": 1,
                    "audiopath": "s6717",
                    "coverurl": "http://192.168.1.222:7092/http://192.168.1.222:9000/imageproxy/http://cdn-profiles.tunein.com/s6717/images/logoq.jpg/image.jpg",
                    "id": "s6717",
                    "name": "Veronica",
                    "title": "Radio Veronica 91.6 (Classic Hits)",
                    "artist": "",
                    "album": "",
                    "station": "",
                    "contentType": "ZoneFavorites",
                    "mediaType": "favorites"
                },
                {
                    "type": "local",
                    "slot": 2,
                    "audiopath": "WyJ1cmw6ZmlsZSUzQSUyRiUyRiUyRnRtcCUyRkJlb3NvdW5kJTI1MjBHcm9lbi5tM3UiLDEwMDAwMDJd",
                    "id": "WyJ1cmw6ZmlsZSUzQSUyRiUyRiUyRnRtcCUyRkJlb3NvdW5kJTI1MjBHcm9lbi5tM3UiLDEwMDAwMDJd",
                    "coverurl": "http://192.168.1.35:7091/img/groen.png",
                    "name": "Beosound Groen",
                    "title": "Apple Music",
                    "artist": "",
                    "album": "",
                    "station": "",
                    "contentType": "ZoneFavorites",
                    "mediaType": "favorites"
                },
                {
                    "type": "local",
                    "slot": 3,
                    "audiopath": "WyJ1cmw6ZmlsZSUzQSUyRiUyRiUyRnRtcCUyRkJlb3NvdW5kJTI1MjBHcm9lbi5tM3UiLDEwMDAwMDJd",
                    "id": "WyJ1cmw6ZmlsZSUzQSUyRiUyRiUyRnRtcCUyRkJlb3NvdW5kJTI1MjBHcm9lbi5tM3UiLDEwMDAwMDJd",
                    "coverurl": "http://192.168.1.35:7091/img/lucifer.png",
                    "name": "Lucifers Playlist",
                    "title": "Apple Music",
                    "artist": "",
                    "album": "",
                    "station": "",
                    "contentType": "ZoneFavorites",
                    "mediaType": "favorites"
                }
            ]
        }
    ]);
}

function audioCfgGetRadios(url) {

    return response(url, 'getradios', [
        {
			"cmd": "presets",
			"name": "Radio Favorieten",
            "icon": "http://10.7.10.151:7091/imgcache/?item=radiomusic&viaproxy=170ab4fc-0261-9bac-ffffc581ef707fce",
            "root": "start"
		},
		{
			"cmd": "all",
			"name": "Alles",
            "icon": "http://10.7.10.151:7091/imgcache/?item=radioworld&viaproxy=170ab4fc-0261-9bac-ffffc581ef707fce",
            "root": "start"
		}
    ]);
}

async function audioCfgGetServiceFolder(url) {

    let [, , , service, user, requestId, start, length] = url.split('/');

    return response(url, 'getservicefolder', [{
        
        id: requestId,
        totalitems: 1,
        start: +start,
        name: "Presets",
        items: [
            {
                audiopath: "tunein:station:s244566",
                contentType: "Playlists",
                coverurl: "http://cdn-profiles.tunein.com/s244566/images/logoq.jpg?t=161495",
                id: "tunein:station:s244566",
                name: "Arabella Oberösterreich 96.7 (Adult Hits)",
                sort: "",
                station: "Arabella Oberösterreich 96.7 (Adult Hits)",
                type: 2
            }
        ]
    }])

}

async function audioCfgGetMediaFolder(url) {
    const [, , , requestId, start, length] = url.split('/');

    let rootItem = undefined;

    //const {total, items} = await this._master.getLibraryList().get(rootItem, +start, +length);

    return response(url, 'getmediafolder', [
        {
            id: requestId,
            totalitems: 0,
            start: +start,
            items: [],
            //items: items.map(this._convert(2, BASE_LIBRARY, +start)),
        },
    ]);
}

  async function audioCfgGetPlaylists(url) {
    const [, , , , , id, start, length] = url.split('/');

    let rootItem = undefined;

    //const { total, items } = await this._master.getPlaylistList().get(rootItem, +start, +length);

    return response(url, 'getplaylists2', [
        {
            id: id,
            totalitems: 0,
            start: +start,
            items: [],
            //items: items.map(this._convert(11, BASE_PLAYLIST)),
        },
    ]);
}

function audioCfgGetSyncedPlayers(url) {
    return emptyCommand(url, []);
}

function unknownCommand(url) {
    logger.info(`[${config.audioserver.name}][Handler] Loxone Request niet verwerkt: ${url}`)
    return emptyCommand(url, null);
}

function emptyCommand(url, rsp) {
    const parts = url.split('/');

    for (let i = parts.length; i--;) {
        if (/^[a-z]/.test(parts[i])) {
            return response(url, parts[i], rsp);
        }
    }
}

function response(url, name, result) {
    const message = {
        [name + '_result']: result,
        command: url,
    };
    return JSON.stringify(message, null, 2);
}

export default audioserver;