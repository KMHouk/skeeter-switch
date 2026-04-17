import { evaluateDecision } from '../shared/decision';
import { getDefaultConfig } from '../shared/config';
import { AppConfig, SwitchState, WeatherConditions } from '../shared/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<AppConfig>): AppConfig {
  return { ...getDefaultConfig(), dryRun: false, ...overrides };
}

function makeWeather(overrides?: Partial<WeatherConditions>): WeatherConditions {
  return {
    currentlyRaining: false,
    precipProbability: 10,
    windSpeedMph: 5,
    temperatureF: 72,
    description: 'Clear',
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    desiredState: 'off',
    lastCommandedState: 'off',
    lastCommandTime: null,
    lastResult: 'success',
    lastError: null,
    activeOverride: null,
    ...overrides,
  };
}

// ── Time helpers ──────────────────────────────────────────────────────────────
// All times are in America/New_York (January 15 2025 = EST, UTC-5).
// UTC = ET + 5h, so these UTC strings resolve to the labelled ET local times.
const nowAt = {
  et17_00: new Date('2025-01-15T22:00:00Z'), // 17:00 ET — inside window
  et23_00: new Date('2025-01-16T04:00:00Z'), // 23:00 ET — inside window
  et03_00: new Date('2025-01-15T08:00:00Z'), // 03:00 ET — inside window (post-midnight)
  et08_00: new Date('2025-01-15T13:00:00Z'), // 08:00 ET — exclusive boundary (outside)
  et09_00: new Date('2025-01-15T14:00:00Z'), // 09:00 ET — outside window
  et14_00: new Date('2025-01-15T19:00:00Z'), // 14:00 ET — outside window
};

// Convenient shorthands used in debounce tests
const IN_WINDOW_NOW = nowAt.et17_00;
const minsAgo = (now: Date, mins: number) =>
  new Date(now.getTime() - mins * 60 * 1000).toISOString();
const minsAhead = (now: Date, mins: number) =>
  new Date(now.getTime() + mins * 60 * 1000).toISOString();

// ═════════════════════════════════════════════════════════════════════════════
// 1. Override cases
// ═════════════════════════════════════════════════════════════════════════════

describe('Override', () => {
  it('active override state=on forces desiredState on', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ currentlyRaining: true }), // bad weather – override wins
      makeState({
        activeOverride: {
          state: 'on',
          expiresAt: minsAhead(IN_WINDOW_NOW, 60),
          setBy: 'test',
          setAt: IN_WINDOW_NOW.toISOString(),
        },
      }),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('on');
    expect(result.overrideActive).toBe(true);
    expect(result.reasons.some((r) => r.includes('Override active'))).toBe(true);
  });

  it('active override state=off forces desiredState off even in window with good weather', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({
        activeOverride: {
          state: 'off',
          expiresAt: minsAhead(IN_WINDOW_NOW, 60),
          setBy: 'test',
          setAt: IN_WINDOW_NOW.toISOString(),
        },
      }),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('off');
    expect(result.overrideActive).toBe(true);
  });

  it('expired override is treated as no override (falls through to normal logic)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({
        activeOverride: {
          state: 'on',
          expiresAt: minsAgo(IN_WINDOW_NOW, 1), // expired 1 min ago
          setBy: 'test',
          setAt: minsAgo(IN_WINDOW_NOW, 61),
        },
      }),
      IN_WINDOW_NOW
    );
    expect(result.overrideActive).toBe(false);
    // Normal logic should run; all conditions good → should be 'on'
    expect(result.desiredState).toBe('on');
    expect(result.reasons.some((r) => r.includes('No active override'))).toBe(true);
  });

  it('override with expiresAt exactly equal to now is not active (boundary)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({
        activeOverride: {
          state: 'on',
          expiresAt: IN_WINDOW_NOW.toISOString(), // expiresAt === now → not > now
          setBy: 'test',
          setAt: minsAgo(IN_WINDOW_NOW, 60),
        },
      }),
      IN_WINDOW_NOW
    );
    expect(result.overrideActive).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Rain hard stop
