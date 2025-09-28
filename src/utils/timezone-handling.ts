// Comprehensive timezone handling utilities for calendar events
import { TimezoneInfo, MultiTimezoneEvent, EnhancedCalendarEvent } from '@/types/calendar';

// Common timezone mappings and constants
export const COMMON_TIMEZONES = {
  'UTC': 'UTC',
  'America/New_York': 'Eastern Time',
  'America/Chicago': 'Central Time',
  'America/Denver': 'Mountain Time',
  'America/Los_Angeles': 'Pacific Time',
  'Europe/London': 'GMT/BST',
  'Europe/Paris': 'CET/CEST',
  'Europe/Berlin': 'CET/CEST',
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Asia/Kolkata': 'IST',
  'Australia/Sydney': 'AEDT/AEST',
  'Pacific/Auckland': 'NZDT/NZST'
} as const;

export const DEFAULT_TIMEZONE = 'UTC';
export const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Get timezone information for a given timezone
 */
export function getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || '';

    // Calculate offset in minutes
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (localDate.getTime() - utcDate.getTime()) / 60000;

    // Check if currently in DST
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    const januaryOffset = getTimezoneOffset(timezone, january);
    const julyOffset = getTimezoneOffset(timezone, july);
    const isDst = offset === Math.max(januaryOffset, julyOffset);

    return {
      timezone,
      offset,
      abbreviation: timeZoneName,
      isDst,
      dstStart: isDst ? getDSTTransitionDate(timezone, date.getFullYear(), 'start') : undefined,
      dstEnd: isDst ? getDSTTransitionDate(timezone, date.getFullYear(), 'end') : undefined
    };
  } catch (error) {
    console.error(`Error getting timezone info for ${timezone}:`, error);
    // Fallback to UTC
    return {
      timezone: 'UTC',
      offset: 0,
      abbreviation: 'UTC',
      isDst: false
    };
  }
}

/**
 * Get timezone offset in minutes for a specific date
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    return (localDate.getTime() - utcDate.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/**
 * Get DST transition dates for a timezone and year
 */
