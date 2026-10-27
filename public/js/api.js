export async function api(path) {
  const res = await fetch(path);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Small DOM helper: el('td', { className: 'num' }, 'text', childNode)
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
}

// Re-run a render function when the OS theme changes, so charts pick up new colors.
export function onThemeChange(fn) {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
}
