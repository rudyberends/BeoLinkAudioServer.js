import got from 'got';

let beoremote = {}

beoremote.action = async (url) => {

    const params = url.split('/');
    const zoneId = params[1];
    const loxoneaction = params[2];

    logger.info(`[BeoRemote][zone ${zoneId}] Remote Command [${loxoneaction}] `)
    
    switch (loxoneaction) {

        case 'playurl':
            playItem(zoneId, params[3])
        break

        case 'serviceplay':
            playItem(zoneId, params[5])
        break

        case 'roomfav':
            playItem(zoneId, params[4])
        break

        case 'play':
            doAction(zoneId, 'Play')
        break

        case 'pause':
            doAction(zoneId, 'Pause')
        break

        case 'resume':
            doAction(zoneId, 'Play')
        break

        case 'queueminus':
            doAction(zoneId, 'Backward')
        break

        case 'queueplus':
            doAction(zoneId, 'Forward')
        break

        case 'volume':
            let level = parseInt(params[3], 10);
            setVolume(zoneId, level)
        break

        case 'position':
            let setpoint = parseInt(params[3], 10);
            setPosition(zoneId, setpoint)
        break
    }
}

async function playItem(zoneId, item) {

    var source = zone[zoneId].beolink.ip;
    var url = `http://${source}:8080/Beozone/zone/PlayQueue?instantplay`;

    try {
        const response = await got.post(url, {json: {
            "playQueueItem": {
                "behaviour": "planned",
                "station": {
                    "tuneIn": {
                        "stationId": item
                    },
                    "image" : [
                    ]
                }
            }
        }}).json();
        return response
    } catch (error) {
        logger.info(`[BeoRemote][zone ${zoneId}] Error on HTTP request`)
        logger.debug(error)
        return null
    }
}

async function doAction(zoneId, action) {

    const options = {
        method: 'post',
        responseType: 'json'
    }

    var source = zone[zoneId].beolink.ip;
    var url = `http://${source}:8080/BeoZone/Zone/Stream/${action}`;

    try {
        const response = await got(url, options)
        return response
    } catch (error) {
        logger.info(`[BeoRemote][zoneId${zoneId}] Error on HTTP request`)
        logger.debug(error)
        return null
    }
}

async function setVolume(zoneId, volume) {
   
    if (volume === 3) volume = zone[zoneId].track.volume +3
    else volume = zone[zoneId].track.volume -3;
    
    var source = zone[zoneId].beolink.ip;
    var url = `http://${source}:8080/BeoZone/Zone/Sound/Volume/Speaker/Level`;

    try {
        const response = await got.put(url, {json: {"level": volume}}).json();
        return response
    } catch (error) {
        logger.info(`[BeoRemote][zone ${zoneId}] Error on HTTP request`)
        logger.debug(error)
        return null
    }
  }

  async function setPosition(zoneId, setpoint) {
    
    var source = zone[zoneId].beolink.ip;
    var url = `http://${source}:8080/Beozone/Zone/Sound/Volume/Speaker/Level`;

    try {
        const response = await got.put(url, {json: {"level": volume}}).json();
        return response
    } catch (error) {
        logger.info(`[BeoRemote][zone ${zoneId}] Error on HTTP request`)
        logger.debug(error)
        return null
    }
  }

export default beoremote;