(function () {
  const config = window.IORI_RAIN_CONFIG;
  if (!config?.available) return;

  const Home = window.IoriHome = window.IoriHome || {};
  const storageKey = 'iori_rain_effect_enabled';
  const targetSelector = '.search-input-target, .nav-btn, .site-card';
  let layer = null;
  let timer = null;
  let enabled = true;
  let resizeTimer = null;

  function readEnabledState() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === null ? config.defaultEnabled !== false : stored === '1';
    } catch {
      return config.defaultEnabled !== false;
    }
  }

  function isStyleOneActive() {
    const style = window.matchMedia('(max-width: 767px)').matches
      ? config.mobileStyle
      : config.desktopStyle;
    return style === 'style1';
  }

  function getTargets() {
    if (!isStyleOneActive()) return [];
    return Array.from(document.querySelectorAll(targetSelector)).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 12 && rect.height > 8 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
  }

  function clearTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function removeLayerContents() {
    if (layer) layer.replaceChildren();
  }

  function updateButton() {
    const button = document.getElementById('rainToggleBtn');
    if (!button) return;
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.classList.toggle('is-off', !enabled);
    button.title = enabled ? '关闭下雨效果' : '开启下雨效果';
    button.setAttribute('aria-label', button.title);
  }

  function setEnabled(nextEnabled, persist = true) {
    enabled = Boolean(nextEnabled);
    document.documentElement.classList.toggle('rain-effect-active', enabled && isStyleOneActive());
    updateButton();
    if (!enabled) {
      clearTimer();
      removeLayerContents();
      return;
    }
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, enabled ? '1' : '0');
      } catch {
        // Private browsing may reject localStorage; the in-memory state still works.
      }
    }
    scheduleDrop(500);
  }

  function createSplash(x, y) {
    if (!layer || !enabled || !isStyleOneActive()) return;
    const splash = document.createElement('span');
    splash.className = 'rain-splash';
    splash.style.left = `${x}px`;
    splash.style.top = `${y}px`;
    for (let index = 0; index < 3; index += 1) {
      const spray = document.createElement('i');
      spray.style.setProperty('--spray-angle', `${-55 + index * 55}deg`);
      spray.style.setProperty('--spray-distance', `${5 + Math.random() * 4}px`);
      splash.appendChild(spray);
    }
    layer.appendChild(splash);
    splash.addEventListener('animationend', () => splash.remove(), { once: true });
  }

  function createDrop() {
    timer = null;
    if (!enabled || document.hidden || !isStyleOneActive()) {
      scheduleDrop(1200);
      return;
    }
    const targets = getTargets();
    if (!targets.length) {
      scheduleDrop(1200);
      return;
    }

    const target = targets[Math.floor(Math.random() * targets.length)];
    const rect = target.getBoundingClientRect();
    const x = rect.left + Math.max(6, Math.random() * Math.max(8, rect.width - 12));
    const landingY = rect.top + 3 + Math.random() * Math.max(4, rect.height - 6);
    const startY = Math.max(-80, landingY - 100 - Math.random() * 90);
    const drop = document.createElement('span');
    drop.className = 'rain-drop';
    drop.style.left = `${x}px`;
    drop.style.top = `${startY}px`;
    drop.style.setProperty('--rain-distance', `${landingY - startY}px`);
    drop.style.setProperty('--rain-duration', `${420 + Math.random() * 260}ms`);
    layer.appendChild(drop);
    drop.addEventListener('animationend', () => {
      createSplash(x, landingY);
      drop.remove();
    }, { once: true });
    scheduleDrop(420 + Math.random() * 900);
  }

  function scheduleDrop(delay = 700) {
    clearTimer();
    if (!enabled) return;
    timer = window.setTimeout(createDrop, delay);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      clearTimer();
      return;
    }
    if (enabled) scheduleDrop(350);
  }

  function handleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      document.documentElement.classList.toggle('rain-effect-active', enabled && isStyleOneActive());
      removeLayerContents();
    }, 150);
  }

  function init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    layer = document.createElement('div');
    layer.id = 'rainEffectLayer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    document.getElementById('rainToggleBtn')?.addEventListener('click', () => setEnabled(!enabled));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize, { passive: true });
    enabled = readEnabledState();
    setEnabled(enabled, false);
  }

  Home.initRainEffect = init;
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
