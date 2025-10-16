import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const transport = new DailyRotateFile({
  filename: './logs/cureka-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '7d',  // Retain logs for 7 days
  level: 'info'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transport,
    new winston.transports.Console()
  ]
});
export default logger;