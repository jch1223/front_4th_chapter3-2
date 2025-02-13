export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatInfo {
  id?: string;
  type: RepeatType;
  interval: number;
  intervalOption?: 'lastDayOfMonth' | 'specificDay';
  endDate?: string;
  count?: number;
  infinite?: boolean;
}

export interface EventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  category: string;
  repeat: RepeatInfo;
  notificationTime: number; // 분 단위로 저장
  originalEventId?: string;
  excludeDates?: string[];
}

export interface Event extends EventForm {
  id: string;
}
