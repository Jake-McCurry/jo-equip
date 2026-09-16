---
name: Leader Kit Mailchimp redirect
description: Why campaign signup redirects are handled on the site and what success means.
---

Keep the campaign thank-you redirect dependent on Mailchimp accepting the submission, never on a click or an elapsed timer.

**Why:** The user reported that their Mailchimp account would not allow the custom hosted-page redirect and explicitly requested the developer-managed alternative. Generic instructions to configure the audience's Success page did not resolve their situation.

**How to apply:** Retain a Mailchimp-hosted fallback for CAPTCHA or unavailable responses. An accepted submission may still require double opt-in; do not tell visitors their email is verified or subscription confirmed solely because the embedded-form response says success. Keep both campaign variants' submission behavior identical so only form placement varies.