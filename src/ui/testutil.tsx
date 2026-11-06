import { render } from "@testing-library/react";
import { App } from "./App";
import type { Link, LinkType, Project, Task } from "../core/model";
import { decodeProject, encodeProject } from "../core/urlCodec";
import { SettingsProvider } from "../settings/SettingsContext";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings";

export const lk = (pred: number, type: LinkType = "FS", lag = 0): Link => ({ pred, type, lag });

export const mkTask = (id: number, n: string, s: string, e: string, deps: Link[] = []): Task => ({
  id, n, s, e, c: 0, p: 0, deps,
});

export const mkProject = (tasks: Task[]): Project => ({
  title: "Test project", zoom: 2, tasks, nextId: tasks.length + 1,
});

/** Put the project into the URL, then render the app on top of it. */
export function renderApp(project: Project, settings: Settings = DEFAULT_SETTINGS) {
  window.history.replaceState(null, "", "/" + encodeProject(project));
  return render(
    <SettingsProvider initial={settings}><App /></SettingsProvider>,
  );
}

/** The project currently encoded in the URL. */
export function urlProject(): Project {
  const p = decodeProject(location.search, new Date());
  if (!p) throw new Error("no project in URL");
  return p;
}
