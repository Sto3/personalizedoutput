/**
 * Form Schemas Index
 *
 * Central export for all form schemas.
 */

export * from './formSchemaTypes';
export { getSantaFormSchema, normalizeSantaAnswers } from './santaFormSchema';
export { getHolidayResetFormSchema, normalizeHolidayResetAnswers } from './holidayResetFormSchema';
export { getNewYearResetFormSchema, normalizeNewYearResetAnswers } from './newYearResetFormSchema';
