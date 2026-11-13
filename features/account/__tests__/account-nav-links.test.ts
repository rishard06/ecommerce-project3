import { describe, expect, it } from "vitest";
import {
  ACCOUNT_NAV_LINKS,
  isAccountNavLinkActive,
} from "../components/account-nav-links";

describe("account navigation", () => {
  it("exposes every account destination", () => {
    expect(ACCOUNT_NAV_LINKS.map((link) => link.href)).toEqual([
      "/account",
      "/account/orders",
      "/account/addresses",
      "/account/profile",
      "/account/settings",
    ]);
  });

  it("activates the overview only on its exact route", () => {
    expect(isAccountNavLinkActive("/account", "/account")).toBe(true);
    expect(isAccountNavLinkActive("/account/orders", "/account")).toBe(false);
    expect(isAccountNavLinkActive("/account/settings", "/account")).toBe(false);
  });

  it("keeps a section active on its nested routes", () => {
    expect(isAccountNavLinkActive("/account/orders", "/account/orders")).toBe(
      true,
    );
    expect(
      isAccountNavLinkActive("/account/orders/order_123", "/account/orders"),
    ).toBe(true);
    expect(
      isAccountNavLinkActive("/account/addresses/address_1", "/account/addresses"),
    ).toBe(true);
  });

  it("does not treat a prefix match as the same section", () => {
    expect(
      isAccountNavLinkActive("/account/orders-archive", "/account/orders"),
    ).toBe(false);
    expect(isAccountNavLinkActive("/products", "/account/orders")).toBe(false);
  });
});
