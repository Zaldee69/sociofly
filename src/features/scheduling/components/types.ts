export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarPost {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: PostColor;
  label?: string;
  location?: string;
}

export type PostColor = "blue" | "orange" | "violet" | "rose" | "emerald";
