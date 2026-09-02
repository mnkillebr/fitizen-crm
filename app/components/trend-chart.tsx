import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import { cn } from "~/lib/utils"

export type { ChartConfig }

export type TrendChartSeries = {
  dataKey: string
  type?: "natural" | "linear" | "step" | "monotone"
  strokeWidth?: number
  showDots?: boolean
}

export type TrendChartProps = {
  config: ChartConfig
  data: Array<Record<string, string | number>>
  xAxisKey: string
  series: TrendChartSeries[]
  className?: string
  emptyMessage?: string
  tickFormatter?: (value: string | number) => string
}

export function TrendChart({
  config,
  data,
  xAxisKey,
  series,
  className,
  emptyMessage = "No data yet",
  tickFormatter,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-md border border-dashed",
          "bg-background/60 text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-40 w-full", className)}
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={tickFormatter}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        {series.map((item) => (
          <Line
            key={item.dataKey}
            dataKey={item.dataKey}
            type={item.type ?? "natural"}
            stroke={`var(--color-${item.dataKey})`}
            strokeWidth={item.strokeWidth ?? 2}
            dot={
              item.showDots
                ? {
                    fill: `var(--color-${item.dataKey})`,
                  }
                : false
            }
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
