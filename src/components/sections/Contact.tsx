import { useState, type FormEvent } from "react";
import { contactForm, ui } from "@/content/copy";
import { API_BASE } from "@/config";
import { ClipReveal, Reveal } from "@/components/ui/Reveal";
import ScheduleModal, { type Meeting } from "@/components/ui/ScheduleModal";

type Values = { name: string; company: string; phone: string; email: string };
type Errors = Partial<Record<keyof Values, string>>;
type Status = "idle" | "scheduling" | "sending" | "booked" | "sent";

const EMPTY: Values = { name: "", company: "", phone: "", email: "" };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = contactForm.errors.name;
  if (!v.company.trim()) e.company = contactForm.errors.company;
  if (v.phone.replace(/\D/g, "").length < 7) e.phone = contactForm.errors.phone;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = contactForm.errors.email;
  return e;
}

const FIELDS = [
  { key: "name", type: "text", autoComplete: "name", inputMode: undefined },
  { key: "company", type: "text", autoComplete: "organization", inputMode: undefined },
  { key: "phone", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { key: "email", type: "email", autoComplete: "email", inputMode: "email" },
] as const;

export default function Contact() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [sendError, setSendError] = useState("");
  /** true while a request is in flight (the dialog stays open and shows it) */
  const [busy, setBusy] = useState(false);

  // step 1: validate, then ask whether they want to book a call
  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = FIELDS.find((f) => found[f.key]);
      if (first) document.getElementById(`contact-${first.key}`)?.focus();
      return;
    }
    setSendError("");
    setStatus("scheduling");
  };

  // step 2: send once, with or without a meeting; the server picks the matching confirmation mail
  const send = async (meeting?: Meeting): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setSendError("");
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          company: values.company.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          ...(meeting ? { meeting } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || contactForm.errors.send);
      }
      setStatus(meeting ? "booked" : "sent");
      setValues(EMPTY);
      return true;
    } catch (err) {
      setSendError(err instanceof Error && err.message ? err.message : contactForm.errors.send);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const done = status === "booked" || status === "sent";

  return (
    <section id="contact" tabIndex={-1} aria-labelledby="contact-h" className="relative z-[2] py-24 outline-none sm:py-32">
      <ClipReveal>
        <div className="mx-auto max-w-xl px-5 sm:px-8">
          <Reveal className="text-center">
            <p className="tag">{ui.tags.contact}</p>
            <h2 id="contact-h" className="mt-4 text-[clamp(2rem,4.4vw,3.2rem)]">
              <span className="text-gradient">{contactForm.heading}</span>
            </h2>
          </Reveal>

          <Reveal className="mt-10" delay={0.1}>
            <div className="glass p-6 sm:p-9">
              {done ? (
                <p role="status" className="py-8 text-center text-lg text-paper">
                  {status === "booked" ? contactForm.successBooked : contactForm.success}
                </p>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-4">
                  {FIELDS.map((f) => {
                    const id = `contact-${f.key}`;
                    const err = errors[f.key];
                    return (
                      <div key={f.key}>
                        <label htmlFor={id} className="sr-only">
                          {contactForm.fields[f.key]}
                        </label>
                        <input
                          id={id}
                          name={f.key}
                          type={f.type}
                          autoComplete={f.autoComplete}
                          inputMode={f.inputMode}
                          placeholder={contactForm.fields[f.key]}
                          value={values[f.key]}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, [f.key]: e.target.value }));
                            if (err) setErrors((x) => ({ ...x, [f.key]: undefined }));
                          }}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${id}-err` : undefined}
                          className="w-full rounded-full border border-white/12 bg-white/[0.06] px-6 py-4 text-base text-paper placeholder:text-mute/80 transition focus:border-amber focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-amber/30 aria-[invalid=true]:border-red-400"
                        />
                        {err && (
                          <p id={`${id}-err`} className="mt-1.5 px-5 text-sm text-red-300">
                            {err}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <button type="submit" data-cursor="hover" className="btn-apply mt-2 w-full justify-center">
                    <span className="btn-label">{contactForm.submit}</span>
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </ClipReveal>

      <ScheduleModal
        open={status === "scheduling"}
        busy={busy}
        error={sendError}
        onBook={(m) => send(m)}
        onSkip={() => void send()}
        onClose={() => setStatus("idle")}
      />
    </section>
  );
}
