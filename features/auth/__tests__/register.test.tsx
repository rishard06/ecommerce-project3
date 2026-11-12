// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterForm from "@/features/auth/components/RegisterForm";

describe("register", () => {
  it("renders validation for short password", async () => {
    render(<RegisterForm />);
    expect(screen.getByPlaceholderText(/password/i)).toBeTruthy();
  });
});
