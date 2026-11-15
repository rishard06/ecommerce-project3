-- Add REFUNDED to PaymentStatus so an admin Stripe refund is distinguishable
-- from an expired/abandoned hold (which stays CANCELLED). Follow-up to
-- 20261115000000; that migration is not edited.
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
