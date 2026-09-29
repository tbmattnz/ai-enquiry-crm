import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createService } from "./domain.mjs";
import { sampleExtract } from "./extract.mjs";
import { samples } from "./samples.mjs";
import "./app.css";
import { ReviewPanel } from "./ReviewPanel.jsx";
import { Records } from "./Records.jsx";

const serverMode = document.documentElement.dataset.runtime === "server";
const local = createService(sampleExtract);
async function request(path, body) {
  if (!serverMode) {
    if (path === "state") return local.snapshot();
    if (path === "analyse") return local.analyse(body.text);
    return local.approve(body.id, body.fields, body.simulateLostResponse);
  }
  const response = await fetch(
    "/api/" + path,
    body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}
function App({ initialWorkspace, initialError }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selection, setSelection] = useState(0);
  const [text, setText] = useState(samples[0].text);
  const [draft, setDraft] = useState(null);
  const [fields, setFields] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [receipt, setReceipt] = useState(null);
  const [simulate, setSimulate] = useState(false);
  const [retry, setRetry] = useState(false);
  const refresh = async () => setWorkspace(await request("state"));
  const resetReview = () => {
    setDraft(null);
    setFields(null);
    setReceipt(null);
    setError("");
    setRetry(false);
    setSimulate(false);
  };
  const load = (index) => {
    setSelection(index);
    setText(samples[index].text);
    resetReview();
  };
  async function analyse() {
    setBusy(true);
    resetReview();
    try {
      const result = await request("analyse", { text });
      setDraft(result);
      setFields(result.fields);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    setBusy(true);
    setError("");
    try {
      setReceipt(
        await request("approve", {
          id: draft.id,
          fields,
          simulateLostResponse: simulate,
        }),
      );
      setRetry(false);
      await refresh();
    } catch (e) {
      setError(e.message);
      setRetry(true);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  const missing = fields && (!fields.email.trim() || !fields.request.trim());
  const duplicate =
    fields &&
    workspace.contacts.some(
      (c) => c.email === fields.email.trim().toLowerCase(),
    );
  const done = Boolean(receipt);
  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href="./">
          <span className="mark">e.</span> enquiry desk
        </a>
        <div className="byline">
          A working demonstration by{" "}
          <a href="https://github.com/tbmattnz">Matt Abraham ↗</a>
        </div>
        <a
          className="source-link"
          href="https://github.com/tbmattnz/ai-enquiry-crm"
        >
          View source ↗
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">FROM MESSAGE TO MEANINGFUL ACTION</p>
            <h1>
              A good enquiry deserves
              <br />
              <em>a clear next step.</em>
            </h1>
            <p className="lede">
              Turn an incoming message into a useful CRM record.
              <br className="desktop" /> Review the details. Make the call. Keep
              the history.
            </p>
          </div>
          <aside className="demo-note">
            <span className="status-dot" />
            <strong>
              {workspace.mode === "live"
                ? "Live AI · local server"
                : "Interactive sample workspace"}
            </strong>
            <p>
              {workspace.mode === "live"
                ? "Extraction uses your configured Claude account. Details still need your approval."
                : "Synthetic data. Deterministic extraction. No account, AI charges or external CRM writes."}
            </p>
            <small>
              {serverMode
                ? "Records reset when the server restarts."
                : "Changes stay in this tab and reset on reload."}
            </small>
          </aside>
        </section>
        <ol className="steps" aria-label="Workflow">
          <li className="active">
            <span>01</span> Receive
          </li>
          <li className={draft ? "active" : ""}>
            <span>02</span> Review
          </li>
          <li className={done ? "active" : ""}>
            <span>03</span> Approve & record
          </li>
        </ol>
        <section className="workbench" aria-label="Enquiry workflow">
          <div className="intake panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 / INCOMING</p>
                <h2>The enquiry</h2>
              </div>
              <span className="count">PLAIN TEXT</span>
            </div>
            <div className="sample-tabs" aria-label="Sample enquiries">
              {samples.map((sample, i) => (
                <button
                  key={sample.label}
                  aria-pressed={i === selection}
                  disabled={busy}
                  onClick={() => load(i)}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="enquiry">
              Enquiry text
            </label>
            <textarea
              id="enquiry"
              value={text}
              maxLength={6000}
              disabled={busy}
              onChange={(e) => {
                setText(e.target.value);
                setSelection(-1);
                resetReview();
              }}
            />
            <div className="intake-footer">
              <small>Try a sample, or edit the message.</small>
              <button
                className="primary"
                onClick={analyse}
                disabled={busy || text.trim().length < 10}
              >
                {busy && !draft ? "Reading enquiry…" : "Extract details"}{" "}
                <span>→</span>
              </button>
            </div>
          </div>
          <ReviewPanel
            fields={fields}
            receipt={receipt}
            busy={busy}
            missing={missing}
            duplicate={duplicate}
            retry={retry}
            simulate={simulate}
            onFieldsChange={setFields}
            onSimulate={setSimulate}
            onApprove={approve}
            onEdit={() => {
              setRetry(false);
              setError("");
            }}
            onNext={() =>
              load((selection + 1 + samples.length) % samples.length)
            }
          />
        </section>
        {error && (
          <div className="error" role="alert">
            <strong>Needs attention</strong>
            <p>{error}</p>
          </div>
        )}
        <Records contacts={workspace.contacts} events={workspace.events} />
        <section className="about-demo">
          <p className="eyebrow">WHAT THIS DEMONSTRATES</p>
          <div>
            <h3>
              Small workflow.
              <br />
              Real engineering decisions.
            </h3>
            <p>
              Editable extraction, required-field validation, contact matching
              and approval history. Try the lost-response option to see a retry
              recover the same result without creating a second enquiry.
            </p>
            <p>
              The public preview uses a sample extractor. The repository
              includes a Node API and an optional server-side Claude adapter,
              with tests for invalid responses and failure recovery.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <span>Designed & built by Matt Abraham</span>
        <a href="https://github.com/tbmattnz/product-case-studies">
          Explore Teacher’s Buddy & Kitenga ↗
        </a>
        <span>PORTFOLIO DEMONSTRATION / 2026</span>
      </footer>
    </div>
  );
}
async function start() {
  let initialWorkspace = { mode: "sample", contacts: [], events: [] };
  let initialError = "";
  try {
    initialWorkspace = await request("state");
  } catch (error) {
    initialError = error.message;
  }
  createRoot(document.getElementById("root")).render(
    <App initialWorkspace={initialWorkspace} initialError={initialError} />,
  );
}
start();
