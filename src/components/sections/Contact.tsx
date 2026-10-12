import { useState, type FormEvent } from "react";
import { contactForm, ui } from "@/content/copy";
import { FORM_ENDPOINT } from "@/config";
import { ClipReveal, Reveal } from "@/components/ui/Reveal";

type Values = { name: string; company: string; phone: string; email: string };
type Errors = Partial<Record<keyof Values, string>>;
type Status = "idle" | "sending" | "success" | "error";

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
  const [message, setMessage] = useState("");

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (status === "sending") return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      // move focus to the first invalid field
      const first = FIELDS.find((f) => found[f.key]);
      if (first) document.getElementById(`contact-${first.key}`)?.focus();
      return;
    }

    setStatus("sending");
    setMessage("");
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name.trim(),
            company: values.company.trim(),
            phone: values.phone.trim(),
            email: values.email.trim(),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else if (import.meta.env.DEV) {
        console.warn("[contact form] VITE_FORM_ENDPOINT is not set: simulating success (dev only)");
      } else {
        throw new Error("not-connected");
      }
      setStatus("success");
      setValues(EMPTY);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error && err.message === "not-connected" ? contactForm.errors.notConnected : contactForm.errors.send);
    }
  };

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
              {status === "success" ? (
                <p role="status" className="py-8 text-center text-lg text-paper">
                  {contactForm.success}
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

                  <button type="submit" disabled={status === "sending"} data-cursor="hover" className="btn-apply mt-2 w-full justify-center disabled:opacity-70">
                    <span className="btn-label">{status === "sending" ? contactForm.sending : contactForm.submit}</span>
                  </button>

                  <p role="alert" className="min-h-5 text-center text-sm text-red-300">
                    {status === "error" ? message : ""}
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </ClipReveal>
    </section>
  );
}
