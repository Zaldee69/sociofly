import { CalendarService } from "@/lib/services/calendar-service";

const calendarService = new CalendarService();

export const getEvents = async () => {
  const events = await calendarService.getScheduledPosts();
  return events;
};

export const getUsers = async () => {
  // TODO: Implement user fetching from Supabase
  return [];
};
