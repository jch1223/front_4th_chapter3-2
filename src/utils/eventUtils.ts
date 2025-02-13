import { Event, RepeatInfo } from '../types';
import { getWeekDates, isDateInRange } from './dateUtils';

function filterEventsByDateRange(events: Event[], start: Date, end: Date): DeserializedEvent[] {
  return events.flatMap((event) => deserializeEvents(event, start, end));
}

function containsTerm(target: string, term: string) {
  return target.toLowerCase().includes(term.toLowerCase());
}

function searchEvents(events: Event[], term: string) {
  return events.filter(
    ({ title, description, location }) =>
      containsTerm(title, term) || containsTerm(description, term) || containsTerm(location, term)
  );
}

function filterEventsByDateRangeAtWeek(events: Event[], currentDate: Date) {
  const weekDates = getWeekDates(currentDate);
  return filterEventsByDateRange(
    events,
    weekDates[0],
    new Date(weekDates[6].setHours(23, 59, 59, 999))
  );
}

function filterEventsByDateRangeAtMonth(events: Event[], currentDate: Date) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return filterEventsByDateRange(events, monthStart, monthEnd);
}

export function getFilteredEvents(
  events: Event[],
  searchTerm: string,
  currentDate: Date,
  view: 'week' | 'month'
): Event[] {
  const searchedEvents = searchEvents(events, searchTerm);

  if (view === 'week') {
    return filterEventsByDateRangeAtWeek(searchedEvents, currentDate);
  }

  if (view === 'month') {
    return filterEventsByDateRangeAtMonth(searchedEvents, currentDate);
  }

  return searchedEvents;
}

interface DeserializedEvent extends Event {
  originalEventId?: string;
  isRepeated?: boolean;
}

export function deserializeEvents(
  event: Event,
  startDate: Date,
  endDate: Date
): DeserializedEvent[] {
  // 반복이 아닌 일반 이벤트인 경우
  if (event.repeat.type === 'none') {
    const eventDate = new Date(event.date);
    if (isDateInRange(eventDate, startDate, endDate)) {
      return [
        {
          ...event,
        },
      ];
    }
    return [];
  }

  const result: DeserializedEvent[] = [];
  const eventStartDate = new Date(event.date);
  const repeatEndDate = event.repeat.endDate
    ? new Date(event.repeat.endDate)
    : event.repeat.infinite
      ? new Date('2025-06-30')
      : event.repeat.count
        ? calculateEndDateByCount(eventStartDate, event.repeat)
        : endDate;

  let currentDate = new Date(eventStartDate);
  let eventCount = 0;

  while (currentDate <= repeatEndDate && currentDate <= endDate) {
    if (currentDate >= startDate) {
      result.push({
        ...event,
        id: `${event.id}-${currentDate.toISOString()}`,
        date: currentDate.toISOString().split('T')[0],
        originalEventId: event.id,
        isRepeated: true,
      });
    }

    eventCount++;
    if (event.repeat.count && eventCount >= event.repeat.count) {
      break;
    }

    // 다음 반복 날짜 계산
    currentDate = calculateNextDate(currentDate, event.repeat);
  }

  return result;
}

function calculateNextDate(currentDate: Date, repeat: RepeatInfo): Date {
  const nextDate = new Date(currentDate);

  switch (repeat.type) {
    case 'daily':
      nextDate.setDate(currentDate.getDate() + repeat.interval);
      break;

    case 'weekly':
      nextDate.setDate(currentDate.getDate() + 7 * repeat.interval);
      break;

    case 'monthly':
      if (repeat.intervalOption === 'lastDayOfMonth') {
        // 다음 달의 마지막 날로 설정
        nextDate.setMonth(currentDate.getMonth() + repeat.interval);
        nextDate.setDate(0);
      } else {
        // 같은 날짜로 다음 달 설정
        nextDate.setMonth(currentDate.getMonth() + repeat.interval);

        // 원본 날짜가 말일이었다면 다음 달의 말일로 설정
        const originalDay = currentDate.getDate();
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        if (originalDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        }
      }
      break;

    case 'yearly':
      nextDate.setFullYear(currentDate.getFullYear() + repeat.interval);
      break;
  }

  return nextDate;
}

function calculateEndDateByCount(startDate: Date, repeat: RepeatInfo): Date {
  if (!repeat.count) return new Date();

  const endDate = new Date(startDate);

  switch (repeat.type) {
    case 'daily':
      endDate.setDate(startDate.getDate() + repeat.interval * (repeat.count - 1));
      break;
    case 'weekly':
      endDate.setDate(startDate.getDate() + 7 * repeat.interval * (repeat.count - 1));
      break;
    case 'monthly':
      endDate.setMonth(startDate.getMonth() + repeat.interval * (repeat.count - 1));
      break;
    case 'yearly':
      endDate.setFullYear(startDate.getFullYear() + repeat.interval * (repeat.count - 1));
      break;
  }

  return endDate;
}
