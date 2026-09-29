import React from "react";

export function Records({ contacts, events }) {
  return (
    <section className="records">
      <div className="crm">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / THE RESULT</p>
            <h2>Your sample CRM</h2>
          </div>
          <span className="pill">{contacts.length} contacts</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <strong>{contact.name || "Name not provided"}</strong>
                    <span className="contact-email">{contact.email}</span>
                  </td>
                  <td>{contact.company || "—"}</td>
                  <td>
                    <span className="number">{contact.enquiries}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="activity">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EVERY STEP, VISIBLE</p>
            <h2>Activity</h2>
          </div>
          <span className="activity-icon">↳</span>
        </div>
        <ol aria-live="polite">
          {events.slice(0, 6).map((event) => (
            <li key={event.id} className={event.type}>
              <span className="event-dot" />
              <div>
                {event.message}
                <time>
                  {new Date(event.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
