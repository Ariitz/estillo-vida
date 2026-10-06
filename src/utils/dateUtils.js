// Utility functions for consistent local date handling (avoiding UTC offset bugs)

/**
 * Returns YYYY-MM-DD formatted string in local time.
 * @param {Date|string|number} [d=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export const getLocalDateString = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns YYYY-MM-DD formatted string for yesterday in local time.
 * @returns {string} 'YYYY-MM-DD'
 */
export const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
};

/**
 * Safely parses a YYYY-MM-DD string into a local Date object at 00:00:00.
 * Avoids browser-specific UTC shifts when parsing ISO strings.
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 0, 0, 0, 0);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Formats a YYYY-MM-DD date into human-friendly Spanish string (e.g. '25 sep 2026').
 * @param {string|Date} dateStr 
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDisplayDate = (dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!dateStr) return 'Nunca';
  const d = parseLocalDate(dateStr);
  if (!d) return String(dateStr);
  return d.toLocaleDateString('es-MX', options);
};

/**
 * Returns difference in calendar days between two dates (date2 - date1).
 * @param {string|Date} date1 
 * @param {string|Date} date2 
 * @returns {number}
 */
export const getDaysDifference = (date1, date2) => {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  if (!d1 || !d2) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / msPerDay);
};
