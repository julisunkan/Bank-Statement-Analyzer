import { useGetMerchantInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function Merchants() {
  const { data: merchants, isLoading } = useGetMerchantInsights({ limit: 50 }, { query: { queryKey: ["merchants"] } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchant Intelligence</h1>
        <p className="text-muted-foreground">Analysis of your top spending destinations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Merchant</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg. Transaction</TableHead>
                  <TableHead className="text-right pr-6">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : merchants && merchants.length > 0 ? (
                  merchants.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6 font-medium">{m.merchant}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ${m.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{m.transactionCount}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${m.averageSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-muted-foreground">
                        {m.lastTransaction ? format(new Date(m.lastTransaction), "MMM d, yyyy") : "Unknown"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No merchant data available.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
