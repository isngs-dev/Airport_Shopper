import { useEffect, useMemo, useRef, useState } from "react";
import { contactForm } from "@/content/copy";
import { API_BASE } from "@/config";

export type Meeting = { startISO: string; timeZone: string };

type Props = {
  open: boolean;
  busy: boolean;
  /** Error from the booking request (e.g. the slot was just taken). */
  error: string;
  /** Visitor picked a slot. Resolves true when booked; false means it failed and the slots are reloaded. */
  onBook: (meeting: Meeting) => Promise<boolean>;
  /** "No, thanks, just email me". */
  onSkip: () => void;
  /** Dismissed without choosing: go back to the form. */
  onClose: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Matches the server default (MEETING_MAX_DAYS); times beyond it are simply not offered. */
const MAX_DAYS = 60;
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/**
 * "Schedule a meet" dialog shown after the form is submitted. Free times come from the server
 * (working hours, minus whatever is already busy on the calendar), shown in the visitor's own time zone.
 * Uses the native <dialog> for focus trapping and Esc.
 */
export default function ScheduleModal({ open, busy, error, onBook, onSkip, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [chosen, setChosen] = useState("");
  const [localError, setLocalError] = useState("");
  const abort = useRef<AbortController | null>(null);

  const { today, last } = useMemo(() => {
    const d = new Date();
    return { today: ymd(d), last: ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + MAX_DAYS)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // cancel any in-flight request when the dialog unmounts
  useEffect(() => () => abort.current?.abort(), []);

  /** Load the free slots for a local calendar day (yyyy-mm-dd). Called from event handlers. */
  const loadSlots = (day: string) => {
    abort.current?.abort();
    setSlots([]);
    setChosen("");
    setLoadError("");
    if (!day) {
      setLoading(false);
      return;
    }
    const [y, m, d] = day.split("-").map(Number);
    const from = new Date(y, m - 1, d);
    const to = new Date(y, m - 1, d + 1);
    const ctl = new AbortController();
    abort.current = ctl;
    setLoading(true);
    fetch(`${API_BASE}/api/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { signal: ctl.signal })
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as { slots?: string[]; error?: string } | null;
        if (!r.ok) throw new Error(body?.error || contactForm.schedule.errors.load);
        setSlots(body?.slots ?? []);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(e instanceof Error && e.message ? e.message : contactForm.schedule.errors.load);
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
  };

  const book = async () => {
    if (!chosen) {
      setLocalError(contactForm.schedule.errors.pick);
      return;
    }
    setLocalError("");
    const ok = await onBook({ startISO: chosen, timeZone: timeZone() });
    // e.g. the time was just taken: refresh the list so it disappears
    if (!ok) loadSlots(date);
  };

  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
      className="m-auto max-h-[92svh] w-[min(92vw,32rem)] overflow-y-auto rounded-3xl border border-white/15 bg-midnight-2 p-0 text-paper shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] backdrop:bg-midnight/80 backdrop:backdrop-blur-sm"
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

        <label className="mt-6 block">
          <span className="mono mb-1.5 block px-2 text-[0.66rem] uppercase tracking-[0.2em] text-mute">{contactForm.schedule.date}</span>
          <input
            type="date"
            min={today} max={last}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setLocalError("");
              loadSlots(e.target.value);
            }}
            className="w-full rounded-full border border-white/12 bg-white/[0.06] px-5 py-3.5 text-base text-paper transition [color-scheme:dark] focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/30"
          />
        </label>

        <div className="mt-5">
          <p className="mono mb-2 flex flex-wrap justify-between gap-x-3 px-2 text-[0.66rem] uppercase tracking-[0.2em] text-mute">
            <span>{contactForm.schedule.time}</span>
            <span className="normal-case tracking-normal">{timeZone()}</span>
          </p>
          <div aria-live="polite" className="min-h-[3.5rem]">
            {!date ? (
              <p className="px-2 text-sm text-mute">{contactForm.schedule.pickDate}</p>
            ) : loading ? (
              <p className="px-2 text-sm text-mute">{contactForm.schedule.loading}</p>
            ) : loadError ? (
              <p className="px-2 text-sm text-red-300">{loadError}</p>
            ) : slots.length === 0 ? (
              <p className="px-2 text-sm text-mute">{contactForm.schedule.none}</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      aria-pressed={chosen === s}
                      onClick={() => {
                        setChosen(s);
                        setLocalError("");
                      }}
                      className={`w-full rounded-full border px-2 py-2.5 text-sm transition ${
                        chosen === s ? "border-amber bg-amber text-midnight font-bold" : "border-white/15 bg-white/[0.05] text-paper hover:border-amber"
                      }`}
                    >
                      {timeLabel(s)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p role="alert" className="mt-3 min-h-5 text-sm text-red-300">
          {localError || error}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <button type="button" onClick={() => void book()} disabled={busy} data-cursor="hover" className="btn-apply w-full justify-center disabled:opacity-70">
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
