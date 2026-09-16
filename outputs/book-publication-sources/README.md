# Editable publication copies

These copies include the updated publisher permission notice and the supplied
Additional Resources page. Original uploads remain unchanged.

## Regenerate the public PDFs

Run from the workspace root:

```sh
pnpm --filter @workspace/scripts run book:walking-spirit
pnpm --filter @workspace/scripts run book:new-identity
pnpm --filter @workspace/scripts run book:majesty
pnpm --filter @workspace/scripts run book:adventure
```

The first three commands retain the original manuscripts as the body-content
authority and apply the publication-page template in
`scripts/src/bookPublicationPages.ts`. This template reads
`attached_assets/JOM_Additional_Resources_page_1789514210420.docx` directly.

Adventure retains the approved illustrated PDF as its body-content authority.
Its builder replaces only the title/contents page and final resources page.
Do not replace the illustrated body by rendering the editable Word copy.

## Regenerate editable copies

```sh
pnpm --filter @workspace/scripts run books:update-publication-sources
pnpm --filter @workspace/scripts exec tsx ./src/adventurePublicationPages.ts --editable
```

Adventure's editable copy is saved alongside its approved baseline in
`outputs/adventure-link-corrections/The_Adventure_of_Living_with_Jesus_Updated_Editable.docx`.
The other three editable copies are saved in this directory.

Regeneration requires Chromium, Ghostscript, Poppler, and the existing
Carlito/Caladea fonts. No command above pushes or publishes changes.