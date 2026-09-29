import test from "node:test";
import http from "node:http";
import assert from "node:assert/strict";
import { createService } from "../src/domain.mjs";
import { sampleExtract, claudeExtractor } from "../src/extract.mjs";
import { samples } from "../src/samples.mjs";
import { createServer } from "../src/server.mjs";

test("extracts a sample for review without writing a contact", async () => {
  const service = createService(sampleExtract);
  const draft = await service.analyse(samples[0].text);
  assert.equal(draft.fields.name, "Alex Morgan");
  assert.equal(draft.fields.company, "Northline Studio");
  assert.equal(service.snapshot().contacts.length, 1);
  const receipt = service.approve(draft.id, draft.fields);
  assert.equal(receipt.action, "created");
  assert.equal(service.snapshot().contacts.length, 2);
});
test("missing email blocks approval, then a reviewer can correct it", async () => {
  const service = createService(sampleExtract);
  const draft = await service.analyse(samples[2].text);
  assert.equal(draft.fields.email, "");
  assert.throws(() => service.approve(draft.id, draft.fields), /email address/);
  assert.equal(service.snapshot().contacts.length, 1);
  const result = service.approve(draft.id, {
    ...draft.fields,
    email: "jamie@harbour.example",
  });
  assert.equal(result.contact.email, "jamie@harbour.example");
});
test("email matching is case insensitive and updates a single contact", async () => {
  const service = createService(sampleExtract);
  const draft = await service.analyse(samples[1].text);
  assert.equal(draft.duplicate, true);
  const result = service.approve(draft.id, draft.fields);
  assert.equal(result.action, "updated");
  assert.equal(result.contact.enquiries, 2);
  assert.equal(service.snapshot().contacts.length, 1);
});
test("lost response retry returns the original write with no second event or enquiry", async () => {
  const service = createService(sampleExtract);
  const draft = await service.analyse(samples[0].text);
  assert.throws(
    () => service.approve(draft.id, draft.fields, true),
    /response was lost/,
  );
  const first = service.snapshot();
  const replay = service.approve(draft.id, draft.fields, true);
  assert.equal(replay.replayed, true);
  assert.equal(replay.contact.enquiries, 1);
  assert.deepEqual(service.snapshot(), first);
  assert.throws(
    () => service.approve(draft.id, { ...draft.fields, company: "Changed" }),
    /different details/,
  );
});
test("unknown review, oversized input and invalid fields cannot write", async () => {
  const service = createService(sampleExtract);
  await assert.rejects(service.analyse("a".repeat(6001)), /6,000/);
  assert.throws(() => service.approve("missing", {}), /not found/);
  const draft = await service.analyse(samples[0].text);
  assert.throws(
    () => service.approve(draft.id, { ...draft.fields, email: "broken" }),
    /valid email/,
  );
  assert.equal(service.snapshot().contacts.length, 1);
});
test("model output is untrusted and does not get a draft if invalid", async () => {
  for (const value of [
    null,
    [],
    { name: 23 },
    { name: "", email: "bad", company: "", request: "" },
  ]) {
    const service = createService(async () => value);
    await assert.rejects(service.analyse(samples[0].text));
    assert.equal(service.snapshot().contacts.length, 1);
  }
});
test("Claude adapter validates output and keeps provider credentials in its request headers", async () => {
  let call;
  const adapter = claudeExtractor({
    apiKey: "test-not-a-real-key",
    model: "test-model",
    fetcher: async (url, options) => {
      call = { url, options };
      return new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                name: "Alex",
                email: "alex@example.com",
                company: "",
                request: "A website integration",
              }),
            },
          ],
        }),
      );
    },
  });
  const fields = await adapter(samples[0].text);
  assert.equal(fields.email, "alex@example.com");
  assert.equal(call.url, "https://api.anthropic.com/v1/messages");
  assert.equal(call.options.headers["x-api-key"], "test-not-a-real-key");
  assert.equal(JSON.parse(call.options.body).model, "test-model");
});
test("Claude adapter rejects malformed, truncated and failed responses", async () => {
  for (const body of [
    { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] },
    { stop_reason: "max_tokens", content: [{ type: "text", text: "{}" }] },
  ]) {
    const adapter = claudeExtractor({
      apiKey: "test",
      model: "test",
      fetcher: async () => new Response(JSON.stringify(body)),
    });
    await assert.rejects(adapter("example enquiry"), /invalid contact/);
  }
  const rejected = claudeExtractor({
    apiKey: "test",
    model: "test",
    fetcher: async () => new Response("", { status: 429 }),
  });
  await assert.rejects(rejected("example enquiry"), /provider rejected/);
  const timeout = claudeExtractor({
    apiKey: "test",
    model: "test",
    fetcher: async () => {
      throw new Error("secret provider message");
    },
  });
  await assert.rejects(timeout("example enquiry"), /could not connect/);
  assert.throws(() => claudeExtractor({ apiKey: "test" }), /both/);
});
test("HTTP workflow, request boundaries and local-only origin checks", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  const result = await post("/api/analyse", { text: samples[0].text });
  assert.equal(result.status, 200);
  const draft = await result.json();
  const blocked = await post(
    "/api/approve",
    { id: draft.id, fields: draft.fields },
    { origin: "https://evil.example" },
  );
  assert.equal(blocked.status, 403);
  const saved = await post("/api/approve", {
    id: draft.id,
    fields: draft.fields,
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).action, "created");
  const state = await (await fetch(base + "/api/state")).json();
  assert.equal(state.contacts.length, 2);
  assert.equal((await fetch(base + "/.env")).status, 404);
  assert.equal(
    (await post("/api/analyse", { text: "x".repeat(25000) })).status,
    413,
  );
  const hostileHostStatus = await new Promise((resolve, reject) => {
    http
      .get(
        base + "/api/state",
        { headers: { host: "evil.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      )
      .on("error", reject);
  });
  assert.equal(hostileHostStatus, 403);
  const page = await fetch(base);
  assert.match(await page.text(), /data-runtime="server"/);
});
