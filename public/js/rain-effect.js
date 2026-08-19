(function () {
  const config = window.IORI_RAIN_CONFIG;
  if (!config?.available) return;

  const Home = window.IoriHome = window.IoriHome || {};
  const storageKey = 'iori_rain_effect_enabled';
  const targetSelector = '.search-input-target, .nav-btn, .site-card';
  const MIN_RAIN_DENSITY = 20;
  const MAX_RAIN_DENSITY = 200;
  const MAX_ACTIVE_RAIN_NODES = 600;
  const TARGETED_RAIN_RATIO = 0.7;
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

  function isRainEffectEnabledForViewport() {
    return window.matchMedia('(max-width: 767px)').matches
      ? config.mobileEnabled === true
      : config.desktopEnabled === true;
  }

  function getRainSize() {
    const configured = Number(config.dropSize);
    if (!Number.isFinite(configured)) return 12;
    return Math.min(32, Math.max(8, configured));
  }

  function getRainDensity() {
    const configured = Number(config.density);
    if (!Number.isFinite(configured)) return MIN_RAIN_DENSITY;
    return Math.min(MAX_RAIN_DENSITY, Math.max(MIN_RAIN_DENSITY, configured));
  }

  function getRainSurfaces() {
    if (!isRainEffectEnabledForViewport()) return null;
    return Array.from(document.querySelectorAll(targetSelector))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => (
        rect.width > 12
        && rect.height > 8
        && rect.bottom > 0
        && rect.top < window.innerHeight
      ))
      .sort((a, b) => a.rect.top - b.rect.top);
  }

  function getRandomRainSurface() {
    const surfaces = getRainSurfaces();
    return surfaces?.length
      ? surfaces[Math.floor(Math.random() * surfaces.length)]
      : null;
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
    const isAvailable = isRainEffectEnabledForViewport();
    button.style.display = isAvailable ? '' : 'none';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.classList.toggle('is-off', !enabled);
    button.title = enabled ? '关闭飞雪效果' : '开启飞雪效果';
    button.setAttribute('aria-label', button.title);
  }

  function setEnabled(nextEnabled, persist = true) {
    enabled = Boolean(nextEnabled);
    const isAvailable = isRainEffectEnabledForViewport();
    document.documentElement.classList.toggle('rain-effect-active', enabled && isAvailable);
    updateButton();
    if (!enabled || !isAvailable) {
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
    scheduleNextDrop(500);
  }

  function createDrop() {
    timer = null;
    if (!enabled || document.hidden || !isRainEffectEnabledForViewport()) {
      clearTimer();
      return;
    }
    if (!layer || layer.childElementCount >= MAX_ACTIVE_RAIN_NODES) {
      scheduleDrop(24);
      return;
    }

    const size = getRainSize();
    const width = Math.max(1, window.innerWidth);
    const surface = Math.random() < TARGETED_RAIN_RATIO
      ? getRandomRainSurface()
      : null;
    const x = surface
      ? surface.rect.left + Math.random() * surface.rect.width
      : Math.random() * width;
    const startY = -size * 3 - Math.random() * Math.max(40, window.innerHeight * 0.18);
    const impactRatio = surface ? (0.12 + Math.random() * 0.76) : null;
    const impactY = surface
      ? surface.rect.top + surface.rect.height * impactRatio
      : null;
    const landingY = surface
      ? Math.max(startY + 24, impactY - size * 2.2)
      : window.innerHeight + size * 3;
    const distance = landingY - startY;
    const duration = Math.max(1800, Math.min(4200, distance * 2.8));
    const drop = document.createElement('span');
    drop.className = 'rain-drop snowflake';
    drop.style.width = `${Math.max(3, size * 0.55)}px`;
    drop.style.height = `${Math.max(3, size * 0.55)}px`;
    drop.style.marginLeft = `${-Math.max(3, size * 0.55) / 2}px`;
    drop.style.left = `${x}px`;
    drop.style.top = `${startY}px`;
    drop.style.setProperty('--rain-distance', `${distance}px`);
    drop.style.setProperty('--rain-duration', `${duration}ms`);
    drop.style.setProperty('--snow-drift', `${(Math.random() - 0.5) * Math.max(50, window.innerWidth * 0.18)}px`);
    drop.style.setProperty('--snow-sway', `${(Math.random() - 0.5) * 28}px`);
    layer.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove(), { once: true });
    scheduleNextDrop();
  }

  function scheduleDrop(delay = 700) {
    clearTimer();
    if (!enabled) return;
    timer = window.setTimeout(createDrop, delay);
  }

  function scheduleNextDrop(initialDelay) {
    const baseDelay = initialDelay ?? (420 + Math.random() * 900);
    scheduleDrop(Math.max(6, baseDelay / getRainDensity()));
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      clearTimer();
      return;
    }
    if (enabled && isRainEffectEnabledForViewport()) scheduleNextDrop(350);
  }

  function handleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const isAvailable = isRainEffectEnabledForViewport();
      document.documentElement.classList.toggle('rain-effect-active', enabled && isAvailable);
      updateButton();
      removeLayerContents();
      if (enabled && isAvailable) scheduleNextDrop(150);
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
