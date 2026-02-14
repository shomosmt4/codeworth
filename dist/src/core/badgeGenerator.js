export function generateBadgeSvg(input) {
    const { label, valueText, color } = input;
    // Approximate character widths for simple auto-sizing
    // Verdana 11px: avg char width ~7px.
    // Label padding: 10px left, 10px right of text.
    // Value padding: 10px left, 10px right of text.
    const charWidth = 7;
    const labelWidth = Math.max(60, label.length * charWidth + 20);
    const valueWidth = Math.max(40, valueText.length * charWidth + 20);
    const totalWidth = labelWidth + valueWidth;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28">
  <defs>
    <style>
      .text { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .label { font-weight: 600; fill: #fff; }
      .value { font-weight: 700; fill: #fff; }
    </style>
  </defs>
  <g shape-rendering="crispEdges">
    <!-- Background -->
    <path fill="#2C2C2C" d="M0 0h${labelWidth}v28H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v28H${labelWidth}z"/>
    
    <!-- Rounded corners mask overlay (hack for crisp edges + rounding) -->
    <!-- Actually better to maintain paths with arcs if we want true rounding, but masking is easier for split colors -->
    <!-- Simpler approach: Rect with mask? Or just overlay corners? -->
    <!-- Let's use a clip path or mask for the whole group to ensure rounded corners -->
  </g>
  
  <!-- Re-drawing efficient rects with clean rounding -->
  <mask id="m">
    <rect width="${totalWidth}" height="28" rx="6" fill="#fff"/>
  </mask>

  <g mask="url(#m)">
    <rect x="0" y="0" width="${labelWidth}" height="28" fill="#333"/>
    <rect x="${labelWidth}" y="0" width="${valueWidth}" height="28" fill="${color}"/>
    
    <!-- Divider Line -->
    <rect x="${labelWidth}" y="4" width="1" height="20" fill="#fff" fill-opacity="0.1"/>
    
    <!-- Top Highlight (Premium feel) -->
    <rect x="0" y="0" width="${totalWidth}" height="1" fill="#fff" fill-opacity="0.1"/>
  </g>

  <!-- Text -->
  <g text-anchor="middle" dominant-baseline="middle" class="text">
    <text x="${labelWidth / 2}" y="15" class="label" font-size="11">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" class="value" font-size="11">${valueText}</text>
  </g>
</svg>`;
}
export function getGradeColor(grade) {
    switch (grade) {
        case 'A+': return '#16a34a'; // Bright Green
        case 'A': return '#22c55e'; // Green
        case 'B': return '#14b8a6'; // Teal
        case 'C': return '#f59e0b'; // Amber
        case 'D': return '#ea580c'; // Orange
        case 'F': return '#dc2626'; // Red
        default: return '#737373'; // Neutral Grey
    }
}
export function formatCurrency(value) {
    if (value < 1000)
        return `$${value}`;
    if (value < 1000000) {
        return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `$${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}
