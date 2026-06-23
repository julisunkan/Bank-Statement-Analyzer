import { useGetAnalyticsSummary, useGetSpendingByCategory, useListDetectedSubscriptions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary({ query: { queryKey: ["analytics"] } });
  const { data: spending, isLoading: isLoadingSpending } = useGetSpendingByCategory({ query: { queryKey: ["spending"] } });
  const { data: subscriptions, isLoading: isLoadingSubs } = useListDetectedSubscriptions({ query: { queryKey: ["subscriptions"] } });

  if (isLoadingSummary) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <div className="text-sm text-muted-foreground font-medium">
          {summary?.month || "Current Month"}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${summary?.totalIncome?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${summary?.totalExpenses?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${summary?.netSavings?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? '0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">{(summary?.savingsRate ?? 0).toFixed(1)}% savings rate</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-foreground">{summary?.healthScore ?? '0'}</div>
              <div className="text-sm font-medium text-muted-foreground">/ 100</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cashflow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 border border-dashed rounded-md text-muted-foreground text-sm">
              [Area Chart Visualization]
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSpending ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : spending && spending.length > 0 ? (
              <div className="space-y-4">
                {spending.slice(0, 5).map((cat) => (
                  <div key={cat.categoryId ?? 'un'} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                      <span className="font-medium text-sm">{cat.categoryName}</span>
                    </div>
                    <div className="text-sm font-semibold">${cat.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No spending data available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSubs ? (
             <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : subscriptions && subscriptions.length > 0 ? (
            <div className="divide-y border rounded-md">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{sub.merchant}</div>
                    <div className="text-xs text-muted-foreground capitalize">{sub.frequency}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${sub.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <Badge variant="outline" className="mt-1 font-mono text-[10px] uppercase">
                      Next: {sub.nextExpected ? new Date(sub.nextExpected).toLocaleDateString() : 'Unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">No subscriptions detected.</div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
