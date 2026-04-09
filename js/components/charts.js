/* ============================================================
   components/charts.js — Chart.js factory and management
   ============================================================ */

const chartInstances = {};

/**
 * Get theme-aware colors from CSS variables or defaults.
 */
export function getThemeColors() {
  const style = getComputedStyle(document.body);
  return {
    red: style.getPropertyValue('--orange').trim() || '#ff0000',
    redDim: 'rgba(255,0,0,0.3)',
    green: style.getPropertyValue('--green').trim() || '#00ff41',
    greenDim: 'rgba(0,255,65,0.3)',
    blue: style.getPropertyValue('--blue').trim() || '#00bfff',
    blueDim: 'rgba(0,191,255,0.3)',
    orange: '#ff6600',
    orangeDim: 'rgba(255,102,0,0.3)',
    purple: '#bf00ff',
    purpleDim: 'rgba(191,0,255,0.3)',
    muted: style.getPropertyValue('--muted').trim() || '#808080',
    text: style.getPropertyValue('--white-dim').trim() || '#e0e0e0',
    gridColor: style.getPropertyValue('--grid').trim() || '#330000',
    bg: 'rgba(0,0,0,0)'
  };
}

/**
 * Create or recreate a Chart.js chart on a canvas element.
 * Destroys any existing chart on the same canvas first.
 * @param {string} canvasId — the canvas element's ID
 * @param {object} config — Chart.js configuration object
 * @returns {Chart|null} the Chart instance, or null if canvas not found
 */
export function makeChart(canvasId, config) {
  const Chart = window.Chart;
  if (!Chart) {
    console.warn('Chart.js not loaded');
    return null;
  }

  // Destroy existing chart on this canvas
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Apply default theme styles
  Chart.defaults.color = '#e0e0e0';
  Chart.defaults.font.family = 'Orbitron, sans-serif';
  Chart.defaults.font.size = 11;

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Destroy a chart by its canvas ID.
 * @param {string} canvasId — the canvas element's ID
 */
export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

export default { makeChart, destroyChart, getThemeColors };
