import { seedContact } from "./samples.mjs";

export class Problem extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fields = ["name", "email", "company", "request"];
export function validateFields(value, requireEmail = false) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Problem("Expected an object of contact fields.");
  const result = {};
  for (const field of fields) {
    if (typeof value[field] !== "string")
      throw new Problem(`Invalid ${field}: expected text.`);
    const limit = field === "request" ? 2000 : 200;
    if (value[field].length > limit) throw new Problem(`${field} is too long.`);
    result[field] = value[field].trim();
  }
  result.email = result.email.toLowerCase();
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
    throw new Problem("Enter a valid email address.");
  if (requireEmail && !result.email)
    throw new Problem("Add an email address before approving.");
  if (requireEmail && !result.request)
    throw new Problem("Add a request summary before approving.");
  return result;
}
export function validateSource(text) {
  if (typeof text !== "string" || text.trim().length < 10 || text.length > 6000)
    throw new Problem("Use an enquiry between 10 and 6,000 characters.");
  return text.trim();
}
export function createService(extract, mode = "sample") {
  const contacts = new Map([[seedContact.email, structuredClone(seedContact)]]);
  const drafts = new Map();
  const events = [];
  const addEvent = (message, type = "info") =>
    events.unshift({
      id: crypto.randomUUID(),
      message,
      type,
      at: new Date().toISOString(),
    });
  addEvent("Sample workspace ready. One existing contact loaded.");
  return {
    snapshot: () => ({
      mode,
      contacts: structuredClone([...contacts.values()]),
      events: structuredClone(events.slice(0, 100)),
    }),
    async analyse(text) {
      text = validateSource(text);
      if (drafts.size >= 100)
        throw new Problem(
          "Demo limit reached. Restart the workspace to continue.",
          429,
        );
      // Reserve a slot before awaiting the provider so concurrent requests cannot bypass the cap.
      const id = crypto.randomUUID();
      drafts.set(id, null);
      try {
        const proposed = validateFields(await extract(text));
        const draft = { id, fields: proposed, source: text, receipt: null };
        drafts.set(id, draft);
        addEvent("Enquiry extracted. Waiting for human review.");
        return {
          id,
          fields: proposed,
          duplicate: contacts.has(proposed.email),
          mode,
        };
      } catch (error) {
        drafts.delete(id);
        throw error;
      }
    },
    approve(id, input, simulateLostResponse = false) {
      const draft = drafts.get(id);
      if (!draft)
        throw new Problem("Review not found. Extract the enquiry again.", 404);
      const values = validateFields(input, true);
      const fingerprint = JSON.stringify(values);
      if (draft.receipt) {
        if (fingerprint !== draft.fingerprint)
          throw new Problem(
            "This review was already approved with different details. Start a new review.",
            409,
          );
        return { ...structuredClone(draft.receipt), replayed: true };
      }
      const existing = contacts.get(values.email);
      const contact = {
        ...values,
        id: existing?.id ?? crypto.randomUUID(),
        enquiries: (existing?.enquiries ?? 0) + 1,
      };
      // These synchronous changes form one in-process operation. Production needs a DB transaction.
      contacts.set(values.email, contact);
      const receipt = {
        contact,
        action: existing ? "updated" : "created",
        replayed: false,
      };
      draft.receipt = receipt;
      draft.fingerprint = fingerprint;
      addEvent(
        `Human approved: ${contact.email} ${receipt.action}.`,
        "success",
      );
      if (simulateLostResponse) {
        addEvent(
          "Simulated lost response after the write. Retrying will reuse the saved result.",
          "warning",
        );
        throw new Problem(
          "The CRM saved the contact, but the response was lost. Retry approval to recover the same result.",
          503,
        );
      }
      return structuredClone(receipt);
    },
  };
}
