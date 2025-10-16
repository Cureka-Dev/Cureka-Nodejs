export const getFiveMinutesBefore = async () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 5);
  return date;
};
