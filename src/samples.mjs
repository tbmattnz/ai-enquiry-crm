export const samples = [
  {
    label: "New enquiry",
    subject: "A better way to follow up",
    text: "Name: Alex Morgan\nEmail: alex@northline.example\nCompany: Northline Studio\n\nWe receive enquiries through our website, but follow-up is manual. We'd like a CRM workflow that captures the request and prepares a next step for our team to review. Could we discuss a small pilot next week?",
  },
  {
    label: "Existing contact",
    subject: "One more detail",
    text: "Name: Sam Rivera\nEmail: SAM@FIELDWORK.example\nCompany: Fieldwork Co\n\nFollowing up on our earlier enquiry: we also need to connect the website form to our CRM. We'd like to start with one form and keep human approval before any customer email is sent.",
  },
  {
    label: "Missing information",
    subject: "Needs a human check",
    text: "Name: Jamie Lee\nCompany: Harbour Workshop\n\nCan you help us organise new sales enquiries? We currently copy them from a shared inbox into a spreadsheet. Please send more information.",
  },
];
export const seedContact = {
  id: "contact-seed",
  name: "Sam Rivera",
  email: "sam@fieldwork.example",
  company: "Fieldwork Co",
  request: "Connect website enquiries to the CRM.",
  enquiries: 1,
};
