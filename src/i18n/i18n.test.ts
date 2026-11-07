import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";
import { LANGUAGES, makeT, resolveLanguage, resolveLocale, type Language } from "./index";

describe("resolveLanguage", () => {
  it.each([
    [["de-AT"], "de"],
    [["de"], "de"],
    [["fr", "es"], "en"],
    [["fr", "de-CH", "en"], "de"],
    [["en-GB", "de"], "en"],
    [[], "en"],
  ])("%j → %s", (browser, lang) => expect(resolveLanguage("auto", browser)).toBe(lang));
  it("an explicit choice wins over the browser", () => {
    expect(resolveLanguage("en", ["de-DE"])).toBe("en");
    expect(resolveLanguage("de", ["en-US"])).toBe("de");
  });
});

describe("resolveLocale", () => {
  it("keeps the browser's region for the same language", () => {
    expect(resolveLocale("en", ["en-GB", "de"])).toBe("en-GB");
    expect(resolveLocale("de", ["en-US", "de-CH"])).toBe("de-CH");
    expect(resolveLocale("de", ["en-US"])).toBe("de");
  });
});

describe("makeT", () => {
  it("plain strings, parameters and plurals in both languages", () => {
    const tEn = makeT("en"), tDe = makeT("de");
    expect(tEn("ribbon.addTask")).toBe("Add task");
    expect(tDe("ribbon.addTask")).toBe("Vorgang hinzufügen");
    expect(tEn("dialog.deleteGroup.delete", 1)).toBe("Delete group and 1 task");
    expect(tEn("dialog.deleteGroup.delete", 3)).toBe("Delete group and 3 tasks");
    expect(tDe("dialog.deleteGroup.delete", 3)).toBe("Gruppe und 3 Vorgänge löschen");
    expect(tDe("unit.days", 1)).toBe("Tag");
    expect(tDe("unit.days", 5)).toBe("Tage");
    expect(tDe("timeline.week", 45)).toBe("KW 45");
    expect(tEn("timeline.week", 45)).toBe("W45");
  });
  it("falls back to English for texts a catalog lacks, and for unknown languages", () => {
    const partial: Language = { code: "xx", name: "Test", messages: { "ribbon.addTask": "Ajouter" } };
    const t = makeT("xx", [...LANGUAGES, partial]);
    expect(t("ribbon.addTask")).toBe("Ajouter");
    expect(t("ribbon.copyLink")).toBe("Copy link");
    expect(makeT("zz")("ribbon.copyLink")).toBe("Copy link");
  });
});

describe("catalogs", () => {
  it("German has every English key, with the same kind of value", () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(de, k).toHaveProperty(k);
      expect(typeof de[k], k).toBe(typeof en[k]);
    }
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });
  it("sample task lists have 7 names in every language", () => {
    for (const l of LANGUAGES) expect(makeT(l.code)("sample.tasks").split("|")).toHaveLength(7);
  });
});
