export function ThemeInitScript() {
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
            var map = { h: '/', r: '/record', s: '/pipeline', v: '/review', y: '/topics', u: '/study', a: '/anki', l: '/library', t: '/settings' };
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
            window.__cpaKeyboardNavReady = false;
            window.addEventListener('keydown', function(event) {
              if (window.__cpaKeyboardNavReady || isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
              var key = String(event.key || '').toLowerCase();
              if (waitingForSecond) {
                if (map[key]) {
                  event.preventDefault();
                  window.location.assign(map[key]);
                }
                clearSecond();
                return;
              }
              if (key === 'g') {
                event.preventDefault();
                waitingForSecond = true;
                timeout = window.setTimeout(clearSecond, 1000);
                return;
              }
              if (map[key]) {
                event.preventDefault();
                window.location.assign(map[key]);
              }
            });
          })();
        `,
      }}
    />
  )
}
