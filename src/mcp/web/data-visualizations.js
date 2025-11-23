// Data Visualization Library
// Lightweight chart and graph components for data visualization

class DataVisualizations {
    constructor(mcp) {
        this.mcp = mcp;
        this.charts = new Map();
        this.defaultColors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316'  // orange
        ];
    }

    // Initialize visualization library
    init() {
        console.log('Data visualization library initialized');
    }

    // Create line chart
    createLineChart(containerId, data, options = {}) {
        const {
            title = '',
            width = 600,
            height = 300,
            showGrid = true,
            showLegend = true,
            smooth = false,
            colors = this.defaultColors,
            yAxisLabel = '',
            xAxisLabel = ''
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return null;
        }

        const padding = { top: 40, right: 20, bottom: 50, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Create SVG
        const svg = this.createSVG(width, height);
        container.innerHTML = '';
        container.appendChild(svg);

        // Add title
        if (title) {
            this.addText(svg, width / 2, 20, title, {
                fontSize: 16,
                fontWeight: 'bold',
                textAnchor: 'middle'
            });
        }

        // Calculate scales
        const xValues = data.labels || data[0].points.map((_, i) => i);
        const allYValues = data.datasets ?
            data.datasets.flatMap(d => d.data) :
            data.flatMap(d => d.points.map(p => p.y));

        const xScale = (i) => padding.left + (i / (xValues.length - 1)) * chartWidth;
        const yMin = Math.min(...allYValues, 0);
        const yMax = Math.max(...allYValues);
        const yRange = yMax - yMin || 1;
        const yScale = (val) => padding.top + chartHeight - ((val - yMin) / yRange) * chartHeight;

        // Draw grid
        if (showGrid) {
            this.drawGrid(svg, padding, chartWidth, chartHeight, xValues.length, 5);
        }

        // Draw axes
        this.drawAxes(svg, padding, chartWidth, chartHeight, xValues, yMin, yMax, xAxisLabel, yAxisLabel);

        // Draw lines
        const datasets = data.datasets || data.map((series, i) => ({
            label: series.label,
            data: series.points.map(p => p.y),
            color: colors[i % colors.length]
        }));

        datasets.forEach((dataset, i) => {
            const color = dataset.color || colors[i % colors.length];
            const points = dataset.data.map((val, j) => ({
                x: xScale(j),
                y: yScale(val)
            }));

            // Draw line
            if (smooth) {
                this.drawSmoothLine(svg, points, color);
            } else {
                this.drawPolyline(svg, points, color);
            }

            // Draw points
            points.forEach((point, j) => {
                this.addCircle(svg, point.x, point.y, 4, {
                    fill: color,
                    stroke: 'var(--bg-primary)',
                    strokeWidth: 2
                });

                // Add tooltip
                const circle = svg.lastChild;
                circle.style.cursor = 'pointer';
                circle.addEventListener('mouseenter', (e) => {
                    const value = dataset.data[j];
                    const label = xValues[j];
                    this.showTooltip(e, `${dataset.label}: ${value}`, `${label}`);
                });
                circle.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            });
        });

        // Draw legend
        if (showLegend && datasets.length > 1) {
            this.drawLegend(svg, datasets, width - padding.right - 120, padding.top);
        }

        const chart = { id: containerId, type: 'line', svg, data, options };
        this.charts.set(containerId, chart);

        return chart;
    }

    // Create bar chart
    createBarChart(containerId, data, options = {}) {
        const {
            title = '',
            width = 600,
            height = 300,
            showGrid = true,
            horizontal = false,
            colors = this.defaultColors,
            yAxisLabel = '',
            xAxisLabel = ''
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return null;

        const padding = { top: 40, right: 20, bottom: 50, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const svg = this.createSVG(width, height);
        container.innerHTML = '';
        container.appendChild(svg);

        if (title) {
            this.addText(svg, width / 2, 20, title, {
                fontSize: 16,
                fontWeight: 'bold',
                textAnchor: 'middle'
            });
        }

        const values = data.values || data.map(d => d.value);
        const labels = data.labels || data.map(d => d.label);

        const maxValue = Math.max(...values);
        const barWidth = chartWidth / values.length * 0.8;
        const barGap = chartWidth / values.length * 0.2;

        // Draw grid
        if (showGrid) {
            this.drawGrid(svg, padding, chartWidth, chartHeight, values.length, 5);
        }

        // Draw axes
        this.drawAxes(svg, padding, chartWidth, chartHeight, labels, 0, maxValue, xAxisLabel, yAxisLabel);

        // Draw bars
        values.forEach((value, i) => {
            const x = padding.left + i * (barWidth + barGap) + barGap / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            const color = colors[i % colors.length];

            const rect = this.addRect(svg, x, y, barWidth, barHeight, {
                fill: color,
                opacity: 0.8
            });

            rect.style.cursor = 'pointer';
            rect.addEventListener('mouseenter', (e) => {
                rect.setAttribute('opacity', '1');
                this.showTooltip(e, `${labels[i]}: ${value}`);
            });
            rect.addEventListener('mouseleave', () => {
                rect.setAttribute('opacity', '0.8');
                this.hideTooltip();
            });
        });

        const chart = { id: containerId, type: 'bar', svg, data, options };
        this.charts.set(containerId, chart);

        return chart;
    }

    // Create pie chart
    createPieChart(containerId, data, options = {}) {
        const {
            title = '',
            width = 400,
            height = 400,
            showLegend = true,
            showLabels = true,
            colors = this.defaultColors,
            donut = false,
            donutWidth = 60
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return null;

        const svg = this.createSVG(width, height);
        container.innerHTML = '';
        container.appendChild(svg);

        if (title) {
            this.addText(svg, width / 2, 30, title, {
                fontSize: 16,
                fontWeight: 'bold',
                textAnchor: 'middle'
            });
        }

        const values = data.values || data.map(d => d.value);
        const labels = data.labels || data.map(d => d.label);
        const total = values.reduce((sum, val) => sum + val, 0);

        const centerX = width / 2;
        const centerY = height / 2 + (title ? 10 : 0);
        const radius = Math.min(width, height) / 2 - 60;

        let currentAngle = -Math.PI / 2;

        values.forEach((value, i) => {
            const angle = (value / total) * 2 * Math.PI;
            const endAngle = currentAngle + angle;

            const color = colors[i % colors.length];

            // Draw slice
            const path = this.createPieSlice(centerX, centerY, radius, currentAngle, endAngle, donut ? radius - donutWidth : 0);

            const pathEl = this.addPath(svg, path, {
                fill: color,
                stroke: 'var(--bg-primary)',
                strokeWidth: 2,
                opacity: 0.9
            });

            pathEl.style.cursor = 'pointer';
            pathEl.addEventListener('mouseenter', (e) => {
                pathEl.setAttribute('opacity', '1');
                const percentage = ((value / total) * 100).toFixed(1);
                this.showTooltip(e, `${labels[i]}: ${value}`, `${percentage}%`);
            });
            pathEl.addEventListener('mouseleave', () => {
                pathEl.setAttribute('opacity', '0.9');
                this.hideTooltip();
            });

            // Draw label
            if (showLabels) {
                const midAngle = currentAngle + angle / 2;
                const labelRadius = radius * 0.7;
                const labelX = centerX + Math.cos(midAngle) * labelRadius;
                const labelY = centerY + Math.sin(midAngle) * labelRadius;

                const percentage = ((value / total) * 100).toFixed(0);
                this.addText(svg, labelX, labelY, `${percentage}%`, {
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#ffffff',
                    textAnchor: 'middle'
                });
            }

            currentAngle = endAngle;
        });

        // Draw legend
        if (showLegend) {
            const legendX = 20;
            const legendY = height - labels.length * 25 - 20;

            labels.forEach((label, i) => {
                const y = legendY + i * 25;

                this.addRect(svg, legendX, y, 15, 15, {
                    fill: colors[i % colors.length]
                });

                this.addText(svg, legendX + 25, y + 12, label, {
                    fontSize: 12
                });
            });
        }

        const chart = { id: containerId, type: 'pie', svg, data, options };
        this.charts.set(containerId, chart);

        return chart;
    }

    // Create progress bar
    createProgressBar(containerId, value, options = {}) {
        const {
            max = 100,
            height = 30,
            showLabel = true,
            color = '#3b82f6',
            backgroundColor = 'rgba(59, 130, 246, 0.1)',
            animated = true
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return null;

        const percentage = Math.min(100, Math.max(0, (value / max) * 100));

        container.innerHTML = `
            <div style="position: relative; width: 100%; height: ${height}px; background: ${backgroundColor}; border-radius: ${height / 2}px; overflow: hidden;">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: ${percentage}%;
                    background: ${color};
                    border-radius: ${height / 2}px;
                    ${animated ? 'transition: width 0.5s ease;' : ''}
                "></div>
                ${showLabel ? `
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: ${height * 0.5}px;
                        font-weight: 600;
                        color: ${percentage > 50 ? '#ffffff' : 'var(--text-primary)'};
                    ">
                        ${percentage.toFixed(1)}%
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Create sparkline (mini line chart)
    createSparkline(containerId, values, options = {}) {
        const {
            width = 100,
            height = 30,
            color = '#3b82f6',
            lineWidth = 2,
            showDots = false
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return null;

        const svg = this.createSVG(width, height);
        container.innerHTML = '';
        container.appendChild(svg);

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((val, i) => ({
            x: (i / (values.length - 1)) * width,
            y: height - ((val - min) / range) * height
        }));

        this.drawPolyline(svg, points, color, lineWidth);

        if (showDots) {
            points.forEach(point => {
                this.addCircle(svg, point.x, point.y, 2, {
                    fill: color
                });
            });
        }
    }

    // Helper: Create SVG element
    createSVG(width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        return svg;
    }

    // Helper: Add rectangle
    addRect(svg, x, y, width, height, attrs = {}) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);

        Object.entries(attrs).forEach(([key, value]) => {
            rect.setAttribute(key, value);
        });

        svg.appendChild(rect);
        return rect;
    }

    // Helper: Add circle
    addCircle(svg, cx, cy, r, attrs = {}) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);

        Object.entries(attrs).forEach(([key, value]) => {
            circle.setAttribute(key, value);
        });

        svg.appendChild(circle);
        return circle;
    }

    // Helper: Add text
    addText(svg, x, y, text, attrs = {}) {
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', x);
        textEl.setAttribute('y', y);
        textEl.textContent = text;

        const defaults = {
            fill: 'var(--text-primary)',
            fontSize: 12
        };

        Object.entries({ ...defaults, ...attrs }).forEach(([key, value]) => {
            if (key === 'fontSize') {
                textEl.setAttribute('font-size', value);
            } else if (key === 'fontWeight') {
                textEl.setAttribute('font-weight', value);
            } else if (key === 'textAnchor') {
                textEl.setAttribute('text-anchor', value);
            } else {
                textEl.setAttribute(key, value);
            }
        });

        svg.appendChild(textEl);
        return textEl;
    }

    // Helper: Add path
    addPath(svg, d, attrs = {}) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);

        Object.entries(attrs).forEach(([key, value]) => {
            path.setAttribute(key, value);
        });

        svg.appendChild(path);
        return path;
    }

    // Helper: Add line
    addLine(svg, x1, y1, x2, y2, attrs = {}) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);

        Object.entries(attrs).forEach(([key, value]) => {
            line.setAttribute(key, value);
        });

        svg.appendChild(line);
        return line;
    }

    // Helper: Draw polyline
    drawPolyline(svg, points, color, strokeWidth = 2) {
        const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', pointsStr);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', strokeWidth);
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polyline);
        return polyline;
    }

    // Helper: Draw smooth line (cubic bezier)
    drawSmoothLine(svg, points, color) {
        if (points.length < 2) return;

        let pathData = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const current = points[i];

            const cpx1 = prev.x + (current.x - prev.x) / 3;
            const cpy1 = prev.y;
            const cpx2 = prev.x + 2 * (current.x - prev.x) / 3;
            const cpy2 = current.y;

            pathData += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${current.x} ${current.y}`;
        }

        this.addPath(svg, pathData, {
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        });
    }

    // Helper: Create pie slice path
    createPieSlice(cx, cy, radius, startAngle, endAngle, innerRadius = 0) {
        const x1 = cx + Math.cos(startAngle) * radius;
        const y1 = cy + Math.sin(startAngle) * radius;
        const x2 = cx + Math.cos(endAngle) * radius;
        const y2 = cy + Math.sin(endAngle) * radius;

        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

        if (innerRadius === 0) {
            return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        } else {
            const x3 = cx + Math.cos(endAngle) * innerRadius;
            const y3 = cy + Math.sin(endAngle) * innerRadius;
            const x4 = cx + Math.cos(startAngle) * innerRadius;
            const y4 = cy + Math.sin(startAngle) * innerRadius;

            return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
        }
    }

    // Helper: Draw grid
    drawGrid(svg, padding, width, height, xDivisions, yDivisions) {
        const gridAttrs = {
            stroke: 'var(--border-color)',
            strokeWidth: 1,
            opacity: 0.3
        };

        // Vertical lines
        for (let i = 0; i <= xDivisions; i++) {
            const x = padding.left + (i / xDivisions) * width;
            this.addLine(svg, x, padding.top, x, padding.top + height, gridAttrs);
        }

        // Horizontal lines
        for (let i = 0; i <= yDivisions; i++) {
            const y = padding.top + (i / yDivisions) * height;
            this.addLine(svg, padding.left, y, padding.left + width, y, gridAttrs);
        }
    }

    // Helper: Draw axes
    drawAxes(svg, padding, width, height, xLabels, yMin, yMax, xAxisLabel, yAxisLabel) {
        const axisAttrs = {
            stroke: 'var(--text-secondary)',
            strokeWidth: 2
        };

        // X-axis
        this.addLine(svg, padding.left, padding.top + height, padding.left + width, padding.top + height, axisAttrs);

        // Y-axis
        this.addLine(svg, padding.left, padding.top, padding.left, padding.top + height, axisAttrs);

        // X-axis labels
        xLabels.forEach((label, i) => {
            const x = padding.left + (i / (xLabels.length - 1)) * width;
            this.addText(svg, x, padding.top + height + 20, label, {
                fontSize: 10,
                textAnchor: 'middle',
                fill: 'var(--text-secondary)'
            });
        });

        // Y-axis labels
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const y = padding.top + height - (i / ySteps) * height;
            const value = yMin + (i / ySteps) * (yMax - yMin);

            this.addText(svg, padding.left - 10, y + 4, value.toFixed(0), {
                fontSize: 10,
                textAnchor: 'end',
                fill: 'var(--text-secondary)'
            });
        }

        // Axis labels
        if (xAxisLabel) {
            this.addText(svg, padding.left + width / 2, padding.top + height + 40, xAxisLabel, {
                fontSize: 11,
                textAnchor: 'middle',
                fontWeight: 'bold',
                fill: 'var(--text-secondary)'
            });
        }

        if (yAxisLabel) {
            const text = this.addText(svg, 15, padding.top + height / 2, yAxisLabel, {
                fontSize: 11,
                textAnchor: 'middle',
                fontWeight: 'bold',
                fill: 'var(--text-secondary)'
            });
            text.setAttribute('transform', `rotate(-90, 15, ${padding.top + height / 2})`);
        }
    }

    // Helper: Draw legend
    drawLegend(svg, datasets, x, y) {
        datasets.forEach((dataset, i) => {
            const legendY = y + i * 20;

            this.addRect(svg, x, legendY, 15, 15, {
                fill: dataset.color
            });

            this.addText(svg, x + 20, legendY + 12, dataset.label, {
                fontSize: 11
            });
        });
    }

    // Show tooltip
    showTooltip(event, primary, secondary = '') {
        let tooltip = document.getElementById('chart-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                pointer-events: none;
                z-index: 10006;
                box-shadow: var(--shadow-md);
                display: none;
            `;
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <div style="font-weight: 600;">${primary}</div>
            ${secondary ? `<div style="color: var(--text-secondary); margin-top: 2px;">${secondary}</div>` : ''}
        `;

        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    }

    // Hide tooltip
    hideTooltip() {
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Update chart data
    updateChart(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        // Recreate chart with new data
        switch (chart.type) {
            case 'line':
                this.createLineChart(chartId, newData, chart.options);
                break;
            case 'bar':
                this.createBarChart(chartId, newData, chart.options);
                break;
            case 'pie':
                this.createPieChart(chartId, newData, chart.options);
                break;
        }
    }

    // Destroy chart
    destroyChart(chartId) {
        this.charts.delete(chartId);
        const container = document.getElementById(chartId);
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Initialize data visualizations when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.dataViz = new DataVisualizations(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dataViz.init();
        });
    } else {
        window.dataViz.init();
    }

    // Add methods to global mcp object
    window.mcp.createChart = (type, containerId, data, options) => {
        switch (type) {
            case 'line':
                return window.dataViz.createLineChart(containerId, data, options);
            case 'bar':
                return window.dataViz.createBarChart(containerId, data, options);
            case 'pie':
                return window.dataViz.createPieChart(containerId, data, options);
            case 'progress':
                return window.dataViz.createProgressBar(containerId, data, options);
            case 'sparkline':
                return window.dataViz.createSparkline(containerId, data, options);
            default:
                console.error('Unknown chart type:', type);
                return null;
        }
    };
}
