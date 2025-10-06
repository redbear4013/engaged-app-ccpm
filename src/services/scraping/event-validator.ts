/**
 * Event Validation Utilities
 * Classifies and validates scraped events to filter out navigation menus and invalid content
 */

import type { RawEventData } from '@/types/scraping';

export type EventClassification = 'event' | 'attraction' | 'invalid';

export interface ValidationResult {
  isValid: boolean;
  classification: EventClassification;
  reason?: string;
  warnings?: string[];
}

// Navigation and menu patterns to exclude
const INVALID_TITLE_PATTERNS = [
  /^home$/i,
  /^menu$/i,
  /^navigation$/i,
  /^contact$/i,
  /^about\s*us$/i,
  /^services$/i,
  /^browse\s*events$/i,
  /^all\s*events$/i,
  /^view\s*all$/i,
  /^more\s*events$/i,
  /^upcoming$/i,
  /^past\s*events$/i,
  /^calendar$/i,
  /^search$/i,
  /^filter$/i,
  /^categories$/i,
  /^sign\s*(in|up)$/i,
  /^log\s*(in|out)$/i,
  /^(my\s*)?account$/i,
  /^cart$/i,
  /^checkout$/i,
  /^wishlist$/i,
  /^favorites$/i
];

// Minimum content requirements
const MIN_TITLE_LENGTH = 10;
const MIN_DESCRIPTION_LENGTH = 50;

// Date validation: 60 days past to 2 years future
const MAX_PAST_DAYS = 60;
const MAX_FUTURE_YEARS = 2;

/**
 * Classify an event as event/attraction/invalid
 */
export function classifyEvent(event: RawEventData): EventClassification {
  const title = event.title?.toLowerCase() || '';

  // Check for invalid patterns first
  for (const pattern of INVALID_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return 'invalid';
    }
  }

  // Check if it's an attraction (permanent/ongoing)
  if (isAttraction(event)) {
    return 'attraction';
  }

  // Default to event
  return 'event';
}

/**
 * Determine if an event is an attraction (permanent venue/exhibit)
 */
function isAttraction(event: RawEventData): boolean {
  const title = event.title?.toLowerCase() || '';
  const description = event.description?.toLowerCase() || '';

  const attractionKeywords = [
    'permanent',
    'ongoing',
    'year-round',
    'daily',
    'open every',
    'always open',
    'museum',
    'gallery',
    'exhibition hall'
  ];

  const hasAttractionKeyword = attractionKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );

  // If no specific date/time, likely an attraction
  const hasNoDate = !event.startTime && !event.endTime;

  return hasAttractionKeyword || hasNoDate;
}

/**
 * Validate an event against all validation rules
 */
