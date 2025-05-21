export interface IEvent {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  color: string;
  description: string;
  user: {
    id: string;
    name: string;
    picturePath: string | null;
  };
}
