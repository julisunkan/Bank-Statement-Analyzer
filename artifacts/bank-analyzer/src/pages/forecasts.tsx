import { useState } from "react";
import { useGetForecast } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

export default function Forecasts() {
  const [horizon, setHorizon] = useState<number>(90);
  const { data: forecast, isLoading } = useGetForecast(
    { horizon },
    { query: { queryKey: ["forecast", horizon] } }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashflow Forecast</h1>
          <p className="text-muted-foreground">AI-driven projections based on historical spending</p>
        </div>
        <div className="flex bg-muted rounded-md p-1">
          {[30, 90, 180, 365].map(days => (
            <Button
              key={days}
              variant={horizon === days ? "secondary" : "ghost"}
              size="sm"
              className={horizon === days ? "shadow-sm bg-background" : ""}
              onClick={() => setHorizon(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected Balance</CardTitle>
          <CardDescription>Estimated daily closing balance for the next {horizon} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Generating forecast...</div>
            ) : forecast && forecast.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), "MMM d")}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Balance"]}
                    labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projectedBalance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                Not enough historical data to generate forecast
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
