import { endOfMonth, getDay, subDays, isSameDay } from 'date-fns';

export function isLastBusinessDayOfMonth(date: Date): boolean {
  let lastBizDay = endOfMonth(date);
  while (getDay(lastBizDay) === 0 || getDay(lastBizDay) === 6) {
    lastBizDay = subDays(lastBizDay, 1);
  }
  return isSameDay(date, lastBizDay);
}
