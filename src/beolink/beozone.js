import msClient from '../loxone/msclient.js';
import beonotify from "./beonotify.js";

let beozone = {}
global.zone = [];

beozone.init = async () => {

    // Get AudioServer config from miniserver
    await msClient.getAudioserverConfig();

    if (config.audioserver.paired === false) {
        logger.info(`[BeoZone] AudioServer Not Paired. Skipping Zone Initialization`);
        return;

    }
    else {

        logger.info(`[BeoZone] Initializing Audio Zones`);

        for (let [key, value] of Object.entries(config.miniserver.musicCFG)) {

            // Initialize ZONES
            var envzones = process.env.ZONES.split(", ");
            var envzoneId = 0;

            // Search for all Players which are part of the music.json
            const players = value[config.audioserver.macID].players;

            if (players.length === 0) {
                logger.error(`[BeoZone] No Zones configured in Loxone. Skipping Zone Initialization`);
                return;
            }

            logger.info(`[BeoZone] ${players.length} zones configured in Loxone.`);
            logger.info(`[BeoZone] ${envzones.length} zones configured in .ENV file.`);
            
            if (players.length != envzones.length) {
                logger.error(`[BeoZone] Amount of zones configured in Loxone and .ENV do not match.`);
            }

            for (var i in players) {

                const playerId = parseInt(players[i].playerid);

                zone[playerId] = {};
                zone[playerId].player = {};
                zone[playerId].player.uuid = players[i].uuid;
                zone[playerId].player.playerid = players[i].playerid;

                if (envzones[envzoneId] == undefined) {
                    logger.error(`[BeoZone][Zone ${playerId}] No Available BeoLink Device found`);
                    logger.error(`[BeoZone][Zone ${playerId}] Zone not Mapped`);
                }
                else {

                    logger.info(`[BeoZone][Zone ${playerId}] Mapping BeoLink Device with ip ${envzones[envzoneId]}`);

                    zone[playerId].beolink = {};
                    zone[playerId].beolink.ip = envzones[envzoneId];

                    logger.info(`[BeoZone][Zone ${playerId}] Initializing Notification Listener`);
                    beonotify.listen(playerId)

                    envzoneId++
                }
            };
        }
    }
}

export default beozone;