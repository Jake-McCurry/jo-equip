import { useState } from "react";
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
  const join = (p: string) =>
    (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + p;

  return (
    <>
      <button
        type="button"
        className="p-2 text-white"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle Menu"
        aria-expanded={open}
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="lg:hidden absolute left-0 right-0 top-full w-full py-3 px-4 flex flex-col gap-1 z-40"
          style={{ backgroundColor: "#001f3d", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          {navLinks.map(link => (
            <a
              key={link.path}
              href={join(link.path)}
              onClick={() => setOpen(false)}
              className="text-base font-medium py-3 px-3 rounded transition-colors"
              style={{
                color: link.active ? "#ffffff" : "rgba(255,255,255,0.65)",
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
