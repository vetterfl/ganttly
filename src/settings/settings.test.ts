import { COLUMN_DEFAULTS, DEFAULT_SETTINGS, loadSettings, mergeSettings, saveSettings, STORAGE_KEY } from "./settings";

function memoryStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: k => m.get(k) ?? null,
    key: i => [...m.keys()][i] ?? null,
    removeItem: k => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const throwing: Storage = {
  length: 0,
  clear() { throw new Error("blocked"); },
  getItem() { throw new Error("blocked"); },
  key() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};

describe("settings", () => {
  it("defaults on first visit: German notation, all columns and overlays on, compact", () => {
    const s = loadSettings(memoryStorage());
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(s.notation).toBe("de");
    expect(s.density).toBe("compact");
    expect(Object.values(s.columns).every(Boolean)).toBe(true);
    expect([s.showArrows, s.showWeekends, s.showToday, s.showProgress].every(Boolean)).toBe(true);
  });

  it("merges stored values over defaults and drops unknown or invalid keys", () => {
    const stored = { notation: "en", density: "huge", columns: { duration: false, bogus: 1 }, extra: true, showToday: "no" };
    const s = loadSettings(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }));
    expect(s.notation).toBe("en");
    expect(s.density).toBe("compact");
    expect(s.columns).toEqual({ ...DEFAULT_SETTINGS.columns, duration: false });
    expect(s.showToday).toBe(true);
    expect(s).not.toHaveProperty("extra");
  });

  it("missing keys (older stored version) pick up their defaults", () => {
    const s = mergeSettings({ notation: "en" });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, notation: "en" });
  });

  it("round-trips through storage (survives reload)", () => {
    const st = memoryStorage();
    saveSettings({ ...DEFAULT_SETTINGS, notation: "en", dateFormat: "dmy" }, st);
    expect(loadSettings(st)).toMatchObject({ notation: "en", dateFormat: "dmy" });
  });

  it("falls back to defaults when storage throws, and saving does not throw", () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
  });

  it("ignores corrupt JSON", () => {
    expect(loadSettings(memoryStorage({ [STORAGE_KEY]: "{not json" }))).toEqual(DEFAULT_SETTINGS);
  });

  describe("column widths", () => {
    it("default to none (every column uses its default width)", () => {
      expect(DEFAULT_SETTINGS.columnWidths).toEqual({});
      expect(COLUMN_DEFAULTS.duration.def).toBe(88);
    });
    it("keep valid widths and drop invalid or unknown entries", () => {
      const s = mergeSettings({ columnWidths: { name: 280, duration: "wide", start: NaN, pct: null, id: 90, bogus: 120 } });
      expect(s.columnWidths).toEqual({ name: 280 });
    });
    it("clamp to the column minimum and the maximum, rounding to whole px", () => {
      const s = mergeSettings({ columnWidths: { duration: 10, finish: 5000, preds: 99.6 } });
      expect(s.columnWidths).toEqual({ duration: 64, finish: 800, preds: 100 });
    });
    it("ignore a non-object value", () => {
      expect(mergeSettings({ columnWidths: 42 }).columnWidths).toEqual({});
    });
    it("survive a save/load round trip", () => {
      const st = memoryStorage();
      saveSettings({ ...DEFAULT_SETTINGS, columnWidths: { name: 300 } }, st);
      expect(loadSettings(st).columnWidths).toEqual({ name: 300 });
    });
    it("are cleared by Reset (which restores DEFAULT_SETTINGS)", () => {
      const st = memoryStorage();
      saveSettings({ ...DEFAULT_SETTINGS, columnWidths: { name: 300, pct: 90 } }, st);
      saveSettings(DEFAULT_SETTINGS, st);
      expect(loadSettings(st).columnWidths).toEqual({});
    });
  });
});
