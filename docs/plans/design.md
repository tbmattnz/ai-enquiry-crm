# Enquiry Desk: design and implementation plan

A public portfolio demonstration by Matt Abraham. Approved scope: enquiry intake, structured extraction, human review, CRM create/update, activity log, duplicate handling and safe retry. All sample identities are fictional.

## Architecture
React UI → HTTP API → extraction adapter → pending draft → explicit approval → in-memory CRM.
GitHub Pages preview runs the same domain service in the browser with a deterministic sample extractor. Local Node server supports sample extraction or an optional Claude adapter. No credentials in the client.
The public preview resets on reload. Local server state resets on restart. A real CRM adapter, authentication and durable storage are intentionally outside this demonstration.

## Build sequence
1. Domain validation, draft lifecycle and idempotent approval.
2. Sample extractor and optional server-only Claude adapter.
3. Loopback-only HTTP server with request limits and same-origin checks.
4. Responsive review interface and local/public-preview adapters.
5. Tests covering missing fields, malformed model output, duplicate email, lost response/retry and cross-origin rejection.
6. Browser walkthrough, documentation, screenshots and publication.

## Acceptance
- Extraction never creates a CRM contact.
- Missing email blocks approval; reviewer can correct proposed fields.
- Case-insensitive email matches update the existing record.
- Retry after a simulated lost response returns the original result without repeating a write.
- A changed payload cannot reuse an approved draft.
- The UI clearly identifies deterministic sample mode; live AI is optional and untested against a paid account.

