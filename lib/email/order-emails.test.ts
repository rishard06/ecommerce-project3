import { describe, expect, it } from "vitest";
import {
  guestOrderConfirmationHtml,
  guestOrderConfirmationSubject,
  refundIssuedHtml,
  refundIssuedSubject,
  returnApprovedHtml,
  returnApprovedSubject,
  returnRejectedHtml,
  returnRejectedSubject,
} from "./templates";

/**
 * Ticket #14 RED: copy + trigger-adjacent template tests for the four new
 * order emails. These must FAIL before the templates exist.
 *
 * Contract under test:
 * - subjects name the order (short id) and the event;
 * - bodies carry the order summary (items + total + ship-to city/country);
 * - bodies never carry payment details (no intent ids, card hints, provider
 *   internals);
 * - customer-controlled strings are HTML-escaped.
 */

const ORDER_ID = "12345678-aaaa-bbbb-cccc-dddddddddddd";

const BASE_ORDER = {
  id: ORDER_ID,
  totalCents: 4818,
  items: [
    { title: "Snapshot product", quantity: 2, lineTotalCents: 3998 },
    { title: "Shipping", quantity: 1, lineTotalCents: 820 },
  ],
  shipping: { fullName: "Jane Doe", city: "Springfield", country: "US" },
};

describe("guest order confirmation templates", () => {
  it("names the order in the subject", () => {
    expect(guestOrderConfirmationSubject(ORDER_ID)).toContain("12345678");
    expect(guestOrderConfirmationSubject(ORDER_ID)).toMatch(/confirm/i);
  });

  it("carries the order summary without payment details", () => {
    const html = guestOrderConfirmationHtml(BASE_ORDER);
    expect(html).toContain("Snapshot product");
    expect(html).toContain("$48.18");
    expect(html).toContain("Springfield");
    expect(html).not.toMatch(/pi_/i);
    expect(html).not.toMatch(/card/i);
    expect(html).not.toMatch(/stripe/i);
    expect(html).not.toMatch(/payment intent/i);
  });

  it("escapes customer-controlled strings", () => {
    const html = guestOrderConfirmationHtml({
      ...BASE_ORDER,
      items: [
        {
          title: '<script>alert("x")</script>',
          quantity: 1,
          lineTotalCents: 100,
        },
      ],
      shipping: { fullName: "<b>Jane</b>", city: "<i>Town</i>", country: "US" },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("refund issued templates", () => {
  it("names the order and the refund in the subject", () => {
    expect(refundIssuedSubject(ORDER_ID)).toContain("12345678");
    expect(refundIssuedSubject(ORDER_ID)).toMatch(/refund/i);
  });

  it("states the refunded amount with the order summary, no payment details", () => {
    const html = refundIssuedHtml(BASE_ORDER, 4818);
    expect(html).toContain("$48.18");
    expect(html).toContain("12345678");
    expect(html).toContain("Snapshot product");
    expect(html).not.toMatch(/pi_/i);
    expect(html).not.toMatch(/card/i);
    expect(html).not.toMatch(/stripe/i);
    expect(html).not.toMatch(/payment intent/i);
  });

  it("escapes item titles", () => {
    const html = refundIssuedHtml(
      {
        ...BASE_ORDER,
        items: [{ title: '"><img src=x>', quantity: 1, lineTotalCents: 100 }],
      },
      100,
    );
    expect(html).not.toContain('"><img src=x>');
  });
});

describe("return decision templates", () => {
  it("approve subject names the order and the approval", () => {
    expect(returnApprovedSubject(ORDER_ID)).toContain("12345678");
    expect(returnApprovedSubject(ORDER_ID)).toMatch(/approv/i);
  });

  it("approve body states the refund with the order summary, no payment details", () => {
    const html = returnApprovedHtml(BASE_ORDER, 4818, "Too small");
    expect(html).toContain("$48.18");
    expect(html).toContain("Too small");
    expect(html).toContain("Snapshot product");
    expect(html).not.toMatch(/pi_/i);
    expect(html).not.toMatch(/card/i);
    expect(html).not.toMatch(/stripe/i);
  });

  it("reject subject names the order and the decision", () => {
    expect(returnRejectedSubject(ORDER_ID)).toContain("12345678");
    expect(returnRejectedSubject(ORDER_ID)).toMatch(/return/i);
  });

  it("reject body confirms no refund was issued and escapes the reason", () => {
    const html = returnRejectedHtml(BASE_ORDER, '<b>worn</b> & "used"');
    expect(html).toMatch(/no refund/i);
    expect(html).not.toContain("<b>worn</b>");
    expect(html).toContain("&lt;b&gt;worn&lt;/b&gt;");
    expect(html).not.toMatch(/pi_/i);
    expect(html).not.toMatch(/card/i);
    expect(html).not.toMatch(/stripe/i);
  });
});
