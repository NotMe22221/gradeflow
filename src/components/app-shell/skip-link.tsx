"use client";

/**
 * "Skip to main content": the first tab stop on every page, hidden until it
 * has keyboard focus. Every page puts its content in `<main id="main">`.
 *
 * Main is not focusable on its own (so clicks in the page never park focus on
 * it). The jump makes it focusable just for this, so keyboard and screen
 * reader focus move there rather than only the scroll position, and it does
 * not add #main to the URL. Without JavaScript, the plain #main link still
 * works.
 */
export function SkipLink() {
  function skipToMain(event: React.MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById("main");
    if (!main) return;
    event.preventDefault();
    main.tabIndex = -1;
    main.addEventListener("blur", () => main.removeAttribute("tabindex"), { once: true });
    main.focus();
  }

  return (
    <a
      href="#main"
      onClick={skipToMain}
      className="fixed top-3 left-3 z-[60] -translate-y-[200%] rounded-full bg-card px-4 py-2.5 text-sm font-medium text-primary shadow-raised outline-none focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring"
    >
      Skip to main content
    </a>
  );
}
