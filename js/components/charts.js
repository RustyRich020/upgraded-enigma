/* ============================================================
   components/charts.js — Chart.js factory with theme-aware colors
   ============================================================ */

const chartInstances = {};

/**
 * Get theme-aware colors from CSS variables.
 */
export function getThemeColors() {
  const style = getComputedStyle(document.body);
  const get = (prop, fallback) => style.getPropertyValue(prop).trim() || fallback;

  return {
    primary: get('--color-primary', '#ff1a1a'),
    primaryBright: get('--color-primary-bright', '#ff4040'),
    primaryDim: get('--color-primary-dim', 'rgba(255,26,26,0.1)'),
    accent: get('--color-accent', '#00e5ff'),
    accentDim: get('--color-accent-dim', 'rgba(0,229,255,0.1)'),
    success: get('--color-success', '#00ff6a'),
    successDim: get('--color-success-dim', 'rgba(0,255,106,0.1)'),
    warning: get('--color-warning', '#ff9500'),
    warningDim: get('--color-warning-dim', 'rgba(255,149,0,0.1)'),
    info: get('--color-info', '#3b82f6'),
    infoDim: get('--color-info-dim', 'rgba(59,130,246,0.1)'),
    danger: get('--color-danger', '#ff3b3b'),
    muted: get('--color-muted', '#5a5f72'),
    text: get('--color-text-dim', '#9da3b0'),
    textHeading: get('--color-text-heading', '#ffffff'),
    gridColor: get('--color-surface-border', '#1c1d2a'),
    surface: get('--color-surface', '#0f1018'),
    bg: get('--color-bg', '#050508'),
    // Pipeline-specific palette
    pipeline: {
      Saved: get('--color-primary', '#D4874D'),
      Applied: get('--color-warning', '#FBBF24'),
      Interview: get('--color-accent', '#4ECDC4'),
      Offer: get('--color-success', '#4ADE80'),
      Closed: get('--color-muted', '#6B6B76'),
    }
  };
}

/**
 * Create or recreate a Chart.js chart on a canvas element.
 */
export function makeChart(canvasId, config) {
  const Chart = window.Chart;
  if (!Chart) { console.warn('Chart.js not loaded'); return null; }

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const colors = getThemeColors();
  Chart.defaults.color = colors.text;
  Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.font.weight = 600;

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Destroy a chart by its canvas ID.
 */
export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

export default { makeChart, destroyChart, getThemeColors };
