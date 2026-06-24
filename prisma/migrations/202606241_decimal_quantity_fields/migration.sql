-- Opportunity.quantity and MarketAsset.quantity represent fractional
-- measurements (MW, km, etc.), not unit counts, so they must support decimals.
ALTER TABLE "Opportunity" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,4) USING "quantity"::DECIMAL(18,4);
ALTER TABLE "Opportunity" ALTER COLUMN "quantity" SET DEFAULT 1;

ALTER TABLE "MarketAsset" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,4) USING "quantity"::DECIMAL(18,4);
ALTER TABLE "MarketAsset" ALTER COLUMN "quantity" SET DEFAULT 1;
