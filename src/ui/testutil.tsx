import { render } from "@testing-library/react";
import { App } from "./App";
import type { Link, LinkType, Project, Task } from "../core/model";
import { decodeProject, encodeProject } from "../core/urlCodec";
import { SettingsProvider } from "../settings/SettingsContext";
import { I18nProvider } from "../i18n/I18nContext";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings";

export const lk = (pred: number, type: LinkType = "FS", lag = 0): Link => ({ pred, type, lag });

export const mkTask = (id: number, n: string, s: string, e: string, deps: Link[] = []): Task => ({
  id, n, s, e, c: 0, p: 0, deps,
});

export const mkProject = (tasks: Task[]): Project => ({
  title: "Test project", zoom: 1, calendar: "days", groups: [], tasks, nextId: tasks.length + 1,
});

/**
 * Settings the component tests run with: English app, German notation (the
 * behaviour the tests were written against). Pass settings to override.
 */
export const TEST_SETTINGS: Settings = { ...DEFAULT_SETTINGS, language: "en", notation: "de" };

/** Put the project into the URL, then render the app on top of it. `browser` = navigator.languages. */
export function renderApp(project: Project, settings: Settings = TEST_SETTINGS, browser: readonly string[] = ["en-US"]) {
  window.history.replaceState(null, "", "/" + encodeProject(project));
  return render(
    <SettingsProvider initial={settings}><I18nProvider browser={browser}><App /></I18nProvider></SettingsProvider>,
  );
}

/** The project currently encoded in the URL. */
export function urlProject(): Project {
  const p = decodeProject(location.search, new Date());
  if (!p) throw new Error("no project in URL");
  return p;
}
