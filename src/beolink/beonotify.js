import got from 'got';
import ndjson from 'ndjson';
import audioserver from '../loxone/audioserver.js';

// Workarround voor coverurl
import download from 'image-downloader';

let beonotify = {}

beonotify.listen = async (zoneId) => {

    zone[zoneId].beolink.notifyUrl = `http://${zone[zoneId].beolink.ip}:8080/BeoNotify/Notifications`;
    zone[zoneId].beolink.notifyStream = false;

    zone[zoneId].player.clienttype = 0;
    zone[zoneId].player.enabled = true;
    zone[zoneId].player.internalname = `zone-${zoneId}`;
    zone[zoneId].player.max_volume = 100;
    zone[zoneId].player.name = `zone-${zoneId}`;
    zone[zoneId].player.upnpmode = 0;
    zone[zoneId].player.upnprelay = 0;

    zone[zoneId].track = {};
    zone[zoneId].track.playerid = zoneId;
    zone[zoneId].track.coverurl = ``
    zone[zoneId].track.station = ``
    zone[zoneId].track.audiotype = 0;
    zone[zoneId].track.audiopath = "";
    zone[zoneId].track.mode= "stop";
    zone[zoneId].track.plrepeat = 0;
    zone[zoneId].track.plshuffle = 0;
    zone[zoneId].track.duration = 0;
    zone[zoneId].track.time = 0;
    zone[zoneId].track.power = "on";
    zone[zoneId].track.volume = 0;
    zone[zoneId].track.players = []; 
    zone[zoneId].track.players[0] = {};
    zone[zoneId].track.players[0].playerid = zoneId; 

    createNotificationListener(zoneId);
    
    setInterval(function reset () {
        closeNotificationListener(zoneId);
        createNotificationListener(zoneId);
    }, 180000)
}

async function closeNotificationListener(zoneId) {
    if (zone[zoneId].beolink.notifyStream) {
        try {
            zone[zoneId].beolink.notifyStream.destroy()
            logger.info(`[BeoNotify][Zone ${zoneId}] Notification Listener Reset `)
        } catch (error) {
        }
    }
}

async function createNotificationListener(zoneId) {
   
    try {
        zone[zoneId].beolink.notifyStream = got.stream(zone[zoneId].beolink.notifyUrl)
    } 
    
    catch (error) {
        logger.error(`[BeoNotify][Zone${zoneId}] Error initialising notification stream`)
    }

    logger.info(`[BeoNotify][Zone ${zoneId}] Notification Listener Active `)

    zone[zoneId].beolink.notifyStream.on('error', function (error) {
        logger.error(`[BeoNotify][Zone${zoneId}] Error connecting to notification stream`)
    })
        .pipe(ndjson.parse())
    
        .on('data', async function (msg) {
             
            if (msg.notification.type === 'PROGRESS_INFORMATION') {
                logger.debug(`[BeoNotify][Zone ${zoneId}] ${msg.notification.type}`)
            }
            else {
                logger.info(`[BeoNotify][Zone ${zoneId}] ${msg.notification.type}`)
            }
            
            switch (msg.notification.type) {

                case 'VOLUME':
                    zone[zoneId].track.volume = msg.notification.data.speaker.level
                    audioserver.pushAudioEvents(zone[zoneId])
                break
                
                case 'SOURCE':
                    zone[zoneId].track.power = "on";
                break
                
                case 'NOW_PLAYING_STORED_MUSIC':
                    zone[zoneId].track.audiotype = 2;
                    zone[zoneId].track.title = msg.notification.data.name
                    zone[zoneId].track.album = msg.notification.data.album
                    zone[zoneId].track.artist = msg.notification.data.artist
                    zone[zoneId].track.duration = msg.notification.data.duration
                    //zone[zoneId].track.coverurl = msg.notification.data.trackImage[0].url

                    // Workarround voor coverurl
                    var filename = `${msg.notification.data.album.replace(/\s+/g, '')}.jpg`;
                    await download.image({
                        url: msg.notification.data.trackImage[0].url,
                        dest: `/workspaces/BeoLinkAudioServer/static/img/${filename}` // DEV container
                        //dest: `/usr/src/app/static/img/${filename}`
                     });
                    zone[zoneId].track.coverurl = `http://${config.audioserver.webserver}/static/img/${filename}`
                    // Workarround voor coverurl

                    audioserver.pushAudioEvents(zone[zoneId])
                break
            
                case 'SHUTDOWN':
                case 'NOW_PLAYING_ENDED':
                    zone[zoneId].track.audiotype = 0;
                    zone[zoneId].track.title = "";
                    zone[zoneId].track.album = "";
                    zone[zoneId].track.artist = "";
                    zone[zoneId].track.duration = 0;
                    zone[zoneId].track.coverurl = ""
                    audioserver.pushAudioEvents(zone[zoneId])
                break
            
                case 'PROGRESS_INFORMATION':
                    zone[zoneId].track.mode = msg.notification.data.state
                    zone[zoneId].track.time = msg.notification.data.position
                    if (msg.notification.data.playQueueItemId && msg.notification.data.playQueueItemId === 'AUX') {
                        zone[zoneId].track.title = "Apple TV"
                    }
                    audioserver.pushAudioEvents(zone[zoneId])
                break
            
                case 'NOW_PLAYING_NET_RADIO':
                    zone[zoneId].track.audiotype = 1;
                    zone[zoneId].track.duration = 0;
                    zone[zoneId].track.artist = msg.notification.data.liveDescription
                    zone[zoneId].track.title = msg.notification.data.name
                    zone[zoneId].track.coverurl = msg.notification.data.image[0].url
                break
            }
        })
        .on('error', function (error) {
            logger.error(`[BeoNotify][Zone${zone}] Error during notification JSON streaming`)
            logger.debug(error)
        })
}

export default beonotify;