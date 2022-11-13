import axios from 'axios';
import crc32 from 'crc32';

const msClient = {}



msClient.getAudioserverConfig = async () => {

    // Get MiniServer MAC
    await getminiserverMAC();

    logger.info(`[msCient][getAudioserverConfig] Fetching AudioServer config from Loxone MiniServer [${config.miniserver.ip}]`)
    const encodedBase64Token = Buffer.from(`${config.miniserver.username}:${config.miniserver.password}`).toString('base64');
    const authorization = `Basic ${encodedBase64Token}`;

    // Retrieve Music.json to calculate crc for getconfig cmd
    const response = await axios({
        url: `http://${config.miniserver.ip}/dev/fsget/prog/Music.json`,
        method: 'post',
        headers: { Authorization: authorization, },
        data: {}
    });

    config.miniserver.musicCFG = response.data
    config.miniserver.musicCRC = crc32(JSON.stringify(config.miniserver.musicCFG)).toString(16);

    if (Object.keys(config.miniserver.musicCFG).length === 0) {

        logger.error(`[msCient][getAudioserverConfig] No AudioServer found in config`)
        logger.error(`[msCient][getAudioserverConfig] AudioServer not paired`)
    }
    else {
        config.audioserver.paired = true
    }

    for (let [key, value] of Object.entries(config.miniserver.musicCFG)) {

        config.audioserver.name = value[config.audioserver.macID].name;
        config.audioserver.uuid = value[config.audioserver.macID].uuid;
        logger.info(`[msCient][getAudioserverConfig] Paired AudioServer found [${config.audioserver.name}]`)
    }

    // Inform the Miniserver that the Audioserver is starting up and the Miniserver can now
    // connect to it.
    await axios({
        url: `http://${config.miniserver.ip}/dev/sps/devicestartup/${config.audioserver.uuid}`,
        method: 'get',
        headers: { Authorization: authorization, },
        data: {}
    });
}

async function getminiserverMAC() {

    // Retrieve the MAC Adresse of the Miniserver
    const macResponse = await axios({
        url: `http://${config.miniserver.ip}/jdev/cfg/mac`,
        method: 'get',
        data: {}
    });
    config.miniserver.mac = macResponse.data.LL.value.replace(/:/g, "").toUpperCase();
}


export default msClient;