import { useState, useCallback } from "react";
import {
  detectColumns,
  readTransactions,
  highlightTransactions,
  createSummarySheet,
  fmt,
  type ColumnMap,
} from "./lib/excel";
import { buildSummary, type Summary, type Transaction } from "./lib/categorizer";

declare const Excel: typeof import("@microsoft/office-js").Excel;
declare const Office: typeof import("@microsoft/office-js");

type Step = "idle" | "loading" | "results" | "error";

const isOfficeAvailable = () =>
  typeof Office !== "undefined" && typeof Excel !== "undefined";

function runExcel<T>(fn: (context: Excel.RequestContext) => Promise<T>): Promise<T> {
  if (!isOfficeAvailable()) {
    return Promise.reject(new Error("Office.js not available — open this add-in inside Excel."));
  }
  return Excel.run(fn);
}

export default function App() {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [highlighting, setHighlighting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "transactions">("overview");

  const analyze = useCallback(async () => {
    setStep("loading");
    setError("");
    setSummary(null);
    setExportDone(false);
    try {
      const txns: Transaction[] = await runExcel(async (ctx) => {
        const sheet = ctx.workbook.worksheets.getActiveWorksheet();
        sheet.load("name");
        await ctx.sync();

        const columnMap: ColumnMap | null = await detectColumns(sheet);
        if (!columnMap) {
          throw new Error(
            "Could not find required columns (Date, Description, Amount) in the active sheet.\n" +
            "Make sure row 1 has column headers."
          );
        }
        return await readTransactions(sheet, columnMap);
      });

      if (txns.length === 0) {
        throw new Error("No transactions found. Check that the sheet has data rows below the header.");
      }

      setSummary(buildSummary(txns));
      setStep("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }, []);

  const highlight = useCallback(async () => {
    if (!summary) return;
    setHighlighting(true);
    try {
      await runExcel(async (ctx) => {
        const sheet = ctx.workbook.worksheets.getActiveWorksheet();
        const columnMap = await detectColumns(sheet);
        if (columnMap) {
          await highlightTransactions(sheet, summary.transactions, columnMap);
        }
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setHighlighting(false);
    }
  }, [summary]);

  const exportSheet = useCallback(async () => {
    if (!summary) return;
    setExporting(true);
    try {
      await runExcel(async (ctx) => {
        await createSummarySheet(summary, ctx);
      });
      setExportDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }, [summary]);

  const reset = () => {
    setStep("idle");
    setSummary(null);
    setError("");
    setExportDone(false);
    setActiveTab("overview");
  };

  const topCategories = summary
    ? Object.entries(summary.byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6)
    : [];

  const maxCatTotal = topCategories.length > 0 ? topCategories[0][1].total : 1;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white shadow-sm shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-primary">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <path d="M8 7h8M8 11h8M8 15h5" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-sm leading-none text-foreground">Bank Statement Analyzer</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Excel Add-in</div>
        </div>
        {step === "results" && (
          <button
            onClick={reset}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
          >
            ← Reset
          </button>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* IDLE */}
        {step === "idle" && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h2 className="text-base font-semibold mb-1">Analyze Your Bank Statement</h2>
            <p className="text-xs text-muted-foreground mb-6 max-w-[220px]">
              Open your bank statement sheet, then click Analyze to auto-categorize transactions and generate insights.
            </p>

            <button
              onClick={analyze}
              className="w-full max-w-[220px] bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-md hover:bg-primary/90 transition-colors"
            >
              Analyze Active Sheet
            </button>

            <div className="mt-6 w-full max-w-[240px] text-left space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Expected columns</p>
              {["Date", "Description / Narration", "Amount", "Type (optional: Dr/Cr)"].map((col) => (
                <div key={col} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {col}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Reading transactions…</p>
          </div>
        )}

        {/* ERROR */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-destructive mb-2">Analysis Failed</h3>
            <p className="text-xs text-muted-foreground mb-4 whitespace-pre-wrap">{error}</p>
            <button onClick={reset} className="text-xs bg-muted px-4 py-2 rounded-md hover:bg-muted/80 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* RESULTS */}
        {step === "results" && summary && (
          <div className="flex flex-col h-full">
            {/* Action buttons */}
            <div className="flex gap-2 px-3 pt-3 pb-2 shrink-0">
              <button
                onClick={highlight}
                disabled={highlighting}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-secondary text-secondary-foreground font-medium py-2 rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-60"
              >
                {highlighting ? (
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                )}
                Highlight Cells
              </button>
              <button
                onClick={exportSheet}
                disabled={exporting}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground font-medium py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {exporting ? (
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : exportDone ? (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Done
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Export Sheet
                  </>
                )}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {(["overview", "categories", "transactions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {activeTab === "overview" && (
                <>
                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCard label="Total Income" value={fmt(summary.totalIncome)} color="text-green-600" />
                    <KpiCard label="Total Expenses" value={fmt(summary.totalExpenses)} color="text-red-500" />
                    <KpiCard label="Net Savings" value={fmt(summary.net)} color={summary.net >= 0 ? "text-blue-600" : "text-red-500"} />
                    <KpiCard label="Savings Rate" value={`${summary.savingsRate}%`} color={summary.savingsRate >= 20 ? "text-green-600" : summary.savingsRate >= 10 ? "text-yellow-600" : "text-red-500"} />
                  </div>

                  {/* Health pill */}
                  <div className={`rounded-md px-3 py-2 text-xs font-medium ${summary.savingsRate >= 20 ? "bg-green-50 text-green-700" : summary.savingsRate >= 10 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                    {summary.savingsRate >= 20
                      ? "✅ Healthy savings rate — you're on track!"
                      : summary.savingsRate >= 10
                      ? "⚠️ Moderate savings. Try to cut non-essential spending."
                      : "🔴 Low savings rate. Review expenses carefully."}
                  </div>

                  {/* Top 3 categories */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Spending Categories</p>
                    {topCategories.slice(0, 3).map(([name, info]) => (
                      <div key={name} className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${info.className}`}>{name}</span>
                          <span className="text-xs font-semibold">{fmt(info.total)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(info.total / maxCatTotal) * 100}%`, backgroundColor: info.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-muted-foreground text-right">
                    {summary.transactions.length} transactions analyzed
                  </div>
                </>
              )}

              {activeTab === "categories" && (
                <div className="space-y-2">
                  {topCategories.map(([name, info]) => (
                    <div key={name} className="bg-white border border-border rounded-md p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${info.className}`}>{name}</span>
                        <span className="text-xs font-semibold">{fmt(info.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${(info.total / maxCatTotal) * 100}%`, backgroundColor: info.color }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{info.count} txn{info.count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-1.5">
                  {summary.transactions.map((tx, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 bg-white border border-border rounded-md p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{tx.date}</span>
                          <span className={`text-[10px] px-1 py-0.5 rounded ${tx.category.className}`}>{tx.category.name}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${tx.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                        {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground text-center shrink-0">
        Bank Statement Analyzer Pro
      </footer>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-border rounded-md p-2.5">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
