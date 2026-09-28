import type { Translation } from "./study-storage";

export function Attribution({ translation, apiText }: { translation: Translation; apiText?: string }) {
  return (
    <footer className="text-xs leading-relaxed text-[var(--color-text-muted)]">
      {String(translation) === "kjv" ? (
        <p>Scripture quotations marked KJV are from the King James Version, which is in the public domain.</p>
      ) : (
        <p>
          Scripture quoted by permission. Quotations designated{" "}
          <a href="https://netbible.org" target="_blank" rel="noopener noreferrer" className="underline">NET</a> are from the NET Bible&reg; copyright &copy;1996, 2019 by Biblical Studies Press, L.L.C.{" "}
          <a href="https://netbible.com" target="_blank" rel="noopener noreferrer" className="underline">netbible.com</a>. All rights reserved.
        </p>
      )}
      {apiText && !apiText.includes("Biblical Studies Press") && !/public domain/i.test(apiText) && <p className="mt-1">{apiText}</p>}
    </footer>
  );
}
