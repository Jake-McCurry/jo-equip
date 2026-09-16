type MailchimpResponse = { result?: unknown; msg?: unknown };

/** Match the JSONP transport used by Mailchimp's own mc-validate.js embed. */
function submitToMailchimp(form: HTMLFormElement): Promise<MailchimpResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `leaderKit_${crypto.randomUUID().replace(/-/g, "")}`;
    const callbacks = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const url = new URL(form.action);
    url.pathname = url.pathname.replace(/\/post$/, "/post-json");
    for (const [name, value] of new FormData(form)) {
      if (typeof value === "string") url.searchParams.set(name, value);
    }
    url.searchParams.set("subscribe", "Subscribe");
    url.searchParams.set("c", callbackName);

    const cleanup = () => {
      window.clearTimeout(timeout);
      script.remove();
      // A late response after a timeout must not redirect or throw.
      callbacks[callbackName] = () => {};
      window.setTimeout(() => { delete callbacks[callbackName]; }, 60_000);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("unconfirmed"));
    }, 20_000);
    callbacks[callbackName] = (response: unknown) => {
      cleanup();
      if (response && typeof response === "object") {
        resolve(response as MailchimpResponse);
      } else {
        reject(new Error("unconfirmed"));
      }
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("unconfirmed"));
    };
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = url.href;
    document.head.appendChild(script);
  });
}

function readableMessage(message: unknown): string {
  if (typeof message !== "string" || !message.trim()) {
    return "Mailchimp could not accept your request. Please check your details or continue with Mailchimp below.";
  }
  // Never insert provider-supplied HTML into the live page.
  return message.replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/^\d+\s*-\s*/, "")
    .slice(0, 1500);
}

export function initializeLeaderKitSignup() {
  const form = document.querySelector<HTMLFormElement>("#mc-embedded-subscribe-form");
  if (!form || form.dataset.enhanced) return;
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const fallback = form.querySelector<HTMLButtonElement>("[data-mailchimp-fallback]");
  const feedback = form.querySelector<HTMLElement>("#leader-kit-feedback");
  const note = form.querySelector<HTMLElement>("[data-signup-note]");
  const thankYouUrl = form.dataset.thankYouUrl;
  if (!submitButton || !fallback || !feedback || !thankYouUrl) return;
  form.dataset.enhanced = "true";
  if (note) note.textContent = "We’ll take you to your kit after Mailchimp accepts your request.";
  let pending = false;
  const restoreButton = () => {
    pending = false;
    submitButton.disabled = false;
    submitButton.textContent = "Get the Kit";
    form.removeAttribute("aria-busy");
  };
  window.addEventListener("pageshow", event => {
    if (event.persisted) restoreButton();
  });

  fallback.addEventListener("click", () => {
    if (!pending && form.reportValidity()) {
      HTMLFormElement.prototype.submit.call(form);
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true;
    submitButton.disabled = true;
    submitButton.textContent = "Sending your request…";
    form.setAttribute("aria-busy", "true");
    feedback.hidden = true;
    fallback.hidden = true;
    try {
      const response = await submitToMailchimp(form);
      if (response.result === "success") {
        // "success" means accepted; double opt-in may still require an email click.
        window.location.assign(thankYouUrl);
        return;
      }
      feedback.textContent = response.result === "error"
        ? readableMessage(response.msg)
        : "We couldn’t verify Mailchimp’s response. Check your inbox before trying again, or continue with Mailchimp below.";
    } catch {
      feedback.textContent = "We couldn’t verify your signup with Mailchimp. Check your inbox before trying again, or continue with Mailchimp below.";
    }
    restoreButton();
    feedback.hidden = false;
    fallback.hidden = false;
    feedback.focus();
  });
}