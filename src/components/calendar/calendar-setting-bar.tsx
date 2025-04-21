import { ChevronDown, Settings } from "lucide-react";

const CalendarSettingBar = () => {
  return (
    <div>
      {" "}
      <footer className="border-t flex items-center gap-2 text-sm px-6 py-3 bg-white text-muted-foreground">
        <Settings size={18} className="mr-1" />
        <span>Calendar settings</span>
        <ChevronDown size={16} className="ml-1" />
      </footer>{" "}
    </div>
  );
};

export default CalendarSettingBar;
