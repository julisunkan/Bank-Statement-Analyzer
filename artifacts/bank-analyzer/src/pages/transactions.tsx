import { useState } from "react";
import { useListTransactions, useUpdateTransaction, useBulkCategorize, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Wand2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { exportToExcel } from "@/lib/export-xlsx";

export default function Transactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data: page, isLoading } = useListTransactions(
    { search: debouncedSearch || undefined, limit: 100 },
    { query: { queryKey: ["transactions", debouncedSearch] } }
  );

  const bulkCat = useBulkCategorize();

  const handleBulkCategorize = () => {
    bulkCat.mutate({ data: {} }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        toast({ title: `Categorized ${res.updated} transactions` });
      }
    });
  };

  const handleExport = () => {
    if (!page?.transactions?.length) return;

    const rows = page.transactions.map((tx) => ({
      Date: format(new Date(tx.date), "yyyy-MM-dd"),
      Description: tx.description ?? "",
      Merchant: tx.merchant ?? "",
      Category: tx.categoryName ?? "Uncategorized",
      Type: tx.type === "credit" ? "Credit" : "Debit",
      Amount: tx.type === "credit"
        ? `+${tx.amount.toFixed(2)}`
        : `-${tx.amount.toFixed(2)}`,
    }));

    const dateStr = format(new Date(), "yyyy-MM-dd");
    exportToExcel(rows, `transactions-${dateStr}.csv`);
    toast({ title: `Exported ${rows.length} transactions to Excel` });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View and categorize your transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={isLoading || !page?.transactions?.length}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={handleBulkCategorize} disabled={bulkCat.isPending} variant="secondary">
            <Wand2 className="w-4 h-4 mr-2" />
            {bulkCat.isPending ? "Categorizing..." : "Auto-Categorize"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : page?.transactions && page.transactions.length > 0 ? (
                  page.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tx.description}</div>
                        {tx.merchant && <div className="text-xs text-muted-foreground">{tx.merchant}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/50">
                          {tx.categoryName || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'credit' ? 'text-emerald-600' : 'text-foreground'}`}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
