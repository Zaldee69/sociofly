# Scheduling Feature

This directory contains all code related to the scheduling functionality of the application.

## Structure

```
scheduling/
├── components/    # Scheduling UI components
├── hooks/         # Scheduling related hooks
├── api/           # Scheduling API routes
└── utils/         # Scheduling utility functions
```

## Components

Scheduling related components include:

- `BigCalendar` - Main calendar component
- `EventForm` - Form for creating/editing events
- `EventDetails` - Event details view
- `ScheduleSelector` - Component for selecting time slots

## Hooks

Hooks for scheduling:

- `useCalendar` - Access calendar data and operations
- `useEvents` - Fetch and manage events
- `useSchedule` - Schedule management operations

## Utils

Scheduling utility functions:

- Date and time calculations
- Scheduling conflict detection
- Recurring event generators
- Calendar view helpers

## API

API routes for scheduling:

- Event creation/modification
- Schedule management
- Availability checking
- Calendar synchronization

## Usage

Example of using scheduling components:

```tsx
import { BigCalendar } from "~/features/scheduling/components/BigCalendar";
import { useEvents } from "~/features/scheduling/hooks/useEvents";

export default function SchedulePage() {
  const { events, isLoading, createEvent, updateEvent, deleteEvent } =
    useEvents();

  const handleSelectSlot = (slotInfo) => {
    // Create a new event
    createEvent({
      start: slotInfo.start,
      end: slotInfo.end,
      title: "New Event",
    });
  };

  const handleSelectEvent = (event) => {
    // Show event details or edit form
    console.log("Event selected:", event);
  };

  return (
    <div className="schedule-page">
      <h1>Schedule</h1>

      {isLoading ? (
        <p>Loading calendar...</p>
      ) : (
        <BigCalendar
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      )}
    </div>
  );
}
```