export function validateEvent(event: RawEventData): ValidationResult {
  const warnings: string[] = [];
  let reason: string | undefined;

  // 1. Check title presence and length
  if (!event.title || event.title.trim().length === 0) {
    return {
      isValid: false,
      classification: 'invalid',
      reason: 'Missing title'
    };
  }

  if (event.title.trim().length < MIN_TITLE_LENGTH) {
    return {
      isValid: false,
      classification: 'invalid',
      reason: `Title too short (${event.title.length} chars, minimum ${MIN_TITLE_LENGTH})`
    };
  }

  // 2. Check for invalid title patterns
  const classification = classifyEvent(event);
  if (classification === 'invalid') {
    return {
      isValid: false,
      classification: 'invalid',
      reason: 'Title matches navigation/menu pattern'
    };
  }

  // 3. Validate description
  if (!event.description || event.description.trim().length === 0) {
    warnings.push('Missing description');
  } else if (event.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    warnings.push(`Description too short (${event.description.length} chars, recommended ${MIN_DESCRIPTION_LENGTH}+)`);
  }

  // 4. Validate date/time (only for events, not attractions)
  if (classification === 'event') {
    if (!event.startTime) {
      warnings.push('Missing start time');
    } else {
      const dateValidation = validateEventDate(event.startTime);
      if (!dateValidation.isValid) {
        return {
          isValid: false,
          classification,
          reason: dateValidation.reason,
          warnings
        };
      }
    }
  }

  // 5. Validate venue/location
  if (!event.location && !event.venue) {
    warnings.push('Missing venue/location information');
  }

  // 6. Check for suspicious patterns (repeated characters, all caps, etc.)
  if (hasSuspiciousPattern(event.title)) {
    return {
      isValid: false,
      classification: 'invalid',
      reason: 'Title contains suspicious patterns'
    };
  }

  return {
    isValid: true,
    classification,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate event date is within acceptable range
 */
function validateEventDate(dateString: string): { isValid: boolean; reason?: string } {
  try {
    const eventDate = new Date(dateString);
    const now = new Date();

    // Check if date is valid
    if (isNaN(eventDate.getTime())) {
      return { isValid: false, reason: 'Invalid date format' };
    }

    // Check if date is too far in the past
    const pastLimit = new Date();
    pastLimit.setDate(pastLimit.getDate() - MAX_PAST_DAYS);
    if (eventDate < pastLimit) {
      return { isValid: false, reason: `Event date is more than ${MAX_PAST_DAYS} days in the past` };
    }

    // Check if date is too far in the future
    const futureLimit = new Date();
    futureLimit.setFullYear(futureLimit.getFullYear() + MAX_FUTURE_YEARS);
    if (eventDate > futureLimit) {
      return { isValid: false, reason: `Event date is more than ${MAX_FUTURE_YEARS} years in the future` };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: 'Error parsing date' };
  }
}

/**
 * Check for suspicious patterns in text
 */
function hasSuspiciousPattern(text: string): boolean {
  // All caps (but allow acronyms up to 5 chars)
  if (text.length > 5 && text === text.toUpperCase() && /[A-Z]{6,}/.test(text)) {
    return true;
  }

  // Repeated characters (e.g., "AAAAAAA", "........")
  if (/(.)\1{5,}/.test(text)) {
    return true;
  }

  // Excessive special characters
  const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > text.length * 0.3) {
    return true;
  }

  return false;
}

/**
 * Batch validate multiple events and return statistics
 */
export function validateEvents(events: RawEventData[]): {
  valid: RawEventData[];
  invalid: RawEventData[];
  attractions: RawEventData[];
  statistics: {
    total: number;
    validEvents: number;
    validAttractions: number;
    invalid: number;
    validationRate: number;
  };
  rejectionReasons: Record<string, number>;
} {
  const valid: RawEventData[] = [];
  const invalid: RawEventData[] = [];
  const attractions: RawEventData[] = [];
  const rejectionReasons: Record<string, number> = {};

  for (const event of events) {
    const validation = validateEvent(event);

    if (validation.isValid) {
      if (validation.classification === 'attraction') {
        attractions.push(event);
      } else {
        valid.push(event);
      }

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn(`Event "${event.title}" has warnings:`, validation.warnings);
      }
    } else {
      invalid.push(event);

      // Track rejection reasons
      const reason = validation.reason || 'Unknown reason';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;

      console.log(`Rejected event: "${event.title}" - Reason: ${reason}`);
    }
  }

  const validCount = valid.length + attractions.length;
  const total = events.length;

  return {
    valid,
    invalid,
    attractions,
    statistics: {
      total,
      validEvents: valid.length,
      validAttractions: attractions.length,
      invalid: invalid.length,
      validationRate: total > 0 ? (validCount / total) * 100 : 0
    },
    rejectionReasons
  };
}

/**
 * Log validation statistics
 */
export function logValidationStats(stats: ReturnType<typeof validateEvents>): void {
  console.log('\n=== Event Validation Statistics ===');
  console.log(`Total scraped: ${stats.statistics.total}`);
  console.log(`Valid events: ${stats.statistics.validEvents}`);
  console.log(`Valid attractions: ${stats.statistics.validAttractions}`);
  console.log(`Invalid/Rejected: ${stats.statistics.invalid}`);
  console.log(`Validation rate: ${stats.statistics.validationRate.toFixed(2)}%`);

  if (Object.keys(stats.rejectionReasons).length > 0) {
    console.log('\nRejection Reasons:');
    Object.entries(stats.rejectionReasons)
      .sort(([, a], [, b]) => b - a)
      .forEach(([reason, count]) => {
        console.log(`  - ${reason}: ${count}`);
      });
  }
  console.log('===================================\n');
}
