-- Replace the application-generated `code` with a DB sequence `number`.
-- The human-readable PO code (PO-#####) is derived from `number` in the service.
ALTER TABLE "purchase_orders" DROP COLUMN "code";
ALTER TABLE "purchase_orders" ADD COLUMN "number" SERIAL NOT NULL;
CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("number");
