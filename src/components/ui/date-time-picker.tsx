"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, addMinutes, isBefore, isToday } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";

const FormSchema = z.object({
  time: z.date({
    required_error: "A date and time is required.",
  }),
});

export function DateTimePicker24hForm() {
  const [minTime, setMinTime] = useState<Date>(addMinutes(new Date(), 1));

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      time: addMinutes(new Date(), 1),
    },
  });

  // Update minimum time whenever component renders
  useEffect(() => {
    setMinTime(addMinutes(new Date(), 1));
  }, []);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast.success(`Selected date and time: ${format(data.time, "PPPP HH:mm")}`);
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      // Get current values
      const currentTime = form.getValues("time") || new Date();

      // Create new date with selected date but keep current time
      const newDate = new Date(date);
      newDate.setHours(currentTime.getHours());
      newDate.setMinutes(currentTime.getMinutes());

      // If the new date is today, ensure time is not in the past
      if (isToday(newDate) && isBefore(newDate, minTime)) {
        newDate.setHours(minTime.getHours());
        newDate.setMinutes(minTime.getMinutes());
      }

      form.setValue("time", newDate);
    }
  }

  function handleTimeChange(type: "hour" | "minute", value: string) {
    const currentDate = form.getValues("time") || new Date();
    let newDate = new Date(currentDate);

    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    }

    // If the new date is today, ensure time is not in the past
    if (isToday(newDate) && isBefore(newDate, minTime)) {
      toast.error("Cannot select a time in the past");
      return;
    }

    form.setValue("time", newDate);
  }

  // Determine if an hour button should be disabled
  function isHourDisabled(hour: number): boolean {
    if (!isToday(form.getValues("time"))) return false;
    return hour < minTime.getHours();
  }

  // Determine if a minute button should be disabled
  function isMinuteDisabled(minute: number): boolean {
    const currentValue = form.getValues("time");
    if (!currentValue || !isToday(currentValue)) return false;

    const currentHour = currentValue.getHours();
    const minHour = minTime.getHours();

    if (currentHour > minHour) return false;
    if (currentHour === minHour) return minute < minTime.getMinutes();
    return true;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "MM/dd/yyyy HH:mm")
                      ) : (
                        <span>MM/DD/YYYY HH:mm</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="sm:flex">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={handleDateSelect}
                      fromDate={new Date()}
                      initialFocus
                    />
                    <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                      <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex sm:flex-col p-2">
                          {Array.from({ length: 24 }, (_, i) => i)
                            .reverse()
                            .map((hour) => (
                              <Button
                                key={hour}
                                size="icon"
                                variant={
                                  field.value && field.value.getHours() === hour
                                    ? "default"
                                    : "ghost"
                                }
                                className={cn(
                                  "sm:w-full shrink-0 aspect-square",
                                  isHourDisabled(hour) &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() =>
                                  !isHourDisabled(hour) &&
                                  handleTimeChange("hour", hour.toString())
                                }
                                disabled={isHourDisabled(hour)}
                              >
                                {hour}
                              </Button>
                            ))}
                        </div>
                        <ScrollBar
                          orientation="horizontal"
                          className="sm:hidden"
                        />
                      </ScrollArea>
                      <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex sm:flex-col p-2">
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(
                            (minute) => (
                              <Button
                                key={minute}
                                size="icon"
                                variant={
                                  field.value &&
                                  field.value.getMinutes() === minute
                                    ? "default"
                                    : "ghost"
                                }
                                className={cn(
                                  "sm:w-full shrink-0 aspect-square",
                                  isMinuteDisabled(minute) &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() =>
                                  !isMinuteDisabled(minute) &&
                                  handleTimeChange("minute", minute.toString())
                                }
                                disabled={isMinuteDisabled(minute)}
                              >
                                {minute.toString().padStart(2, "0")}
                              </Button>
                            )
                          )}
                        </div>
                        <ScrollBar
                          orientation="horizontal"
                          className="sm:hidden"
                        />
                      </ScrollArea>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
