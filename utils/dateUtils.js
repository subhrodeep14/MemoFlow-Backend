// utils/dateUtils.js

/**
 * Check if a date is locked (older than 1 year from today)
 */
const isDateLocked = (date) => {
  const entryDate = new Date(date);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);
  entryDate.setHours(0, 0, 0, 0);
  return entryDate < oneYearAgo;
};

/**
 * Format date as YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

module.exports = { isDateLocked, formatDate };
