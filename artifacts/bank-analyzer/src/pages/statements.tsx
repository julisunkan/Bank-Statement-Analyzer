import { useState } from "react";
import { useListStatements, useUploadStatement, useDeleteStatement, getListStatementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Statements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: statements, isLoading } = useListStatements({ query: { queryKey: ["statements"] } });
  const upload = useUploadStatement();
  const deleteStmt = useDeleteStatement();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvData, setCsvData] = useState("");

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic CSV parsing mock
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) throw new Error("Need at least header and one row");
      
      const transactions = lines.slice(1).map(line => {
        const [date, description, amount, type] = line.split(',');
        return {
          date: date?.trim() || new Date().toISOString().split('T')[0],
          description: description?.trim() || "Unknown",
          amount: parseFloat(amount?.trim() || "0"),
          type: (type?.trim().toLowerCase() === "credit" ? "credit" : "debit") as "credit" | "debit"
        };
      });

      upload.mutate({ data: { bankName, fileName, transactions } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey() });
          setIsUploadOpen(false);
          setBankName("");
          setFileName("");
          setCsvData("");
          toast({ title: "Statement uploaded successfully" });
        },
        onError: () => {
          toast({ title: "Failed to upload statement", variant: "destructive" });
        }
      });
    } catch (err) {
      toast({ title: "Invalid CSV format. Use: Date,Description,Amount,Type", variant: "destructive" });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this statement?")) {
      deleteStmt.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey() });
          toast({ title: "Statement deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statements</h1>
          <p className="text-muted-foreground">Manage your uploaded bank statements</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="w-4 h-4 mr-2" /> Upload Statement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Statement</DialogTitle>
              <DialogDescription>Paste your bank statement CSV data here.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Chase" required />
              </div>
              <div className="space-y-2">
                <Label>File Name (Optional)</Label>
                <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g. Chase_Oct2023.csv" />
              </div>
              <div className="space-y-2">
                <Label>CSV Data (Date, Description, Amount, Type)</Label>
                <Textarea 
                  value={csvData} 
                  onChange={e => setCsvData(e.target.value)} 
                  placeholder="2023-10-01,Groceries,45.50,debit&#10;2023-10-02,Salary,2500,credit" 
                  rows={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={upload.isPending}>
                  {upload.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Statements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading statements...</div>
          ) : statements && statements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Debits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((stmt) => (
                  <TableRow key={stmt.id}>
                    <TableCell className="font-medium">{stmt.bankName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {stmt.fileName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {stmt.startDate ? format(new Date(stmt.startDate), "MMM d") : "?"} - 
                      {stmt.endDate ? format(new Date(stmt.endDate), "MMM d, yyyy") : "?"}
                    </TableCell>
                    <TableCell className="text-right">{stmt.transactionCount}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">${stmt.totalCredits.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">${stmt.totalDebits.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={stmt.status === 'ready' ? "default" : "secondary"}>
                        {stmt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(stmt.id)} disabled={deleteStmt.isPending}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No statements</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload your first bank statement to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
