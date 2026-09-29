# Two-minute walkthrough

[Open Enquiry Desk](https://tbmattnz.github.io/ai-enquiry-crm/). No account or API key is required.

## 1. From enquiry to review

The left panel contains a fictional website enquiry. Choose **Extract details**. The right panel shows editable name, email, company and request fields. The CRM below still contains only the seeded contact: extraction alone cannot write to it.

## 2. Approve a useful record

Change a field if needed, then choose **Approve & create contact**. The result appears in the CRM with one enquiry. The activity log records the approval.

## 3. Match an existing contact

Choose **Existing contact**, then extract. The sample email deliberately uses capitals. The review recognises the same seeded email and offers **Approve & update contact**. Approving increases the enquiry count without adding a duplicate contact.

## 4. Recover from a lost response

Choose **New enquiry**, extract and tick **Test a lost response after saving**. Approve. The warning explains that the write succeeded but its response was lost. Choose **Retry approval safely**. The result is recovered, and the count does not increase again.

## 5. Catch missing information

Choose **Missing information**, then extract. Approval is disabled. Add a fictional email such as `jamie@harbour.example` and approve. This makes the human review step visible and useful.

## What to inspect in the code

- `src/domain.mjs`: approval receipts and case-insensitive email matching.
- `src/extract.mjs`: separate sample and Claude adapters, with runtime validation.
- `test/workflow.test.mjs`: examples of failure and recovery behaviour.

Reloading the public demo clears its state. It uses deterministic extraction, not a live model. Running the local server with your own provider configuration enables the optional Claude adapter.
