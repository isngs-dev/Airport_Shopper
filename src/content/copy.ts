/**
 * ALL page copy lives here.
 *
 * `content` is the project copy, verbatim from the brief. Edit text here only.
 * `ui` holds the small supporting strings the layout needs (nav labels, section
 * tags, aria text, decorative boarding-pass labels). None of it makes claims.
 */

export const content = {
  hero: {
    headline: "See the Experience. Share the Details. Get Paid",
    subtext:
      "Take part in a mystery shopping project where you visit an assigned airport location, experience the service as a customer, and provide your honest feedback.",
    cta: "APPLY FOR THIS PROJECT",
  },

  about: {
    heading: "Step Into the Customer Experience",
    intro:
      "This is an airport-based mystery shopping project covering different customer-facing locations. Depending on your assignment, you may evaluate:",
    locations: [
      "Full-Service Restaurants & Bars",
      "Quick-Service Food",
      "Convenience & Specialty Retail",
      "Airport Lounges",
      "Customer Services",
    ],
    outro:
      "Your job is simple: visit, observe, interact, and report. You'll evaluate things like customer service, cleanliness, staff interaction, product knowledge, presentation, and your overall experience.",
    cta: "APPLY NOW",
  },

  steps: {
    heading: "Pay Attention. Capture the Details.",
    passes: [
      {
        title: "Before Your Shop",
        items: [
          "Read your assignment and guidelines.",
          "Check your location, date, and scheduled time.",
          "Dress and behave like a regular traveler.",
        ],
      },
      {
        title: "During Your Shop",
        items: [
          "Observe the location and customer experience.",
          "Interact naturally with the Associate.",
          "Ask the required open-ended question.",
          "Note important details, including names, interactions, and timing.",
          "Take any required photos.",
        ],
      },
      {
        title: "When You Submit",
        items: [
          "Provide accurate and factual information.",
          "Write about your actual experience.",
          "Upload required photos and receipts.",
          "Review everything before submitting.",
        ],
      },
    ],
    closing: "Small details matter. Make sure your report reflects what actually happened.",
  },

  payment: {
    heading: "Complete It. Submit It. Get Paid.",
    highlight: { amount: 30, suffix: "Per Shop" },
    text: "Earn $30 for each completed and accepted shop.",
    deadlineHeading: "Submission Deadline",
    deadlineText: "Submit your evaluation within 48 hours of your scheduled shop date.",
    deadlineHours: 48,
    checklistIntro: "Before you submit, make sure:",
    checklist: [
      "All questions are answered",
      "Your narrative is complete",
      "Required photos are uploaded",
      "Required receipts are included",
      "Your information is accurate",
    ],
    note: "Late or incomplete evaluations may not be accepted.",
  },

  finalCta: {
    heading: "Ready to Become the Customer Behind the Evaluation?",
    text: "Your next mystery shopping assignment could start here.",
    cta: "APPLY FOR THIS PROJECT",
  },
} as const;

/** Contact form copy (added after the original brief). Field labels follow the supplied form design. */
export const contactForm = {
  heading: "Get in Touch",
  fields: {
    name: "Name",
    company: "Company Name",
    phone: "US Phone (555) 555-1234",
    email: "Email",
  },
  submit: "Submit",
  sending: "Sending...",
  success: "Thank you. We have sent you a confirmation email.",
  successBooked: "Your call is booked. We have sent a confirmation email with the meeting link.",
  schedule: {
    heading: "Schedule a Meet",
    intro: "Pick a date and time for a call, or skip it and we will just email you.",
    date: "Date",
    time: "Time",
    pickDate: "Choose a date to see the available times.",
    loading: "Loading available times...",
    none: "No times available on this date. Please try another day.",
    book: "Book my call",
    skip: "No, thanks, just email me",
    close: "Close",
    errors: {
      pick: "Please choose a date and a time.",
      load: "Could not load available times. Please try again.",
    },
  },
  errors: {
    name: "Please enter your name.",
    company: "Please enter your company name.",
    phone: "Please enter a valid 10-digit US phone number.",
    email: "Please enter a valid email address.",
    send: "Something went wrong. Please try again.",
  },
} as const;

export const ui = {
  nav: {
    label: "Primary",
    links: [
      { id: "about", label: "The Project" },
      { id: "steps", label: "Your Tasks" },
      { id: "payment", label: "Payment" },
      { id: "contact", label: "Contact" },
    ],
    skip: "Skip to content",
  },
  tags: {
    hero: "Airport Mystery Shopping Project",
    about: "01 / About the project",
    steps: "02 / What you need to do",
    payment: "03 / Payment",
    contact: "04 / Contact",
    finalCta: "05 / Apply",
  },
  board: { departures: "DEPARTURES", status: "NOW BOARDING" },
  pass: { label: "BOARDING PASS", step: "STEP", of: "OF", phase: ["BEFORE", "DURING", "SUBMIT"] },
  payment: { hoursLabel: "HOURS", counterLabel: "Pay per accepted shop", ringLabel: "Submission window, 48 hours" },
  scrollHint: "Scroll",
  progressLabel: "Page scroll progress",
  sceneLabels: {
    hero: "Illustration of an airplane flying past a wireframe globe with glowing flight paths.",
    about: "Illustrations of a restaurant cloche and cocktail glass, a coffee cup, a shopping bag, a lounge armchair and a suitcase with a headset.",
    payment: "Illustration of a gold three-dimensional dollar fifteen with coins and tickets falling around it.",
    runway: "Illustration of a runway with lights leading to the horizon and an airplane taking off.",
  },
  locationIcons: [
    "Cloche and cocktail glass",
    "Coffee cup",
    "Shopping bag",
    "Lounge armchair",
    "Suitcase with headset",
  ],
} as const;
