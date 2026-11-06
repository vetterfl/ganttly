import type { Link, LinkType, Task } from "./model";

export const mk = (id: number, s: string, e: string, deps: Link[] = [], n = `T${id}`): Task => ({
  id, n, s, e, c: 0, p: 0, deps,
});
export const lk = (pred: number, type: LinkType = "FS", lag = 0): Link => ({ pred, type, lag });
