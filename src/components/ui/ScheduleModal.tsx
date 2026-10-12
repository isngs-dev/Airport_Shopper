import { useEffect, useMemo, useRef, useState } from "react";
import { contactForm } from "@/content/copy";

export type Meeting = { startISO: string; timeZone: string };

type Props = {
  open: boolean;
  busy: boolean;
  error: string;
  /** Visitor picked a slot. */
  onBook: (meeting: Meeting) => void;
  /** "No, thanks, just email me". */
  onSkip: () => void;
  /** Dismissed without choosing: go back to the form. */
  onClose: () => void;
};

const SLOTS = Array.from({ length: 19 }, (_, i) => {
  const mins = 9 * 60 + i * 30; // 09:00 to 18:00 every 30 minutes
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

const pad = (n: number) => String(n).padStart(2, "0");

/** "Schedule a meet" dialog shown after the form is submitted. Uses the native <dialog> for focus trapping and Esc. */
export default function ScheduleModal({ open, busy, error, onBook, onSkip, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [localError, setLocalError] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const book = () => {
    if (!date || !time) {
      setLocalError(contactForm.schedule.errors.pick);
      return;
    }
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
      setLocalError(contactForm.schedule.errors.past);
      return;
    }
    setLocalError("");
    onBook({ startISO: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  };

  const field =
    "w-full rounded-full border border-white/12 bg-white/[0.06] px-5 py-3.5 text-base text-paper transition focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/30 [color-scheme:dark]";

  return (
    <dialog
      ref={ref}
      aria-labelledby="schedule-h"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        // click on the backdrop (the dialog element itself)
        if (e.target === ref.current && !busy) onClose();
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-white/15 bg-midnight-2 p-0 text-paper shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] backdrop:bg-midnight/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="schedule-h" className="text-2xl sm:text-[1.7rem]">
            {contactForm.schedule.heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={contactForm.schedule.close}
            className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-paper disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-base leading-relaxed text-paper/85">{contactForm.schedule.intro}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mono mb-1.5 block px-2 text-[0.66rem] uppercase tracking-[0.2em] text-mute">{contactForm.schedule.date}</span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mono mb-1.5 block px-2 text-[0.66rem] uppercase tracking-[0.2em] text-mute">{contactForm.schedule.time}</span>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={field}>
              <option value="">{contactForm.schedule.timePlaceholder}</option>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p role="alert" className="mt-3 min-h-5 text-sm text-red-300">
          {localError || error}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <button type="button" onClick={book} disabled={busy} data-cursor="hover" className="btn-apply w-full justify-center disabled:opacity-70">
            <span className="btn-label">{busy ? contactForm.sending : contactForm.schedule.book}</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            data-cursor="hover"
            className="w-full rounded-full border border-white/20 px-6 py-3.5 font-display text-base font-bold text-paper transition hover:border-amber hover:text-amber disabled:opacity-60"
          >
            {contactForm.schedule.skip}
          </button>
        </div>
      </div>
    </dialog>
  );
}
