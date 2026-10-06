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
  data: Array<Record<string, string | number | null>>
  xAxisKey: string
  series: TrendChartSeries[]
  className?: string
  emptyMessage?: string
  tickFormatter?: (value: string | number) => string
  showChangePercent?: boolean
}

function formatChangePercent(changePercent: unknown) {
  if (typeof changePercent !== "number" || !Number.isFinite(changePercent)) {
    return "—"
  }

  const sign = changePercent > 0 ? "+" : ""
  return `${sign}${changePercent.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}%`
}

export function TrendChart({
  config,
  data,
  xAxisKey,
  series,
  className,
  emptyMessage = "No data yet",
  tickFormatter,
  showChangePercent = false,
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
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={
                showChangePercent
                  ? (value, name, item) => {
                      const label =
                        config[String(name)]?.label ?? String(name)
                      const formattedValue =
                        typeof value === "number"
                          ? value.toLocaleString()
                          : String(value ?? "—")
                      const changeLabel = formatChangePercent(
                        item.payload?.changePercent
                      )

                      return (
                        <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formattedValue} · {changeLabel}
                          </span>
                        </div>
                      )
                    }
                  : undefined
              }
            />
          }
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
