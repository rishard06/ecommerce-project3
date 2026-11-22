-- Add guest order contact for Ticket #14 order emails.
-- Guests opt in explicitly at checkout (unchecked by default in the UI). The
-- address is stored only with the flag set and is used only for order emails
-- (confirmation, refund, return decisions). PII minimal: order summary only,
-- never payment details.
ALTER TABLE "Order" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "guestEmailOptIn" BOOLEAN NOT NULL DEFAULT false;
