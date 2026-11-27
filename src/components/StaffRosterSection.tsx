import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { ON_DUTY_SHEET_URL } from '../config/googleFormConfig';
import {
  DEFAULT_STAFF_MEMBERS,
  evaluateScheduleAtTime,
  fetchOnDutyRosterFromSheet,
  getStaffInitials,
  getWibDateTimeParts,
  type ParsedSheetSchedule,
  type StaffMember,
} from '../utils/staffRoster';

const AUTO_REFRESH_INTERVAL_MS = 60_000;
const CLOCK_TICK_INTERVAL_MS = 15_000;

function StaffPortrait({ member }: { member: StaffMember }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [member.photoUrl]);

  if (imgFailed || !member.photoUrl) {
    return (
      <div
        className="w-full aspect-square bg-gradient-to-br from-[#232832] to-[#111317] flex items-center justify-center text-white font-display text-3xl font-bold tracking-tight"
        aria-label={member.name}
      >
        {getStaffInitials(member.name)}
      </div>
    );
  }

  return (
    <img
      src={member.photoUrl}
      alt={`Foto ${member.name} — ${member.role}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className="w-full aspect-square object-cover object-top bg-[#E8ECF1]"
    />
  );
}

export function StaffRosterSection() {
  const [schedule, setSchedule] = useState<ParsedSheetSchedule | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshRoster = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    const currentNow = new Date();
    setNow(currentNow);
    const result = await fetchOnDutyRosterFromSheet({
      sheetUrl: ON_DUTY_SHEET_URL,
      roster: DEFAULT_STAFF_MEMBERS,
      now: currentNow,
    });
    if (result.schedule) {
      setSchedule(result.schedule);
    }
    setSyncError(result.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshRoster();
    const fetchTimer = window.setInterval(() => {
      void refreshRoster();
    }, AUTO_REFRESH_INTERVAL_MS);
    const clockTimer = window.setInterval(() => {
      setNow(new Date());
    }, CLOCK_TICK_INTERVAL_MS);
    return () => {
      window.clearInterval(fetchTimer);
      window.clearInterval(clockTimer);
    };
  }, [refreshRoster]);

  const evaluated = useMemo(() => {
    if (!schedule) {
      const wib = getWibDateTimeParts(now);
      return {
        staff: DEFAULT_STAFF_MEMBERS,
        sheetDate: null,
        dateRelation: 'unspecified' as const,
        activeShiftLabel: null,
        currentWibTime: wib.formattedTime,
        currentWibDate: wib.formattedDateId,
      };
    }
    return evaluateScheduleAtTime(schedule, now, DEFAULT_STAFF_MEMBERS);
  }, [schedule, now]);

  const { staff, sheetDate, dateRelation, activeShiftLabel, currentWibTime } = evaluated;
  const onDutyCount = staff.filter((m) => m.status === 'on-duty').length;

  return (
    <section
      id="karyawan"
      data-testid="staff-roster-section"
      className="py-12 lg:py-16 bg-[#F6F7F9] border-t border-[#E2E6EC]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#D93025] mb-1.5">
              Tim Karyawan Workshop
            </p>
            <h2
              className="font-display font-bold text-[#111317] leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Mekanik & Status Tugas Hari Ini
            </h2>

            <div
              data-testid="staff-schedule-meta"
              className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#4B5563]"
            >
              <span className="inline-flex items-center gap-1.5 font-medium text-[#1F2937]">
                <Calendar className="w-3.5 h-3.5 text-[#D93025] shrink-0" aria-hidden="true" />
                <span>
                  {sheetDate
                    ? `Jadwal: ${sheetDate.formattedId}`
                    : `Tanggal: ${evaluated.currentWibDate}`}
                </span>
              </span>

              {dateRelation === 'past' && (
                <span className="text-[#B91C1C] font-medium">
                  (Jadwal sudah lewat)
                </span>
              )}
              {dateRelation === 'future' && (
                <span className="text-[#B45309] font-medium">
                  (Jadwal belum dimulai)
                </span>
              )}

              <span aria-hidden="true" className="text-[#9CA3AF]">
                ·
              </span>

              <span className="font-mono tabular-nums text-[#374151]">
                {currentWibTime} WIB
                {activeShiftLabel ? ` · Shift ${activeShiftLabel}` : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#4B5563]">
            <div
              data-testid="staff-duty-summary"
              className="flex items-center gap-2 font-mono text-xs text-[#374151] tabular-nums"
            >
              <span className="font-semibold text-[#15803D]">
                {onDutyCount} On Duty
              </span>
              <span aria-hidden="true" className="text-[#9CA3AF]">
                ·
              </span>
              <span>{staff.length - onDutyCount} Off Duty</span>
            </div>

            <button
              type="button"
              data-testid="staff-refresh-btn"
              onClick={() => void refreshRoster()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111317] bg-white border border-[#DCE1E8] hover:border-[#111317] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{loading ? 'Memperbarui...' : 'Perbarui Status'}</span>
            </button>
          </div>
        </div>

        {syncError && (
          <p role="status" className="mb-4 text-xs text-[#B91C1C]">
            {syncError}
          </p>
        )}

        <div
          data-testid="staff-cards-grid"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {staff.map((member) => {
            const isOnDuty = member.status === 'on-duty';
            return (
              <article
                key={member.id}
                data-testid={`staff-card-${member.id}`}
                data-duty-status={member.status}
                className="bg-white border border-[#DCE1E8] rounded-xl overflow-hidden flex flex-col"
              >
                <StaffPortrait member={member} />

                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                  <div>
                    <h3 className="font-semibold text-sm text-[#111317] leading-snug">
                      {member.name}
                    </h3>
                    <p className="text-xs text-[#525C6A] leading-snug mt-0.5">
                      {member.role}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#ECEFF3] min-h-[42px] flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      {isOnDuty ? (
                        <>
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-[#15803D] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-[#15803D]">
                            On Duty
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock
                            className="w-3.5 h-3.5 text-[#6B7280] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-[#6B7280]">
                            Off Duty
                          </span>
                        </>
                      )}
                    </div>

                    {member.shiftLabel && (
                      <p
                        className={`text-[11px] font-mono tabular-nums leading-tight ${
                          isOnDuty ? 'text-[#15803D]/85' : 'text-[#6B7280]'
                        }`}
                      >
                        {member.shiftState === 'active'
                          ? `${member.shiftLabel} WIB`
                          : member.shiftState === 'completed'
                            ? `Selesai ${member.shiftLabel}`
                            : `Jadwal ${member.shiftLabel}`}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