function getDSTTransitionDate(timezone: string, year: number, type: 'start' | 'end'): Date | undefined {
  try {
    // This is a simplified approach - in production, you'd want to use a comprehensive timezone library
    const months = type === 'start' ? [2, 3, 4] : [9, 10, 11]; // March-May for start, Sep-Nov for end

    for (const month of months) {
      for (let day = 1; day <= 31; day++) {
        try {
          const testDate = new Date(year, month, day);
          const prevDay = new Date(year, month, day - 1);

          const currentOffset = getTimezoneOffset(timezone, testDate);
          const prevOffset = getTimezoneOffset(timezone, prevDay);

          if (currentOffset !== prevOffset) {
            return type === 'start'
              ? (currentOffset > prevOffset ? testDate : undefined)
              : (currentOffset < prevOffset ? testDate : undefined);
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

/**
 * Convert a date from one timezone to another
 */
export function convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
  try {
    // Convert to UTC first
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Then convert to target timezone
    const targetDate = new Date(utcDate.toLocaleString('en-US', { timeZone: toTimezone }));

    return targetDate;
  } catch (error) {
    console.error('Error converting timezone:', error);
    return date; // Return original date if conversion fails
  }
}

/**
 * Format date with timezone information
 */
export function formatDateWithTimezone(
  date: Date,
  timezone: string,
  options: {
    includeTimezone?: boolean;
    format?: 'short' | 'long' | 'full';
    locale?: string;
  } = {}
): string {
  const {
    includeTimezone = true,
    format = 'long',
    locale = 'en-US'
  } = options;

  try {
    const baseOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    if (includeTimezone) {
      baseOptions.timeZoneName = format === 'full' ? 'long' : 'short';
    }

    return new Intl.DateTimeFormat(locale, baseOptions).format(date);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return date.toLocaleString();
  }
}

/**
 * Create a multi-timezone view of an event
 */
export function createMultiTimezoneEvent(
  event: EnhancedCalendarEvent,
  displayTimezones: string[]
): MultiTimezoneEvent {
  const timezones: MultiTimezoneEvent['timezones'] = {};

  for (const timezone of displayTimezones) {
    try {
      const startTime = convertTimezone(event.startTime, event.timezone, timezone);
      const endTime = convertTimezone(event.endTime, event.timezone, timezone);

      // Check if event spans to next day in this timezone
      const isNextDay = startTime.getDate() !== event.startTime.getDate();

      // Format display time
      const displayTime = formatDateWithTimezone(startTime, timezone, {
        format: 'short',
        includeTimezone: false
      });

      timezones[timezone] = {
        startTime,
        endTime,
        displayTime,
        isNextDay
      };
    } catch (error) {
      console.error(`Error converting event to timezone ${timezone}:`, error);
      // Use original event times as fallback
      timezones[timezone] = {
        startTime: event.startTime,
        endTime: event.endTime,
        displayTime: event.startTime.toLocaleString(),
        isNextDay: false
      };
    }
  }

  return {
    event,
    timezones
  };
}

/**
 * Check if two events overlap considering different timezones
 */
export function checkTimezoneAwareOverlap(
  event1: { startTime: Date; endTime: Date; timezone: string },
  event2: { startTime: Date; endTime: Date; timezone: string }
): boolean {
  try {
    // Convert both events to UTC for comparison
    const event1StartUTC = convertTimezone(event1.startTime, event1.timezone, 'UTC');
    const event1EndUTC = convertTimezone(event1.endTime, event1.timezone, 'UTC');
    const event2StartUTC = convertTimezone(event2.startTime, event2.timezone, 'UTC');
    const event2EndUTC = convertTimezone(event2.endTime, event2.timezone, 'UTC');

    // Check for overlap in UTC
    return event1StartUTC < event2EndUTC && event2StartUTC < event1EndUTC;
  } catch (error) {
    console.error('Error checking timezone-aware overlap:', error);
    // Fallback to direct comparison (assuming same timezone)
    return event1.startTime < event2.endTime && event2.startTime < event1.endTime;
  }
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return BROWSER_TIMEZONE || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available timezones (this would typically come from a comprehensive list)
 */
export function getAvailableTimezones(): { value: string; label: string; region: string }[] {
  return [
    // Americas
    { value: 'America/New_York', label: 'Eastern Time', region: 'Americas' },
    { value: 'America/Chicago', label: 'Central Time', region: 'Americas' },
    { value: 'America/Denver', label: 'Mountain Time', region: 'Americas' },
    { value: 'America/Los_Angeles', label: 'Pacific Time', region: 'Americas' },
    { value: 'America/Anchorage', label: 'Alaska Time', region: 'Americas' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time', region: 'Americas' },
    { value: 'America/Toronto', label: 'Eastern Time (Canada)', region: 'Americas' },
    { value: 'America/Vancouver', label: 'Pacific Time (Canada)', region: 'Americas' },
    { value: 'America/Mexico_City', label: 'Central Time (Mexico)', region: 'Americas' },
    { value: 'America/Sao_Paulo', label: 'Brasília Time', region: 'Americas' },

    // Europe
    { value: 'Europe/London', label: 'Greenwich Mean Time', region: 'Europe' },
    { value: 'Europe/Paris', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Berlin', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Rome', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Madrid', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Amsterdam', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Stockholm', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Warsaw', label: 'Central European Time', region: 'Europe' },
    { value: 'Europe/Moscow', label: 'Moscow Standard Time', region: 'Europe' },

    // Asia
    { value: 'Asia/Tokyo', label: 'Japan Standard Time', region: 'Asia' },
    { value: 'Asia/Seoul', label: 'Korea Standard Time', region: 'Asia' },
    { value: 'Asia/Shanghai', label: 'China Standard Time', region: 'Asia' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', region: 'Asia' },
    { value: 'Asia/Singapore', label: 'Singapore Standard Time', region: 'Asia' },
    { value: 'Asia/Kolkata', label: 'India Standard Time', region: 'Asia' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time', region: 'Asia' },
    { value: 'Asia/Bangkok', label: 'Indochina Time', region: 'Asia' },
    { value: 'Asia/Manila', label: 'Philippine Standard Time', region: 'Asia' },

    // Oceania
    { value: 'Australia/Sydney', label: 'Australian Eastern Time', region: 'Oceania' },
    { value: 'Australia/Melbourne', label: 'Australian Eastern Time', region: 'Oceania' },
    { value: 'Australia/Perth', label: 'Australian Western Time', region: 'Oceania' },
    { value: 'Pacific/Auckland', label: 'New Zealand Standard Time', region: 'Oceania' },

    // Africa
    { value: 'Africa/Cairo', label: 'Eastern European Time', region: 'Africa' },
    { value: 'Africa/Johannesburg', label: 'South Africa Standard Time', region: 'Africa' },
    { value: 'Africa/Lagos', label: 'West Africa Time', region: 'Africa' },

    // UTC
    { value: 'UTC', label: 'Coordinated Universal Time', region: 'UTC' }
  ].sort((a, b) => {
    if (a.region !== b.region) {
      return a.region.localeCompare(b.region);
    }
    return a.label.localeCompare(b.label);
  });
}

/**
 * Calculate working hours in a specific timezone
 */
export function getWorkingHoursInTimezone(
  workingHours: { start: string; end: string }, // HH:MM format
  fromTimezone: string,
  toTimezone: string,
  date: Date
): { start: string; end: string; isNextDay: boolean } {
  try {
    // Create dates for working hours in the original timezone
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0, 0);

    // Convert to target timezone
    const convertedStart = convertTimezone(startDate, fromTimezone, toTimezone);
    const convertedEnd = convertTimezone(endDate, fromTimezone, toTimezone);

    // Check if it spans to next day
    const isNextDay = convertedStart.getDate() !== startDate.getDate() ||
                      convertedEnd.getDate() !== endDate.getDate();

    // Format back to HH:MM
    const formatTime = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return {
      start: formatTime(convertedStart),
      end: formatTime(convertedEnd),
      isNextDay
    };
  } catch (error) {
    console.error('Error calculating working hours in timezone:', error);
    return {
      start: workingHours.start,
      end: workingHours.end,
      isNextDay: false
    };
  }
}

/**
 * Get current time in multiple timezones
 */
export function getCurrentTimeInTimezones(timezones: string[]): { [timezone: string]: Date } {
  const now = new Date();
  const result: { [timezone: string]: Date } = {};

  for (const timezone of timezones) {
    try {
      result[timezone] = convertTimezone(now, getUserTimezone(), timezone);
    } catch (error) {
      console.error(`Error getting current time for ${timezone}:`, error);
      result[timezone] = now;
    }
  }

  return result;
}

/**
 * Suggest optimal meeting time across multiple timezones
 */
export function suggestOptimalMeetingTime(
  participants: { timezone: string; workingHours?: { start: string; end: string } }[],
  duration: number, // in minutes
  preferredDate: Date
): Date[] {
  const suggestions: Date[] = [];

  // Default working hours if not provided
  const defaultWorkingHours = { start: '09:00', end: '17:00' };

  try {
    // Find overlapping working hours in UTC
    const workingHoursInUTC = participants.map(participant => {
      const hours = participant.workingHours || defaultWorkingHours;
      return getWorkingHoursInTimezone(hours, participant.timezone, 'UTC', preferredDate);
    });

    // Find common working hours (simplified logic)
    // In a real implementation, you'd want more sophisticated overlap detection
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const testTime = new Date(preferredDate);
        testTime.setUTCHours(hour, minute, 0, 0);

        // Check if this time works for all participants
        const worksForAll = workingHoursInUTC.every(hours => {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          return timeStr >= hours.start && timeStr <= hours.end;
        });

        if (worksForAll && suggestions.length < 5) { // Limit to 5 suggestions
          suggestions.push(new Date(testTime));
        }
      }
    }
  } catch (error) {
    console.error('Error suggesting optimal meeting time:', error);
  }

  return suggestions;
}

export default {
  getTimezoneInfo,
  convertTimezone,
  formatDateWithTimezone,
  createMultiTimezoneEvent,
  checkTimezoneAwareOverlap,
  getUserTimezone,
  isValidTimezone,
  getAvailableTimezones,
  getWorkingHoursInTimezone,
  getCurrentTimeInTimezones,
  suggestOptimalMeetingTime,
  COMMON_TIMEZONES,
  DEFAULT_TIMEZONE,
  BROWSER_TIMEZONE
};