/**
 * Bookable-slot rules. Pure functions, no network.
 * Slots are UTC instants aligned to the meeting length; they must fall inside the owner's working hours
 * (evaluated in MEETING_TIMEZONE), on a working weekday, and far enough in the future.
 */

const MIN = 60_000;

export const rules = {
  timeZone: process.env.MEETING_TIMEZONE || "Asia/Kolkata",
  startHour: Number(process.env.MEETING_START_HOUR ?? 9),
  endHour: Number(process.env.MEETING_END_HOUR ?? 18),
  durationMin: Number(process.env.MEETING_DURATION_MIN ?? 30),
  noticeHours: Number(process.env.MEETING_MIN_NOTICE_HOURS ?? 2),
  maxDays: Number(process.env.MEETING_MAX_DAYS ?? 60),
  weekdays: (process.env.MEETING_WEEKDAYS || "Mon,Tue,Wed,Thu,Fri").split(",").map((s) => s.trim()),
};

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: rules.timeZone,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ownerParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Every allowed slot start (ms) in [fromMs, toMs). */
export function candidateSlots(fromMs, toMs, now = Date.now()) {
  const step = rules.durationMin * MIN;
  const earliest = Math.max(fromMs, now + rules.noticeHours * 3_600_000);
  const latest = Math.min(toMs, now + rules.maxDays * 86_400_000);
  const out = [];
  for (let t = Math.ceil(earliest / step) * step; t < latest; t += step) {
    const { weekday, minutes } = ownerParts(t);
    if (!rules.weekdays.includes(weekday)) continue;
    if (minutes < rules.startHour * 60 || minutes + rules.durationMin > rules.endHour * 60) continue;
    out.push(t);
  }
  return out;
}

/** Remove slots that overlap any busy interval ({start, end} ISO strings). */
export function removeBusy(slots, busy) {
  const dur = rules.durationMin * MIN;
  const ranges = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  return slots.filter((s) => !ranges.some(([a, b]) => s < b && s + dur > a));
}
