import { SHELL_NAV_ITEMS } from '@/lib/navigation'

export function ThemeInitScript() {
  const shortcutMap = Object.fromEntries(SHELL_NAV_ITEMS.map((item) => [item.key, item.route]))

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var s = JSON.parse(localStorage.getItem('cpa-tweaks') || '{}');
            if (s.theme) document.documentElement.dataset.theme = s.theme;
            if (s.density) document.documentElement.dataset.density = s.density;
            if (s.serif) document.documentElement.dataset.serif = s.serif;
            if (!s.serif && s.serifFamily) {
              var serifMap = { 'Instrument Serif': 'instrument', 'Tiempos': 'tiempos', 'Source Serif': 'source' };
              document.documentElement.dataset.serif = serifMap[s.serifFamily] || s.serifFamily;
            }
            if (s.accentHue !== undefined) document.documentElement.style.setProperty('--accent-hue', s.accentHue);
          } catch(_) {}
          (function() {
            var map = ${JSON.stringify(shortcutMap)};
            var waitingForSecond = false;
            var timeout = null;
            function isTypingTarget(target) {
              if (!target || !target.tagName) return false;
              var tag = String(target.tagName).toLowerCase();
              return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable || target.getAttribute('role') === 'textbox';
            }
            function clearSecond() {
              waitingForSecond = false;
              if (timeout) window.clearTimeout(timeout);
              timeout = null;
            }
            function routeForShellKey(event) {
              if (isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return null;
              var key = String(event.key || '').toLowerCase();
              if (waitingForSecond) {
                var secondRoute = map[key] || null;
                clearSecond();
                return secondRoute;
              }
              if (key === 'g') {
                waitingForSecond = true;
                timeout = window.setTimeout(clearSecond, 1000);
                return '';
              }
              return map[key] || null;
            }
            function clickTabShortcut(event) {
              if (isTypingTarget(event.target) || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
              var index = Number(event.key) - 1;
              if (!Number.isInteger(index) || index < 0 || index > 8) return false;
              var selector = '[role="tab"][aria-keyshortcuts="Alt+' + String(index + 1) + '"]';
              var tab = document.querySelector(selector);
              if (!tab) return false;
              window.__cpaPendingTabShortcut = index;
              if (typeof tab.click === 'function') tab.click();
              return true;
            }
            function navigateFallback(route) {
              if (!route) return;
              if (window.location.pathname === route) return;
              window.location.assign(route);
            }
            window.__cpaKeyboardNavReady = false;
            window.addEventListener('keydown', function(event) {
              var commandPaletteShortcut = String(event.key || '').toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey;
              if (commandPaletteShortcut && !window.__cpaCommandPaletteReady) {
                event.preventDefault();
                window.__cpaPendingCommandPalette = true;
                return;
              }

              var tabShortcut = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
              if (tabShortcut) {
                window.setTimeout(function() {
                  if (!event.defaultPrevented && clickTabShortcut(event)) event.preventDefault();
                }, 0);
                return;
              }

              if (window.__cpaKeyboardNavReady) {
                window.setTimeout(function() {
                  if (event.defaultPrevented) return;
                  var fallbackRoute = routeForShellKey(event);
                  if (fallbackRoute === null) return;
                  event.preventDefault();
                  navigateFallback(fallbackRoute);
                }, 0);
                return;
              }

              var route = routeForShellKey(event);
              if (route !== null) {
                event.preventDefault();
                navigateFallback(route);
              }
            });
          })();
        `,
      }}
    />
  )
}
