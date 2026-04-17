import { useMemo, useState } from 'react';
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { useCalendar } from '../hooks/useCalendar';
import { AppConfig, PlanBlock } from '../types';

interface CalendarViewProps {
  config: AppConfig | null;
}

const hourHeight = 40;

const getDaySegments = (day: Date, blocks: PlanBlock[]) => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return blocks
    .map((block) => {
      const start = parseISO(block.start);
      const end = parseISO(block.end);
      if (end < dayStart || start > dayEnd) {
        return null;
      }
      const segmentStart = start < dayStart ? dayStart : start;
      const segmentEnd = end > dayEnd ? dayEnd : end;
      const top = (differenceInMinutes(segmentStart, dayStart) / 60) * hourHeight;
      const height = Math.max(20, (differenceInMinutes(segmentEnd, segmentStart) / 60) * hourHeight);
      return {
        ...block,
        top,
        height,
        label: `${format(segmentStart, 'p')}–${format(segmentEnd, 'p')}`,
      };
    })
    .filter((block): block is PlanBlock & { top: number; height: number; label: string } => block !== null);
};

export const CalendarView = ({ config }: CalendarViewProps) => {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const { blocks, isLoading, error, refetch } = useCalendar({ start: weekStart, end: weekEnd }, config);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const now = new Date();

  return (
    <div className="card calendar">
      <div className="calendar-header">
        <div>
          <div className="card-header">Weekly Calendar</div>
          <div className="muted">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
          </div>
        </div>
        <div className="controls-row">
          <button className="button" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
            Prev Week
          </button>
          <button className="button" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            Next Week
          </button>
          <button className="button button-primary" onClick={refetch} disabled={isLoading}>
            Recalculate
          </button>
        </div>
      </div>

      {isLoading && blocks.length === 0 && <div className="spinner" />}
      {error && (
        <div>
          <p className="muted">Error: {error}</p>
          <button className="button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && blocks.length === 0 && (
        <p className="muted">No plan blocks returned for this week.</p>
      )}

      <div className="calendar-grid">
        <div className="calendar-hours" style={{ height: `${24 * hourHeight}px` }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} style={{ height: `${hourHeight}px` }}>
              {hour}:00
            </div>
          ))}
        </div>
        {days.map((day) => {
          const segments = getDaySegments(day, blocks);
          const isToday = isSameDay(day, now);
          const nowLine =
            isToday && isWithinInterval(now, { start: startOfDay(day), end: endOfDay(day) })
              ? (differenceInMinutes(now, startOfDay(day)) / 60) * hourHeight
              : null;

          return (
            <div key={day.toISOString()} className="calendar-day">
              <div className="calendar-day-header">{format(day, 'EEE MMM d')}</div>
              {nowLine !== null && <div className="calendar-now" style={{ top: nowLine }} />}
              {segments.map((block) => (
                <div
                  key={`${block.start}-${block.end}`}
                  className={`calendar-block ${
                    block.state === 'on' ? 'calendar-block-on' : 'calendar-block-off'
                  }`}
                  style={{ top: block.top, height: block.height }}
                  title={block.reasons.join(', ')}
                >
                  <div>{block.state.toUpperCase()}</div>
                  <div>{block.label}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
