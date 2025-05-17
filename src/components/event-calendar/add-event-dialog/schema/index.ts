import * as z from "zod";
import { SocialPlatform } from "@prisma/client";

export const eventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.date().optional(),
  startTime: z
    .object({
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
    })
    .optional(),
  endDate: z.date().optional(),
  endTime: z
    .object({
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
    })
    .optional(),
  location: z.string().optional(),
  allDay: z.boolean().optional().default(false),
  color: z
    .enum(["blue", "violet", "rose", "emerald", "orange"])
    .optional()
    .default("blue"),
  selectedPlatforms: z.array(z.nativeEnum(SocialPlatform)).optional(),
});

export type EventFormValues = z.infer<typeof eventSchema>;
