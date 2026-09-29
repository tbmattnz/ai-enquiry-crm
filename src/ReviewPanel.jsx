import React from "react";

export function ReviewPanel({
  fields,
  receipt,
  busy,
  missing,
  duplicate,
  retry,
  simulate,
  onFieldsChange,
  onSimulate,
  onApprove,
  onEdit,
  onNext,
}) {
  const done = Boolean(receipt);
  return (
    <div className="review panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">02 / HUMAN REVIEW</p>
          <h2>
            {done ? "Recorded, with context." : "You have the final say."}
          </h2>
        </div>
        <span className="review-symbol">{done ? "✓" : "✳"}</span>
      </div>
      {!fields ? (
        <div className="empty-review">
          <div className="empty-rule" />
          <h3>
            Useful details.
            <br />
            No automatic decisions.
          </h3>
          <p>
            Extract an enquiry to see a proposed contact and request summary
            here. Nothing enters the CRM until you approve it.
          </p>
          <span className="annotation">A person stays in the loop.</span>
        </div>
      ) : (
        <>
          <div className="review-status" role="status">
            {done
              ? receipt.replayed
                ? "Retry recovered the original result. No duplicate write."
                : `Contact ${receipt.action}. Approval recorded.`
              : retry
                ? "Approval was not confirmed. Retry unchanged details or return to editing."
                : missing
                  ? "Missing information — fill in the details before approval."
                  : duplicate
                    ? "Existing email found — approval will update this contact."
                    : "New contact — check these details before approval."}
          </div>
          <div className="field-grid">
            {["name", "email", "company"].map((key) => (
              <label key={key} className={key === "company" ? "full" : ""}>
                {key === "email"
                  ? "Email · required"
                  : key[0].toUpperCase() + key.slice(1)}
                <input
                  type={key === "email" ? "email" : "text"}
                  value={fields[key]}
                  placeholder={
                    key === "email" ? "Add the missing email" : "Not provided"
                  }
                  maxLength={200}
                  disabled={busy || done || retry}
                  onChange={(e) =>
                    onFieldsChange({ ...fields, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="full">
              Request summary · required
              <textarea
                value={fields.request}
                maxLength={2000}
                disabled={busy || done || retry}
                onChange={(e) =>
                  onFieldsChange({ ...fields, request: e.target.value })
                }
              />
            </label>
          </div>
          {!done && (
            <div className="approval">
              <label className="check">
                <input
                  type="checkbox"
                  checked={simulate}
                  disabled={busy || retry}
                  onChange={(e) => onSimulate(e.target.checked)}
                />
                Test a lost response after saving
              </label>
              <button
                className="primary"
                onClick={onApprove}
                disabled={busy || missing}
              >
                {busy
                  ? "Saving…"
                  : retry
                    ? "Retry approval safely"
                    : duplicate
                      ? "Approve & update contact"
                      : "Approve & create contact"}{" "}
                <span>↗</span>
              </button>
              {retry && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={onEdit}
                >
                  Return to editing
                </button>
              )}
            </div>
          )}
          {done && (
            <div className="receipt">
              <span>✓</span>
              <p>
                <strong>{receipt.contact.email}</strong>
                <br />
                One approved enquiry. A traceable result.
              </p>
              <button className="text-button" onClick={onNext}>
                Try another →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
