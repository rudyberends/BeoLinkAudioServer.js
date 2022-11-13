import dotenv from "dotenv";
dotenv.config();

const { LOGLEVEL_CONSOLE, LOGLEVEL_FILE } = process.env;

import winston from 'winston'

const options = {
  file: {
    level: LOGLEVEL_FILE,
    filename: './logs/logfile',
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: LOGLEVEL_CONSOLE,
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console)
    ],
    format: winston.format.combine(
        winston.format.timestamp({format: 'DD-MM-YYYY HH:mm:ss'}),
        winston.format.printf((info) => {
            return `[${info.timestamp}][${info.level}]${info.message}`;
        })
    ),
    exitOnError: false
})

export default logger;