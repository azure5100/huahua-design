const STYLE_ID = 'huahua-design/client'

const CSS = String.raw`
.design-entry {
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  color: var(--dsw-alias-label-secondary, #77736b);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease, transform 150ms ease;
}
.design-entry:hover {
  color: var(--dsw-alias-label-primary, #282723);
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 124, 113, .11));
}
.design-entry:active { transform: translateY(1px); }
.design-entry--rail {
  width: 36px;
  justify-content: center;
  padding: 0;
}
.design-brand-mark { display: block; flex: none; }
.design-entry__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .01em;
}

.design-tool {
  position: relative;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 11px;
  box-sizing: border-box;
  overflow: hidden;
  padding: 9px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(110, 110, 100, .2));
  border-radius: 11px;
  color: var(--dsw-alias-label-primary, #2d3029);
  background:
    radial-gradient(circle at 0 50%, rgba(132, 153, 111, .12), transparent 38%),
    var(--dsw-alias-bg-base, #f7f6f1);
}
.design-tool__seal {
  width: 32px;
  height: 32px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid rgba(126, 148, 105, .28);
  border-radius: 50%;
  color: #748764;
  background: rgba(132, 153, 111, .12);
}
.design-tool__copy { min-width: 0; display: grid; gap: 3px; }
.design-tool__copy strong { overflow: hidden; font-size: 13px; font-weight: 550; line-height: 17px; text-overflow: ellipsis; white-space: nowrap; }
.design-tool__copy small { overflow: hidden; color: var(--dsw-alias-label-tertiary, #85857d); font-size: 11px; line-height: 15px; text-overflow: ellipsis; white-space: nowrap; }
.design-tool__open {
  height: 30px;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 0 10px;
  border: 1px solid rgba(126, 148, 105, .3);
  border-radius: 8px;
  color: #607052;
  background: rgba(132, 153, 111, .1);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}
.design-tool__open:hover { border-color: rgba(126, 148, 105, .52); background: rgba(132, 153, 111, .18); }
.design-tool__open:active { transform: translateY(1px); }
.design-tool__open:disabled { cursor: not-allowed; opacity: .45; }
.design-tool[data-state='error'] .design-tool__seal { color: #b35c50; border-color: rgba(179, 92, 80, .3); background: rgba(179, 92, 80, .1); }
.design-tool__sweep {
  position: absolute;
  inset: 0 auto 0 -35%;
  width: 30%;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(155, 176, 134, .16), transparent);
  animation: design-sweep 1.35s ease-in-out infinite;
}
@keyframes design-sweep { to { left: 110%; } }

.design-layer {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: grid;
  place-items: center;
  padding: 10px;
  box-sizing: border-box;
  pointer-events: auto;
  background: rgba(18, 19, 17, .48);
  backdrop-filter: blur(10px) saturate(.8);
  animation: design-veil-in 180ms ease-out both;
}
.design-shell {
  --design-ink: #2d3029;
  --design-muted: #777c70;
  --design-paper: #f4f3ed;
  --design-line: rgba(64, 70, 59, .16);
  position: relative;
  width: min(1560px, 100%);
  height: 100%;
  min-height: 360px;
  display: grid;
  grid-template-rows: 54px minmax(0, 1fr);
  overflow: hidden;
  color: var(--design-ink);
  background:
    radial-gradient(circle at 20% -10%, rgba(184, 201, 168, .24), transparent 35%),
    var(--design-paper);
  border: 1px solid rgba(255, 255, 255, .36);
  border-radius: 15px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .28), 0 2px 10px rgba(0, 0, 0, .12);
  animation: design-shell-in 220ms cubic-bezier(.2, .8, .2, 1) both;
}
.design-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--design-line);
  background: rgba(247, 246, 240, .9);
  backdrop-filter: blur(18px);
}
.design-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.design-brand__seal {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(67, 80, 59, .19);
  border-radius: 50%;
  color: #4f6245;
  background: rgba(218, 228, 207, .55);
  box-shadow: inset 0 0 0 3px rgba(255,255,255,.38);
}
.design-brand__name {
  font-family: Iowan Old Style, Baskerville, Charter, Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -.01em;
}
.design-brand__meta {
  color: var(--design-muted);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.design-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  color: var(--design-muted);
  font-size: 12px;
}
.design-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #82966f;
  box-shadow: 0 0 0 3px rgba(130, 150, 111, .14);
}
.design-actions { display: flex; align-items: center; gap: 5px; }
.design-icon-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  color: #65695f;
  background: transparent;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}
.design-icon-button:hover { color: #262923; background: rgba(71, 78, 65, .09); }
.design-icon-button:active { transform: scale(.95); }
.design-stage { position: relative; min-height: 0; background: #efeee8; }
.design-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .3;
  background-image: radial-gradient(circle, #a7aa9f 1px, transparent 1px);
  background-size: 18px 18px;
}
.design-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: #f6f5f0;
  opacity: 0;
  transition: opacity 240ms ease;
}
.design-frame--ready { opacity: 1; }
.design-loading {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: grid;
  place-items: center;
  color: #71766b;
  font-family: Iowan Old Style, Baskerville, Georgia, serif;
  font-size: 14px;
  letter-spacing: .04em;
}
.design-loading__sprout { width: 30px; display: block; margin: 0 auto 10px; color: #4f6245; animation: design-breathe 1.8s ease-in-out infinite; }
@keyframes design-veil-in { from { opacity: 0; } }
@keyframes design-shell-in { from { opacity: 0; transform: translateY(10px) scale(.99); } }
@keyframes design-breathe { 50% { transform: translateY(-3px); opacity: .65; } }
@media (max-width: 700px) {
  .design-layer { padding: 0; }
  .design-shell { border: 0; border-radius: 0; }
  .design-brand__meta, .design-status { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .design-layer, .design-shell, .design-loading__sprout { animation: none; }
  .design-frame { transition: none; }
}
`

/** Install the client surface stylesheet for this plugin lifetime. */
export function installDesignStyles(): () => void {
  const prior = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)
  if (prior !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = 'huahua-design'
  style.dataset.pluginCss = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
