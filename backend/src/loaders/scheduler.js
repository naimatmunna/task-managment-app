import config from '../config/index.js';
import logger from '../utils/logger.js';
import reminderService from '../services/reminder.service.js';

/**
 * Lightweight in-process scheduler for periodic maintenance work. Runs the
 * due-date reminder scan hourly (plus once shortly after boot). Deliberately
 * simple — no external cron/broker dependency — and disabled under tests.
 *
 * NOTE: on multi-instance deployments every instance would run this; move the
 * scan behind the BullMQ repeat queue if you scale horizontally.
 */
const HOUR_MS = 60 * 60 * 1000;
const BOOT_DELAY_MS = 30 * 1000;

let timers = [];

const runReminderScan = async () => {
  try {
    await reminderService.scanDueTasks();
  } catch (err) {
    logger.error(`Reminder scan failed: ${err.message}`);
  }
};

export const startScheduler = () => {
  if (config.isTest) return;

  // Kick off a first scan a little after boot so startup isn't blocked.
  const boot = setTimeout(runReminderScan, BOOT_DELAY_MS);
  const hourly = setInterval(runReminderScan, HOUR_MS);
  boot.unref?.();
  hourly.unref?.();
  timers = [boot, hourly];
  logger.info('Scheduler: due-date reminder scan every hour');
};

export const stopScheduler = () => {
  timers.forEach((t) => clearTimeout(t) || clearInterval(t));
  timers = [];
};
