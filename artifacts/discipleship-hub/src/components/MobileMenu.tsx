import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

interface NavLink {
  name: string;
  path: string;
  active: boolean;
}

interface Props {
  navLinks: NavLink[];
  baseUrl: string;
}

/* React island — only the menu toggle ships JS to the browser. */
export default function MobileMenu({ navLinks, baseUrl }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const join = (p: string) =>
    (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + p;

  // Lock body scroll, move focus into the panel, and restore on close.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first link in the panel for keyboard users.
    const firstLink = panelRef.current?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="p-2 text-white"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="mobile-nav-panel"
          role="navigation"
          aria-label="Mobile"
          className="lg:hidden absolute left-0 right-0 top-full w-full py-3 px-4 flex flex-col gap-1 z-40"
          style={{ backgroundColor: "#001f3d", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          {navLinks.map(link => (
            <a
              key={link.path}
              href={join(link.path)}
              onClick={() => setOpen(false)}
              aria-current={link.active ? "page" : undefined}
              className="text-base font-medium py-3 px-3 rounded transition-colors"
              style={{
                color: link.active ? "#ffffff" : "rgba(255,255,255,0.85)",
                backgroundColor: link.active ? "rgba(0,131,222,0.2)" : "transparent",
                borderLeft: link.active ? "3px solid #de5b00" : "3px solid transparent",
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
