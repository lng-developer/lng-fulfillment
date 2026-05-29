-- Additive order lifecycle values for direct YunExpress shipping workflow.
-- Do not remove legacy values; existing data and older code paths remain readable.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'FULFILLED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
