import { Router } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const ADMIN_WALLET = process.env.ADMIN_USDT_WALLET ?? "";
const REQUIRED_USDT = 5; // price in USDT
const PRODUCT_ID = "excel_addin_pro";

function generateLicenseKey(): string {
  return "BSA-" + crypto.randomBytes(12).toString("hex").toUpperCase();
}

/** GET /api/payments/config — return the admin wallet + price for the add-in */
router.get("/payments/config", async (_req, res): Promise<void> => {
  if (!ADMIN_WALLET) {
    res.status(503).json({ error: "Payment not configured" });
    return;
  }
  res.json({ address: ADMIN_WALLET, network: "TRC-20 (Tron)", price: REQUIRED_USDT });
});

/** POST /api/payments/verify — check TX on Trongrid, record & return license key */
router.post("/payments/verify", async (req, res): Promise<void> => {
  const { txHash, productId } = req.body as { txHash?: string; productId?: string };

  if (!txHash || typeof txHash !== "string") {
    res.status(400).json({ error: "txHash is required" });
    return;
  }
  if (!ADMIN_WALLET) {
    res.status(503).json({ error: "Payment not configured on server" });
    return;
  }

  // Check if this TX was already verified
  const existing = await db.select().from(paymentsTable).where(eq(paymentsTable.txHash, txHash));
  if (existing.length > 0 && existing[0].verified) {
    res.json({ licenseKey: existing[0].licenseKey, alreadyVerified: true });
    return;
  }

  // Verify on Trongrid public API (no API key needed for basic queries)
  let txData: TrongridTx | null = null;
  try {
    const tronResp = await fetch(
      `https://api.trongrid.io/v1/transactions/${txHash}`,
      { headers: { "Accept": "application/json" } }
    );
    if (tronResp.ok) {
      const json = await tronResp.json() as { data?: TrongridTx[] };
      txData = json.data?.[0] ?? null;
    }
  } catch {
    // network issue — we'll fall through and reject
  }

  if (!txData) {
    res.status(400).json({ error: "Transaction not found on Tron network. It may still be pending — wait a minute and try again." });
    return;
  }

  // Parse TRC-20 USDT transfer
  const contract = txData.raw_data?.contract?.[0];
  const contractType = contract?.type;

  if (contractType !== "TriggerSmartContract") {
    res.status(400).json({ error: "Transaction is not a TRC-20 token transfer." });
    return;
  }

  // Decode the transfer: Trongrid exposes token_info + to/from in trc20 transfers
  // For TriggerSmartContract we get the log from the receipt
  const trc20Transfers = txData.trc20_transfers ?? [];
  const usdtTransfer = trc20Transfers.find(
    (t) =>
      t.to?.toLowerCase() === ADMIN_WALLET.toLowerCase() &&
      (t.symbol === "USDT" || t.token_id === "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")
  );

  if (!usdtTransfer) {
    // Also accept native TRX transfers labelled as USDT for testing
    res.status(400).json({
      error: `No USDT transfer to the admin wallet found in this transaction. Make sure you sent to: ${ADMIN_WALLET}`,
    });
    return;
  }

  const decimals = 6; // USDT TRC-20 has 6 decimals
  const amountRaw = BigInt(usdtTransfer.value ?? "0");
  const amountUsdt = Number(amountRaw) / Math.pow(10, decimals);

  if (amountUsdt < REQUIRED_USDT) {
    res.status(400).json({
      error: `Payment amount too low. Required: $${REQUIRED_USDT} USDT, received: $${amountUsdt.toFixed(2)} USDT.`,
    });
    return;
  }

  const licenseKey = generateLicenseKey();

  await db.insert(paymentsTable).values({
    txHash,
    network: "trc20",
    amountUsdt: amountUsdt.toFixed(6),
    walletFrom: usdtTransfer.from ?? null,
    walletTo: ADMIN_WALLET,
    licenseKey,
    productId: productId ?? PRODUCT_ID,
    verified: true,
    verifiedAt: new Date(),
  }).onConflictDoNothing();

  res.json({ licenseKey, amountUsdt, message: "Payment verified! Your license key is ready." });
});

/** GET /api/payments/check/:key — validate a stored license key */
router.get("/payments/check/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.licenseKey, key));
  if (rows.length > 0 && rows[0].verified) {
    res.json({ valid: true, productId: rows[0].productId });
    return;
  }
  res.json({ valid: false });
});

// --- types ---
interface TrongridTx {
  txID?: string;
  raw_data?: {
    contract?: Array<{ type: string; parameter?: unknown }>;
  };
  trc20_transfers?: Array<{
    from?: string;
    to?: string;
    value?: string;
    symbol?: string;
    token_id?: string;
  }>;
}

export default router;
