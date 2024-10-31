// src/services/logger.js

import { createLogger, format, transports } from 'winston';


const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.printf((info) =>
            JSON.stringify({
                timestamp: info.timestamp,
                level: info.level,
                message: info.message,
            })
        )
    ),
    transports: [
        new transports.File({
            filename: "/opt/webapp/webapp/logs/csye6225.log", // Ensure logs directory exists
        }),
        new transports.Console(),
    ],
});

export default logger;

