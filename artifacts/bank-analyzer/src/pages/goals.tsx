import { useListGoals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { format } from "date-fns";

export default function Goals() {
  const { data: goals, isLoading } = useListGoals({ query: { queryKey: ["goals"] } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground">Track your progress towards big purchases</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Goal</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading...</div>
        ) : goals && goals.length > 0 ? (
          goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span className="truncate">{goal.name}</span>
                  <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex justify-between items-end">
                  <div className="text-2xl font-bold">${goal.currentAmount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">/ ${goal.targetAmount.toLocaleString()}</div>
                </div>
                <Progress value={goal.progressPercent} className="h-2 mb-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.progressPercent.toFixed(0)}% Complete</span>
                  {goal.deadline && <span>By {format(new Date(goal.deadline), "MMM yyyy")}</span>}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            No goals created yet.
          </div>
        )}
      </div>
    </div>
  );
}
