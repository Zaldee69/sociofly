"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { HTMLAttributes, ReactElement, JSXElementConstructor } from "react";
import { TooltipProps } from "recharts";
import { cn } from "@/lib/utils";


// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export interface ChartConfig {
  [key: string]: {
    label: string;
    theme?: {
      light: string;
      dark: string;
    };
    color?: string;
  };
}

interface ChartStyleProps {
  id: string;
  config: ChartConfig;
}

interface ChartContainerProps extends HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: ReactElement<unknown, string | JSXElementConstructor<any>>;
}

interface ChartTooltipContentProps extends TooltipProps<any, any> {
  className?: string;
}

interface ChartLegendContentProps {
  className?: string;
  payload?: Array<{
    value: string;
    color: string;
    payload: {
      name: string;
    };
  }>;
}

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

export const ChartContainer = ({
  children,
  config = {},
  className,
  ...props
}: ChartContainerProps) => {
  // Ensure config is never null/undefined
  const safeConfig = config || {};

  return (
    <ChartContext.Provider value={{ config: safeConfig }}>
      <div className={cn("relative", className)} {...props}>
        <ChartStyle id="chart-theme" config={safeConfig} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

const ChartStyle = React.memo(({ id, config }: ChartStyleProps) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure config is never null/undefined
  const safeConfig = config || {};

  const colorConfig = Object.entries(safeConfig).filter(
    ([, itemConfig]) => itemConfig?.theme || itemConfig?.color
  );

  if (!colorConfig.length) return null;

  // Only render styles on the client side
  if (!mounted) return null;

  const styles = colorConfig
    .map(([key, itemConfig]) => {
      if (itemConfig?.theme) {
        return `
          [data-theme='light'] {
            --color-${key}: ${itemConfig.theme.light};
          }
          [data-theme='dark'] {
            --color-${key}: ${itemConfig.theme.dark};
          }
        `;
      }
      if (itemConfig?.color) {
        return `
          :root {
            --color-${key}: ${itemConfig.color};
          }
        `;
      }
      return "";
    })
    .join("\n");

  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{
        __html: styles,
      }}
    />
  );
});

ChartStyle.displayName = "ChartStyle";

export const ChartTooltip = ({ children, className, ...props }: any) => {
  return (
    <div
      className={cn("rounded-lg border bg-background p-2 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const ChartTooltipContent = ({
  active,
  payload,
  label,
  className,
  ...props
}: ChartTooltipContentProps) => {
  if (!active || !payload) {
    return null;
  }

  return (
    <ChartTooltip className={className} {...props}>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div className="grid gap-1">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
};

export const ChartLegend = ({ children, className, ...props }: any) => {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const ChartLegendContent = ({
  payload,
  className,
}: ChartLegendContentProps) => {
  if (!payload) {
    return null;
  }

  return (
    <ChartLegend className={className}>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <div className="text-sm font-medium">{entry.payload.name}</div>
        </div>
      ))}
    </ChartLegend>
  );
};

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}
