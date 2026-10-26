/** Hash routes: "#/" for the galaxy, "#/system/<id>" for a system. */
export type Route = { view: 'galaxy' } | { view: 'system'; systemId: string };

export function parseHash(hash: string): Route {
  const m = /^#\/system\/([a-z0-9-]+)\/?$/i.exec(hash);
  if (m && m[1]) return { view: 'system', systemId: m[1].toLowerCase() };
  return { view: 'galaxy' };
}

export function toHash(route: Route): string {
  return route.view === 'system' ? `#/system/${route.systemId}` : '#/';
}
