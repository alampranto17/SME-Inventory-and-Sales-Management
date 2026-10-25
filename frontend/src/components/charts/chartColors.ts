// Chart colors in ONE place, so every graph in the app looks the same.
// These colors were checked to be readable for color-blind people too.
export const CHART_COLORS = {
  series1: "#2a78d6", // blue   -> main value (sales, stock)
  series2: "#eb6834", // orange -> second value (reorder level)
  grid: "#e2e8f0", // light gray lines
  axis: "#64748b", // gray axis text
};

// text style used for axis labels
export const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 12 };
