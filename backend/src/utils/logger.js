import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, requestId }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    return `${ts} ${level}${rid}: ${stack || message}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const transports = [new winston.transports.Console()];

if (config.isProd) {
  transports.push(
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      level: 'info',
    }),
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'error',
    }),
  );
}

const logger = winston.createLogger({
  level: config.log.level,
  format: config.isProd ? prodFormat : devFormat,
  transports,
  exitOnError: false,
  silent: config.isTest,
});

export default logger;
