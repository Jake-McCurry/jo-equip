# Bible survey source-title audit

Reviewed: 2026-11-03. Status: **findings and proposals only; approval required before content changes.**

## Scope and evidence limits

Audited all 62 generated survey entries (35 OT, including the introduction, and 27 NT), their article IDs, titles, app slugs, source mappings, and collection links. Fetched all 61 distinct mapped WordPress posts successfully. Compared each complete generated body to its mapped source after removing HTML tags, decoding entities, and ignoring whitespace: all 62 match. That establishes faithful import of the **selected** sources, not that those selections are correct.

Sources are the JesusOnline publisher's Joshua Nations-attributed survey posts, served through `https://apicontent.jesusonline.com/wp-json/wp/v2/posts/<id>`. Every mapped post explicitly credits Joshua Nations. These are authoritative for the site's current import, but are **republished material**, not an independently verified Joshua Nations master manuscript.

The first-party [Joshua Nations downloads page](https://joshuanations.org/downloads) requires submitting a contact form to receive curriculum links by email. No form was submitted and no unpublished master curriculum was obtained. Thus this audit confirms publishing/mapping errors against the available attributed sources; it does not certify the curriculum against an unavailable first-party edition or assess doctrinal accuracy.

Files inspected:

- `src/data/generated/articles/survey-of-the-bible-ot.json`
- `src/data/generated/articles/survey-of-the-bible-nt.json`
- `src/data/channels.ts`
- `src/data/articles.ts` (PDF manifest)
- `src/pages/categories/[channelId]/[subId]/[articleId].astro`
- Repository-root `scripts/data/slug-mapping.json` (the article-build mapping)
- Existing PDFs under `public/articles/` for the four affected NT entries

Paths below are existing site paths, not proposed renames. NT lesson paths start `/categories/church/survey-of-the-bible-nt/`.

## Confirmed findings

### 1. Philippians and Colossians route identities are crossed

| Existing route suffix | Collection label / generated title | App slug | Mapped source | Actual body |
| --- | --- | --- | --- | --- |
| `colossians` | Philippians | `93661-1-colossians` | [22059](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/22059), `93661-1-philippians` | “Coming Soon…” plus Joshua Nations attribution |
| `philippians` | Colossians | `93661-2-philippians` | [22060](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/22060), `93661-2-colossians` | Colossians teaching |

The Colossians source begins: “The epistle of Paul to the church in Colosse is one of Paul’s prison letters…” It is not a Philippians lesson. Both mappings use `method: "prefix"`; the numeric positions matched while the book names did not. Collection labels currently follow the imported source titles through explicit reversed `articleId` values.

The PDFs reflect the same mismatch: `93661-1-colossians.pdf` is titled **Philippians** and includes “Coming Soon”; `93661-2-philippians.pdf` is titled **Colossians**. This is not merely a web heading typo.

**Proposal for approval:** Keep both existing site URLs, but make `/colossians` consistently Colossians and `/philippians` consistently Philippians across collection labels, bodies, next-lesson links, metadata, source provenance, and PDF associations. Remap the existing `93661-1-colossians` key to post **22060**, and `93661-2-philippians` to **22059**, using reviewed book identity rather than numeric prefix. Align collection `articleId` references accordingly. Preserve the legacy app slug strings and PDF paths unless separately authorized; do not assume the external app's addresses can be changed locally.

**Important limit:** Post 22059 is still only a placeholder (source modified 2026-04-30 03:48:23 UTC). No complete replacement Philippians teaching was found in the published survey. Ask the source owner for the approved lesson. If an interim correction is approved, show an honest unavailable/coming-soon state at the existing `/philippians` URL; do not invent teaching or present Colossians as a substitute. A swap alone does not supply a Philippians lesson.

### 2. First Thessalonians imports Second Thessalonians

| Existing route suffix | Collection label | Generated title | Current source |
| --- | --- | --- | --- |
| `1-thessalonians` | 1 Thessalonians | 2 Thessalonians | 22062 |
| `2-thessalonians` | 2 Thessalonians | 2 Thessalonians | 22062 |

The two generated `blocks` arrays are exactly equal. The first app key, `93661-3--1-thessalonians`, is fuzzily mapped to `93661-4-2-thessalonians`, post [22062](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/22062). Its PDF is also titled **2 Thessalonians**.

A correct source already exists: [post 22061](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/22061), slug `93661-3-1-thessalonians`, display title **1 Thessalonians**. Its opening says: “Paul wrote this first epistle to the church at Thessalonica from Corinth about 51 AD.” It includes the five chapters of the first epistle and credits Joshua Nations. Post 22062 instead opens by explaining that Paul wrote shortly after 1 Thessalonians.

**Proposal for approval:** Keep `/1-thessalonians` and the existing double-hyphen app key. Change that key's mapping to **22061** / `93661-3-1-thessalonians`; regenerate only its title, description, teaching blocks, and associated PDF from that source. Leave 2 Thessalonians mapped to **22062**. Verify that the two lessons are no longer duplicates. No newly authored teaching is needed.

### 3. Ezra and Nehemiah is hidden by a misleading upstream slug

The OT collection lists **Ezra and Nehemiah** with app key `93652-4-ezra-and-nehemiah`, but no corresponding generated article or mapping entry exists. A source was found in the live publisher catalog:

- [Post 21959](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/21959)
- Slug: **`93652-4-esther`**
- Display title: **Ezra and Nehemiah**
- Body: “For this reason, we will summarize the two books together here,” followed by Ezra and Nehemiah chapter sections, and Joshua Nations attribution.

The actual Esther source is a separate post, [21989](https://apicontent.jesusonline.com/wp-json/wp/v2/posts/21989), `93652-5-esther`, correctly used by the current Esther article. The two posts should not be classified as duplicate Esther teaching based on their slugs.

**Proposal for approval:** Map the existing Ezra/Nehemiah app key explicitly to **21959**, based on its title and body, not its misleading slug. Import the lesson and associate a correctly titled survey PDF only after approval. Do not overwrite or rename the existing Esther lesson or its URL. This fills a missing survey lesson rather than correcting an existing generated article's body.

### 4. Song of Songs and Jeremiah remain source gaps, not confirmed wrong-book imports

Both appear in the OT collection but are absent from the generated OT file and survey mapping. Searches of the live catalog by survey prefix and book name found no matching Joshua Nations survey posts. This is a statement about the currently accessible catalog, not proof that Joshua Nations never authored these lessons.

Same-book JesusOnline Overview resources exist (`38634-overview-song-of-songs`, post 11119; `38616-overview-jeremiah`, post 11072). They are **not equivalent Joshua Nations survey sources**. Do not silently substitute them or attribute them to Joshua Nations. Request approved survey originals; any separately labeled alternative requires editorial approval.

## Coverage inventory

For each row below the current generated title and body identify the expected book and match the mapped source. “No mismatch found” is a book-identity check, not a theological or reference-citation review.

| OT entry | Source post | Result |
| --- | --- | --- |
| Old Testament Introduction | 21943 | No mismatch found; legacy `old-tesatament` typo retained |
| Genesis | 21934 | No mismatch found |
| Exodus | 21935 | No mismatch found |
| Leviticus | 21936 | No mismatch found |
| Numbers | 21937 | No mismatch found |
| Deuteronomy | 21938 | No mismatch found |
| Joshua | 21939 | No mismatch found |
| Judges | 21940 | No mismatch found |
| Ruth | 21941 | No mismatch found |
| 1 Samuel | 21942 | No mismatch found |
| 2 Samuel | 21955 | No mismatch found |
| 1 Kings | 21956 | No mismatch found |
| 2 Kings | 21957 | No mismatch found |
| 1 & 2 Chronicles | 21958 | No mismatch found; combined lesson |
| Esther | 21989 | No mismatch found; distinguish from 21959 |
| Job | 21960 | No mismatch found |
| Psalms | 21961 | No mismatch found |
| Proverbs | 21962 | No mismatch found; app number 8 vs source number 7 is harmless |
| Ecclesiastes | 21963 | No mismatch found |
| Isaiah | 21964 | No mismatch found |
| Lamentations | 22006 | No mismatch found; legacy singular ID retained |
| Ezekiel | 22007 | No mismatch found |
| Daniel | 22008 | No mismatch found |
| Hosea | 22009 | No mismatch found |
| Joel | 22010 | No mismatch found |
| Amos | 22011 | No mismatch found |
| Obadiah | 22012 | No mismatch found |
| Jonah | 22013 | No mismatch found |
| Micah | 22017 | No mismatch found |
| Nahum | 22018 | No mismatch found |
| Habakkuk | 22019 | No mismatch found |
| Zephaniah | 22020 | No mismatch found; app slug capital preserved |
| Haggai | 22021 | No mismatch found |
| Zechariah | 22022 | No mismatch found; app slug capital preserved |
| Malachi | 22023 | No mismatch found |

| NT entry / route ID where different | Source post | Result |
| --- | --- | --- |
| Matthew | 22039 | No mismatch found |
| Mark | 22040 | No mismatch found |
| Luke | 22041 | No mismatch found |
| John | 22042 | No mismatch found |
| Acts | 22043 | No mismatch found |
| Romans | 22044 | No mismatch found |
| 1 Corinthians | 22045 | No mismatch found |
| 2 Corinthians | 22046 | No mismatch found |
| Galatians | 22047 | No mismatch found |
| Ephesians / `epehsians` | 22048 | No mismatch found; legacy typo retained |
| Philippians / `colossians` | 22059 | Crossed identity; placeholder only |
| Colossians / `philippians` | 22060 | Crossed identity; Colossians body |
| `1-thessalonians` | 22062 | Wrong source; should be 22061 |
| 2 Thessalonians | 22062 | Correct itself; duplicated into preceding entry |
| 1 Timothy | 22063 | No mismatch found |
| 2 Timothy | 22064 | No mismatch found |
| Titus | 22065 | No mismatch found |
| Philemon | 22066 | No mismatch found |
| Hebrews / `hebrew` | 22067 | No mismatch found; legacy singular ID retained |
| James | 22077 | No mismatch found |
| 1 Peter | 22078 | No mismatch found |
| 2 Peter | 22079 | No mismatch found |
| 1 John | 22080 | No mismatch found |
| 2 John | 22081 | No mismatch found |
| 3 John | 22082 | No mismatch found |
| Jude | 22083 | No mismatch found |
| Revelation | 22084 | No mismatch found |

Additional OT collection entries, outside the 35 generated entries: Ezra and Nehemiah (source found, 21959), Song of Songs (survey source not found), Jeremiah (survey source not found).

## Approval and implementation boundaries

1. Approve or decline the source selections above before editing teaching or PDFs. Prioritize the concrete 1 Thessalonians correction; resolve the intended Philippians interim state explicitly.
2. Preserve existing URL paths, legacy slug spelling/case, and approved survey styling. Changing the contents at the crossed book URLs is an editorial correction, not a redirect or route deletion.
3. Update the source mapping and generated article together so later imports cannot restore the mismatch. Rebuild only approved affected PDFs and manifest entries; do not rename or overwrite unrelated resources.
4. After implementation, verify each collection link, page title, full body, next-lesson link, and PDF against its approved source. Check all pre-existing survey routes still resolve and the visual treatment is unchanged.
5. Add a focused regression guard for reviewed book/source identities and duplicate lesson bodies. Allow explicitly reviewed legacy spellings and combined-book lessons; never infer identity solely from a catalog number.

No application code, mappings, teaching text, PDFs, URLs, or styling were changed by this audit. Source retrieval, whole-body normalized comparison, duplicate-block comparison, and affected PDF text inspection were performed; no app build or browser journey was necessary for this documentation-only deliverable.
