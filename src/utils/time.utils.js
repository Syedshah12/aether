export const calculateDurationSeconds = (start, end) => {
  return Math.floor((new Date(end) - new Date(start)) / 1000);
};