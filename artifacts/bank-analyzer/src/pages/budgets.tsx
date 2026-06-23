import { useListBudgets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Budgets() {
  const { data: budgets, isLoading } = useListBudgets({ query: { queryKey: ["budgets"] } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Track your spending limits</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Budget</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading...</div>
        ) : budgets && budgets.length > 0 ? (
          budgets.map((budget) => (
            <Card key={budget.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{budget.categoryName}</span>
                  <span className="text-sm font-normal text-muted-foreground capitalize">{budget.period}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex justify-between items-end">
                  <div className="text-2xl font-bold">${budget.spent.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">of ${budget.amount.toFixed(2)}</div>
                </div>
                <Progress value={budget.percentUsed || 0} className="h-2 mb-2" />
                <div className="text-xs text-muted-foreground text-right">
                  ${budget.remaining.toFixed(2)} remaining
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            No budgets created yet.
          </div>
        )}
      </div>
    </div>
  );
}