// ═════════════════════════════════════════════════════════════════════════════

describe('Rain hard stop', () => {
  it('currentlyRaining=true forces desiredState off', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ currentlyRaining: true }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('off');
    expect(result.weatherOk).toBe(false);
    expect(result.reasons.some((r) => r.includes('raining'))).toBe(true);
  });

  it('currentlyRaining=false does not block on its own', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ currentlyRaining: false }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Temperature floor
// ═════════════════════════════════════════════════════════════════════════════

describe('Temperature floor (50°F)', () => {
  it('temperatureF=45 (<50) → desiredState off, temperature reason present', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ temperatureF: 45 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('off');
    expect(result.weatherOk).toBe(false);
    expect(result.reasons.some((r) => r.includes('45.0°F') && r.includes('floor'))).toBe(true);
  });

  it('temperatureF=50 (exactly at floor) passes — ≥ floor is allowed', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ temperatureF: 50 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(true);
    expect(result.desiredState).toBe('on');
  });

  it('temperatureF=72 → no temperature reason in reasons array', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ temperatureF: 72 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.reasons.some((r) => r.includes('floor'))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Time window (16:00–08:00, midnight-crossing, America/New_York)
// ═════════════════════════════════════════════════════════════════════════════

describe('Time window (16:00–08:00 ET, midnight-crossing)', () => {
  it('17:00 ET → withinTimeWindow=true', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et17_00);
    expect(result.withinTimeWindow).toBe(true);
  });

  it('23:00 ET → withinTimeWindow=true', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et23_00);
    expect(result.withinTimeWindow).toBe(true);
  });

  it('03:00 ET → withinTimeWindow=true (post-midnight)', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et03_00);
    expect(result.withinTimeWindow).toBe(true);
  });

  it('08:00 ET → withinTimeWindow=false (exclusive end boundary)', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et08_00);
    expect(result.withinTimeWindow).toBe(false);
    expect(result.desiredState).toBe('off');
  });

  it('09:00 ET → withinTimeWindow=false', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et09_00);
    expect(result.withinTimeWindow).toBe(false);
    expect(result.desiredState).toBe('off');
  });

  it('14:00 ET → withinTimeWindow=false', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et14_00);
    expect(result.withinTimeWindow).toBe(false);
  });

  it('outside time window reason appears in reasons array', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), nowAt.et09_00);
    expect(result.reasons.some((r) => r.includes('Outside run window'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Weather — precipitation probability threshold (35%)
// ═════════════════════════════════════════════════════════════════════════════

describe('Precipitation probability threshold (35%)', () => {
  it('precipProbability=20 (<35) → weatherOk=true', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ precipProbability: 20 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(true);
  });

  it('precipProbability=35 (=threshold) → weatherOk=false (strict less-than)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ precipProbability: 35 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(false);
    expect(result.desiredState).toBe('off');
  });

  it('precipProbability=60 → desiredState=off, weather reason present', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ precipProbability: 60 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('off');
    expect(result.reasons.some((r) => r.includes('precip 60%'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Weather — wind speed threshold (12 mph)
// ═════════════════════════════════════════════════════════════════════════════

describe('Wind speed threshold (12 mph)', () => {
  it('windSpeedMph=10 (<12) → weatherOk=true', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ windSpeedMph: 10 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(true);
  });

  it('windSpeedMph=12 (=threshold) → weatherOk=false (strict less-than)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ windSpeedMph: 12 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.weatherOk).toBe(false);
    expect(result.desiredState).toBe('off');
  });

  it('windSpeedMph=20 → desiredState=off, weather reason present', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ windSpeedMph: 20 }),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('off');
    expect(result.reasons.some((r) => r.includes('wind 20.0 mph'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Debounce
// ═════════════════════════════════════════════════════════════════════════════

describe('Debounce (15 minutes)', () => {
  it('lastCommandTime 5 min ago → debounce active, desiredState unchanged (off)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({ lastCommandTime: minsAgo(IN_WINDOW_NOW, 5) }),
      IN_WINDOW_NOW
    );
    expect(result.debounceOk).toBe(false);
    expect(result.desiredState).toBe('off');
    expect(result.reasons.some((r) => r.includes('Debounce active'))).toBe(true);
  });

  it('lastCommandTime 20 min ago → debounce passes', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({ lastCommandTime: minsAgo(IN_WINDOW_NOW, 20) }),
      IN_WINDOW_NOW
    );
    expect(result.debounceOk).toBe(true);
    expect(result.desiredState).toBe('on');
  });

  it('lastCommandTime exactly 15 min ago → debounce passes (≥ threshold)', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({ lastCommandTime: minsAgo(IN_WINDOW_NOW, 15) }),
      IN_WINDOW_NOW
    );
    expect(result.debounceOk).toBe(true);
  });

  it('lastCommandTime=null → no prior command, debounce passes', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({ lastCommandTime: null }),
      IN_WINDOW_NOW
    );
    expect(result.debounceOk).toBe(true);
    expect(result.desiredState).toBe('on');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Compound / happy path
// ═════════════════════════════════════════════════════════════════════════════

describe('Compound / happy path', () => {
  it('all conditions met → desiredState=on', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),  // good weather
      makeState(),    // no override, no debounce
      IN_WINDOW_NOW   // inside time window
    );
    expect(result.desiredState).toBe('on');
    expect(result.withinTimeWindow).toBe(true);
    expect(result.weatherOk).toBe(true);
    expect(result.debounceOk).toBe(true);
    expect(result.overrideActive).toBe(false);
  });

  it('all conditions met, lastCommandedState already on → desiredState still on', () => {
    // The decision engine always computes the desired state;
    // preventing a redundant webhook call is the caller's responsibility.
    const result = evaluateDecision(
      makeConfig(),
      makeWeather(),
      makeState({ lastCommandedState: 'on' }),
      IN_WINDOW_NOW
    );
    expect(result.desiredState).toBe('on');
  });

  it('outside window AND bad weather → desiredState=off', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ currentlyRaining: true, windSpeedMph: 20 }),
      makeState(),
      nowAt.et09_00
    );
    expect(result.desiredState).toBe('off');
    expect(result.withinTimeWindow).toBe(false);
    expect(result.weatherOk).toBe(false);
  });

  it('timestamp in result matches the now parameter', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), IN_WINDOW_NOW);
    expect(result.timestamp).toBe(IN_WINDOW_NOW.toISOString());
  });

  it('dryRun flag is forwarded from config to result', () => {
    const dry = evaluateDecision(
      makeConfig({ dryRun: true }),
      makeWeather(),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(dry.dryRun).toBe(true);

    const live = evaluateDecision(
      makeConfig({ dryRun: false }),
      makeWeather(),
      makeState(),
      IN_WINDOW_NOW
    );
    expect(live.dryRun).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. reasons[] array
// ═════════════════════════════════════════════════════════════════════════════

describe('reasons[] array', () => {
  it('when multiple conditions fail, all reasons are present', () => {
    const result = evaluateDecision(
      makeConfig(),
      makeWeather({ currentlyRaining: true, temperatureF: 40, windSpeedMph: 15 }),
      makeState({ lastCommandTime: minsAgo(IN_WINDOW_NOW, 5) }),
      nowAt.et09_00 // outside window
    );
    expect(result.reasons.some((r) => r.includes('Outside run window'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('raining'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('floor'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Weather not OK'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Debounce active'))).toBe(true);
  });

  it('when device should run, reasons explain why it is ON', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), IN_WINDOW_NOW);
    expect(result.reasons.some((r) => r.includes('No active override'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Within run window'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Weather OK'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Debounce OK'))).toBe(true);
  });

  it('reasons array is never empty', () => {
    const result = evaluateDecision(makeConfig(), makeWeather(), makeState(), IN_WINDOW_NOW);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
