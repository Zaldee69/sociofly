import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface SocialAccountOption {
  label: string;
  value: string;
  profile_picture_url?: string;
  group?: boolean;
  children?: SocialAccountOption[];
}

interface SocialAccountSelectProps {
  options: SocialAccountOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SocialAccountSelect({
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = "Select social accounts...",
  disabled = false,
}: SocialAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    value || defaultValue
  );

  // Update selected values when value prop changes (controlled mode)
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(value);
    }
  }, [value]);

  // Update selected values when defaultValue changes (for edit mode in uncontrolled mode)
  useEffect(() => {
    if (value === undefined) {
      setSelectedValues(defaultValue);
    }
  }, [defaultValue, value]);

  // Get all available options including children from groups
  const getAllOptions = () => {
    const allOptions: SocialAccountOption[] = [];
    options.forEach((option) => {
      if (option.group && option.children) {
        allOptions.push(...option.children);
      } else {
        allOptions.push(option);
      }
    });
    return allOptions;
  };

  const allOptions = getAllOptions();

  // Find option by value
  const findOptionByValue = (value: string) => {
    return allOptions.find((option) => option.value === value);
  };

  const handleSelect = (selectValue: string) => {
    const newSelectedValues = selectedValues.includes(selectValue)
      ? selectedValues.filter((v) => v !== selectValue)
      : [...selectedValues, selectValue];

    // Only update internal state if not controlled
    if (value === undefined) {
      setSelectedValues(newSelectedValues);
    }
    onChange?.(newSelectedValues);
  };

  const clearAll = () => {
    const newSelectedValues: string[] = [];

    // Only update internal state if not controlled
    if (value === undefined) {
      setSelectedValues(newSelectedValues);
    }
    onChange?.(newSelectedValues);
  };

  const selectedLabels = selectedValues.map((value) => {
    const option = findOptionByValue(value);
    return option?.label || value;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${selectedValues.length > 0 ? "h-auto min-h-10" : "h-10"}`}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedValues.length > 0 ? (
              selectedValues.map((value) => {
                const option = findOptionByValue(value);
                return option ? (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="mr-1 mb-1 flex items-center gap-1 pl-1"
                  >
                    {option.profile_picture_url && (
                      <Avatar className="h-4 w-4 mr-1">
                        <img
                          src={option.profile_picture_url}
                          alt={option.label}
                        />
                      </Avatar>
                    )}
                    {option.label}
                  </Badge>
                ) : null;
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search social accounts..." />
          <CommandList>
            <CommandEmpty>No social accounts found.</CommandEmpty>
            {selectedValues.length > 0 && (
              <>
                <div className="flex items-center justify-between p-2">
                  <p className="text-sm text-muted-foreground">
                    Selected ({selectedValues.length})
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      clearAll();
                    }}
                  >
                    Clear all
                  </Button>
                </div>
                <CommandSeparator />
              </>
            )}
            {options.map((option) => {
              if (option.group && option.children) {
                return (
                  <CommandGroup key={option.value} heading={option.label}>
                    {option.children.map((child) => {
                      const isSelected = selectedValues.includes(child.value);
                      return (
                        <CommandItem
                          key={child.value}
                          value={child.value}
                          onSelect={() => handleSelect(child.value)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {child.profile_picture_url && (
                              <Avatar className="h-6 w-6">
                                <img
                                  src={child.profile_picture_url}
                                  alt={child.label}
                                />
                              </Avatar>
                            )}
                            <span>{child.label}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              }
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedValues.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
