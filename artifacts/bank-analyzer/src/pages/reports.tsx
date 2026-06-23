import { useState } from "react";
import { useListReports, useGenerateReport, useDeleteReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileBarChart, Trash2, Plus, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: reports, isLoading } = useListReports({ query: { queryKey: ["reports"] } });
  
  const generate = useGenerateReport();
  const del = useDeleteReport();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [type, setType] = useState<"monthly"|"annual"|"tax"|"business"|"executive">("monthly");
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [title, setTitle] = useState("");

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generate.mutate({ data: { type, period, title: title || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        setIsGenerateOpen(false);
        toast({ title: "Report generation started" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this report?")) {
      del.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
          toast({ title: "Report deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive financial summaries</p>
        </div>
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Generate Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Summary</SelectItem>
                    <SelectItem value="annual">Annual Summary</SelectItem>
                    <SelectItem value="tax">Tax Prep</SelectItem>
                    <SelectItem value="business">Business Expense</SelectItem>
                    <SelectItem value="executive">Executive Overview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Period (YYYY-MM or YYYY)</label>
                <input 
                  type="text" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={period} 
                  onChange={e => setPeriod(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title (Optional)</label>
                <input 
                  type="text" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Custom title"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={generate.isPending}>
                  {generate.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading...</div>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-start gap-2">
                  <span className="line-clamp-2">{report.title}</span>
                  <FileBarChart className="w-5 h-5 text-primary shrink-0" />
                </CardTitle>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-1">
                  <span className="bg-muted px-2 py-0.5 rounded-full">{report.type}</span>
                  <span>•</span>
                  <span>{report.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4 text-sm text-muted-foreground">
                {report.summary || "No summary available."}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Download JSON">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)} title="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-lg bg-muted/10">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No reports generated</h3>
            <p className="text-muted-foreground text-sm mt-1">Click the button above to generate your first financial report.</p>
          </div>
        )}
      </div>
    </div>
  );
}
