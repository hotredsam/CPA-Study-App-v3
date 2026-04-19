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
            if (s.accentHue !== undefined) document.documentElement.style.setProperty('--accent-hue', s.accentHue);
          } catch(_) {}
        `,
      }}
    />
  )
}
