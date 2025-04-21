import { Calendar as CalendarIcon, Edit, Trash, Twitter, Instagram, Facebook, MoreHorizontal, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar"


interface Event {
  id: number;
  title: string;
  organizer: string;
  start: Date;
  end: Date;
  status: string;
  platform: string;
  content: string;
}

// Platform colors
const platformColors = {
  twitter: "#1DA1F2",
  instagram: "#E1306C",
  facebook: "#4267B2",
  linkedin: "#0077B5"
};

// Platform icons
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "twitter":
      return <Twitter size={16} className="text-[#1DA1F2]" />;
    case "instagram":
      return <Instagram size={16} className="text-[#E1306C]" />;
    case "facebook":
      return <Facebook size={16} className="text-[#4267B2]" />;
    default:
      return <Twitter size={16} />;
  }
};

export default function EventListSidebar({ events, selectedDate }:{
  events: Event[];
  selectedDate: Date;
}) {
  // Find the first event, or null if no events
  const selected = events.length > 0 ? events[0] : null;

  return (
    <aside className="w-[280px] min-w-[220px] border-l bg-white dark:bg-dark-gray flex flex-col">
      <div className="p-5 border-b">
       <Calendar />
      </div>
      
      {/* Event listing - Hootsuite style */}
      <div className="flex-1 overflow-y-auto">
        {/* <div className="p-4 border-b">
          <h3 className="font-semibold text-sm mb-2">Upcoming Posts</h3>
          
          {events.map((event) => (
            <div 
              key={event.id} 
              className="p-3 mb-2 border rounded-md hover:bg-muted transition-colors cursor-pointer"
              style={{
                borderLeft: `4px solid ${platformColors[event.platform as keyof typeof platformColors] || "#6c5ce7"}`
              }}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm line-clamp-1">{event.title}</span>
                {getPlatformIcon(event.platform)}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{format(event.start, "MMM d")}</span>
                <span>•</span>
                <span>{format(event.start, "h:mm a")}</span>
              </div>
              
              <div className="mt-2 text-xs line-clamp-2 text-muted-foreground">
                {event.content}
              </div>
              
              <div className="flex justify-end gap-1 mt-2">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Edit size={12} />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                  <Trash size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div> */}
      </div>
      
      {/* Event detail */}
      {selected && (
        <div className="p-5 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span 
                className="h-3 w-3 rounded-full" 
                style={{
                  background: platformColors[selected.platform as keyof typeof platformColors] || "#6c5ce7"
                }}
              />
              <span className="text-xs font-medium">{selected.status === "happening" ? "Happening now" : "Scheduled"}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Edit size={12} />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                <Trash size={12} />
              </Button>
            </div>
          </div>
          
          <div className="font-semibold">{selected.title}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <CalendarIcon className="w-4 h-4" />
            {selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span className="font-bold">{selected.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            &ndash;
            <span className="font-bold">{selected.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs">Platform:</span>
            <div className="flex items-center gap-1">
              {getPlatformIcon(selected.platform)}
              <span className="text-xs capitalize">{selected.platform}</span>
            </div>
          </div>
          
          <div className="text-xs mt-2">
            Organizer: <span className="font-medium">{selected.organizer}</span>
          </div>
          
          <div className="mt-3 text-xs bg-muted p-3 rounded-md">
            {selected.content}
          </div>
          
          <div className="flex justify-center mt-4">
            <Button size="sm" variant="outline" className="w-full">
              <MessageCircle size={14} className="mr-1" />
              Add Comment
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}