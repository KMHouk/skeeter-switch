import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useCalendar } from '../hooks/useCalendar';
import { AppConfig, PlanBlock } from '../types';

interface CalendarViewProps {
  config: AppConfig | null;
}

interface DayBlock extends PlanBlock {
  label: string;
}

const getDayBlocks = (day: Date, blocks: PlanBlock[]): DayBlock[] => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return blocks
    .filter((block) => {
      const start = parseISO(block.start);
      const end = parseISO(block.end);
      return block.state === 'on' && start < dayEnd && end > dayStart;
    })
    .map((block) => {
      const start = parseISO(block.start);
      const end = parseISO(block.end);
      const segmentStart = start < dayStart ? dayStart : start;
      const segmentEnd = end > dayEnd ? dayEnd : end;
      return {
        ...block,
        label: `${format(segmentStart, 'h:mm a')}–${format(segmentEnd, 'h:mm a')}`,
      };
    });
};

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView = ({ config }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const monthStart = currentMonth;
  const monthEnd = endOfMonth(currentMonth);

  const { blocks, isLoading, error, refetch } = useCalendar(
    { start: monthStart, end: monthEnd },
    config
  );

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);

  const today = new Date();

  return (
    <div className="card calendar">
      <div className="calendar-header">
        <div>
          <div className="card-header">Monthly Calendar</div>
          <div className="muted">{format(currentMonth, 'MMMM yyyy')}</div>
        </div>
        <div className="controls-row">
          <button className="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
            Prev Month
          </button>
          <button className="button" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
            Today
          </button>
          <button className="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            Next Month
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

      <div className="cal-month-grid">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="cal-weekday-header">
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const dayBlocks = isCurrentMonth ? getDayBlocks(day, blocks) : [];

          const cellClass = [
            'cal-day-cell',
            !isCurrentMonth ? 'cal-day-cell--other-month' : '',
            isToday ? 'cal-day-cell--today' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={day.toISOString()} className={cellClass}>
              <div className="cal-day-num">{format(day, 'd')}</div>
              {isCurrentMonth && dayBlocks.length === 0 && (
                <div className="cal-no-run">No run</div>
              )}
              {dayBlocks.map((block) => (
                <div
                  key={`${block.start}-${block.end}`}
                  className="cal-block"
                  title={block.reasons.join(', ')}
                >
                  {block.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
