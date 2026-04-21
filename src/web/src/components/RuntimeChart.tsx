import { useCallback, useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
} from 'date-fns';
import { useCalendar } from '../hooks/useCalendar';
import { AppConfig, PlanBlock } from '../types';

interface RuntimeChartProps {
  config: AppConfig | null;
}

interface DayRuntime {
  date: string;
  dateISO: string;
  runtimeHours: number;
  isToday: boolean;
}

const MAX_CHART_HOURS = 12;

const computeDayRuntimes = (blocks: PlanBlock[], days: Date[]): DayRuntime[] => {
  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    let runtimeMs = 0;

    for (const block of blocks) {
      if (block.state !== 'on') continue;

      const blockStart = parseISO(block.start);
      const blockEnd = parseISO(block.end);

      if (isAfter(blockStart, dayEnd) || isBefore(blockEnd, dayStart)) {
        continue;
      }

      const effectiveStart = isBefore(blockStart, dayStart) ? dayStart : blockStart;
      const effectiveEnd = isAfter(blockEnd, dayEnd) ? dayEnd : blockEnd;

      runtimeMs += effectiveEnd.getTime() - effectiveStart.getTime();
    }

    const runtimeHours = runtimeMs / (1000 * 60 * 60);

    return {
      date: format(day, 'MMM d'),
      dateISO: format(day, 'yyyy-MM-dd'),
      runtimeHours,
      isToday: isToday(day),
    };
  });
};

export const RuntimeChart = ({ config }: RuntimeChartProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const range = useMemo(() => {
    return {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    };
  }, [currentMonth]);

  const { blocks, isLoading, error, refetch } = useCalendar(range, config);

  const dayRuntimes = useMemo(() => {
    const days = eachDayOfInterval(range);
    return computeDayRuntimes(blocks, days);
  }, [blocks, range]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  if (config?.winterMode) {
    return (
      <div className="card">
        <div className="calendar-header">
          <div className="card-header">Runtime Usage — {format(currentMonth, 'MMMM yyyy')}</div>
          <div className="controls-row">
            <button className="button" onClick={handlePrevMonth}>
              ← Prev
            </button>
            <button className="button" onClick={handleToday}>
              Today
            </button>
            <button className="button" onClick={handleNextMonth}>
              Next →
            </button>
          </div>
        </div>
        <div style={{
          background: '#fef9c3',
          color: '#854d0e',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center',
          fontWeight: 600
        }}>
          🏠 Winter Mode — Usage tracking paused
        </div>
      </div>
    );
  }

  if (isLoading && blocks.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Runtime Usage</div>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">Runtime Usage</div>
        <p className="muted">Error: {error}</p>
        <button className="button" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="calendar-header">
        <div className="card-header">Runtime Usage — {format(currentMonth, 'MMMM yyyy')}</div>
        <div className="controls-row">
          <button className="button" onClick={handlePrevMonth}>
            ← Prev
          </button>
          <button className="button" onClick={handleToday}>
            Today
          </button>
          <button className="button" onClick={handleNextMonth}>
            Next →
          </button>
          <button className="button" onClick={refetch} disabled={isLoading} title="Recalculate runtime projections">
            {isLoading ? '...' : '↻ Recalculate'}
          </button>
        </div>
      </div>
      <div className="runtime-chart-container">
        <svg className="runtime-chart-svg" viewBox="0 0 800 260">
          <defs>
            <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="800" height="260" fill="#fafafa" />
          <line x1="60" y1="40" x2="60" y2="240" stroke="#e2e8f0" strokeWidth="1" />
          <line x1="60" y1="240" x2="780" y2="240" stroke="#e2e8f0" strokeWidth="1" />
          {[0, 3, 6, 9, 12].map((hour) => {
            const y = 240 - (hour / MAX_CHART_HOURS) * 200;
            return (
              <g key={hour}>
                <line x1="55" y1={y} x2="780" y2={y} stroke="#e2e8f0" strokeWidth="1" opacity="0.5" />
                <text x="50" y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {hour}h
                </text>
              </g>
            );
          })}
          {dayRuntimes.map((day, index) => {
            const barHeight = Math.min((day.runtimeHours / MAX_CHART_HOURS) * 200, 200);
            const x = 80 + index * (700 / dayRuntimes.length);
            const barWidth = Math.max(700 / dayRuntimes.length - 4, 8);
            const y = 240 - barHeight;

            return (
              <g key={day.dateISO}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#bar-gradient)"
                  rx="2"
                >
                  <title>{day.date}: {day.runtimeHours.toFixed(1)}h runtime</title>
                </rect>
                {index % 2 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y="255"
                    textAnchor="middle"
                    fontSize="9"
                    fill={day.isToday ? '#2563eb' : '#64748b'}
                    fontWeight={day.isToday ? '700' : '400'}
                  >
                    {format(parseISO(day.dateISO), 'd')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
