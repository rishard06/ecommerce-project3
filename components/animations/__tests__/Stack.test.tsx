// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The real Stack, with only motion's rendering/gesture plumbing stubbed out:
 * `motion.div` becomes a plain div that records its props, so tests can drive
 * `onDragEnd` (which jsdom can never trigger through motion's real pointer
 * tracking) and assert on what OUR logic does with it.
 */
const seenDivProps: Record<string, any>[] = [];

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  const ReactMod = await import("react");
  const StubDiv = ReactMod.forwardRef(function StubDiv(
    { children, ...props }: { children?: React.ReactNode } & Record<string, any>,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) {
    const {
      animate: _animate,
      transition: _transition,
      initial: _initial,
      exit: _exit,
      variants: _variants,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      dragTransition: _dragTransition,
      dragMomentum: _dragMomentum,
      whileTap: _whileTap,
      whileDrag: _whileDrag,
      whileHover: _whileHover,
      layout: _layout,
      style: _style,
      ...domProps
    } = props;
    seenDivProps.push(props);
    return (
      <div ref={ref} {...domProps}>
        {children}
      </div>
    );
  });
  return { ...actual, motion: { ...actual.motion, div: StubDiv } };
});

import Stack from "../Stack";

afterEach(() => {
  cleanup();
  seenDivProps.length = 0;
});

function testCards() {
  return [0, 1, 2].map((index) => (
    <div key={index} data-testid={`card-${index}`}>
      Card {index}
    </div>
  ));
}

/** The draggable (top) card's div is the only one carrying onDragEnd. */
function topDragProps() {
  const withDrag = seenDivProps.filter((props) => props.onDragEnd);
  return withDrag[withDrag.length - 1];
}

function cardOrder(container: HTMLElement): (string | null)[] {
  return Array.from(
    container.querySelectorAll('[data-testid^="card-"]'),
  ).map((element) => element.getAttribute("data-testid"));
}

function dragTopPastThreshold() {
  act(() => {
    topDragProps().onDragEnd(
      {},
      { offset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } },
    );
  });
}

describe("Stack drag-then-click suppression", () => {
  it("sends the card back and suppresses the click that follows a real drag", () => {
    const onFirstInteract = vi.fn();
    const { container } = render(
      <Stack
        sensitivity={90}
        sendToBackOnClick
        onFirstInteract={onFirstInteract}
        renderTopCardLink={(content, cardIndex) => (
          <a href={`/products/card-${cardIndex}`} data-testid={`link-${cardIndex}`}>
            {content}
          </a>
        )}
        cards={testCards()}
      />,
    );

    expect(cardOrder(container)).toEqual(["card-0", "card-1", "card-2"]);
    dragTopPastThreshold();

    expect(onFirstInteract).toHaveBeenCalledTimes(1);
    // Top card (card-2) cycled to the back.
    expect(cardOrder(container)).toEqual(["card-2", "card-0", "card-1"]);

    // The mouseup click that ends the drag must not navigate…
    const newTopLink = container.querySelector(
      '[data-testid="link-1"]',
    ) as HTMLElement;
    expect(fireEvent.click(newTopLink)).toBe(false);
    // …nor cycle the deck a second time.
    expect(cardOrder(container)).toEqual(["card-2", "card-0", "card-1"]);
  });

  it("lets plain taps through to the link", () => {
    const { container } = render(
      <Stack
        sensitivity={90}
        sendToBackOnClick
        renderTopCardLink={(content, cardIndex) => (
          <a href={`/products/card-${cardIndex}`} data-testid={`link-${cardIndex}`}>
            {content}
          </a>
        )}
        cards={testCards()}
      />,
    );

    const topLink = container.querySelector(
      '[data-testid="link-2"]',
    ) as HTMLElement;
    expect(fireEvent.click(topLink)).toBe(true);
  });

  it("clears the suppression on the next pointer-down", () => {
    const { container } = render(
      <Stack
        sensitivity={90}
        sendToBackOnClick
        renderTopCardLink={(content, cardIndex) => (
          <a href={`/products/card-${cardIndex}`} data-testid={`link-${cardIndex}`}>
            {content}
          </a>
        )}
        cards={testCards()}
      />,
    );

    dragTopPastThreshold();

    const draggable = container.querySelector(
      '[role="button"]',
    ) as HTMLElement;
    fireEvent.pointerDown(draggable);

    const newTopLink = container.querySelector(
      '[data-testid="link-1"]',
    ) as HTMLElement;
    expect(fireEvent.click(newTopLink)).toBe(true);
  });
});

describe("Stack top-card-only link", () => {
  it("wraps only the top card in the link and moves it with the top", () => {
    const { container } = render(
      <Stack
        sensitivity={90}
        sendToBackOnClick
        renderTopCardLink={(content, cardIndex) => (
          <a href={`/products/card-${cardIndex}`} data-testid={`link-${cardIndex}`}>
            {content}
          </a>
        )}
        cards={testCards()}
      />,
    );

    const links = container.querySelectorAll('a[href^="/products/"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/products/card-2");
    expect(links[0].querySelector('[data-testid="card-2"]')).not.toBeNull();

    // Non-top cards are plain content: no link ancestor.
    expect(
      container.querySelector('[data-testid="card-0"]')?.closest("a"),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="card-1"]')?.closest("a"),
    ).toBeNull();

    // After one cycle the link follows the new top card (card-1).
    dragTopPastThreshold();
    const moved = container.querySelectorAll('a[href^="/products/"]');
    expect(moved).toHaveLength(1);
    expect(moved[0].getAttribute("href")).toBe("/products/card-1");
  });
});
