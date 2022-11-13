import dotenv from "dotenv";
import logger from './utils/logger.js';
import beozone from './beolink/beozone.js'
import audioserver from './loxone/audioserver.js'

logger.info('Starting Loxone/Beolink AudioServerProxy ');

// Initialize .ENV
dotenv.config();

// Initialize Logger
global.logger = logger;

global.config = {}

// Initialize MiniServer Config
config.miniserver = {};
config.miniserver.ip = process.env.MINISERVER_IP;
config.miniserver.username = process.env.MINISERVER_USERNAME;
config.miniserver.password = process.env.MINISERVER_PASSWORD;

// Initialize AudioServer
config.audioserver = {};
config.audioserver.name = "Unconfigured"
config.audioserver.paired = false
config.audioserver.mac = "50:4f:94:ff:1b:b3"
config.audioserver.macID = "504F94FF1BB3";

// Initialize BeoLink Zones
await beozone.init();

// Starting AudioServer
audioserver.start();
