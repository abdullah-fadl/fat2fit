-- AlterTable
ALTER TABLE "clients" ADD COLUMN "odooPartnerId" INTEGER;
ALTER TABLE "clients" ADD COLUMN "odooSyncedAt" DATETIME;
ALTER TABLE "clients" ADD COLUMN "odooSyncStatus" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "odooInvoiceId" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "odooSyncedAt" DATETIME;
ALTER TABLE "invoices" ADD COLUMN "odooSyncStatus" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "odooPaymentId" INTEGER;
ALTER TABLE "payments" ADD COLUMN "odooSyncedAt" DATETIME;
ALTER TABLE "payments" ADD COLUMN "odooSyncStatus" TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX "clients_odooPartnerId_key" ON "clients"("odooPartnerId");
CREATE UNIQUE INDEX "invoices_odooInvoiceId_key" ON "invoices"("odooInvoiceId");
CREATE UNIQUE INDEX "payments_odooPaymentId_key" ON "payments"("odooPaymentId");

-- CreateTable
CREATE TABLE "odoo_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "syncClients" BOOLEAN NOT NULL DEFAULT true,
    "syncInvoices" BOOLEAN NOT NULL DEFAULT true,
    "syncPayments" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    UNIQUE("url", "database", "username")
);







