<script lang="ts">
	import { goto } from '$app/navigation';
	import type { HistoryEntry } from '../../types/ChatHistory';

	export let data: HistoryEntry[] = [];

	// The data comes sorted newest-to-oldest. For plotting, we need oldest-to-newest.
	$: plotData = [...data].reverse();

	// --- State for interactivity ---
	let hoveredData: HistoryEntry | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	// SVG dimensions and padding
	const width = 500;
	const height = 180;
	const padding = { top: 20, right: 10, bottom: 30, left: 25 };
	const yAxisMax = 9; // IELTS max score

	const maxVisibleLabels = 8;
    $: labelStep = Math.max(1, Math.ceil(plotData.length / maxVisibleLabels));

	// Calculate the points for the line graph
	$: points = plotData
		.map((d, i) => {
			const x =
				padding.left + (i * (width - padding.left - padding.right)) / (plotData.length - 1 || 1);
			const y =
				height -
				padding.bottom -
				(d.overallScore / yAxisMax) * (height - padding.top - padding.bottom);
			return `${x},${y}`;
		})
		.join(' ');

	function handleMouseEnter(entry: HistoryEntry, event: MouseEvent) {
		hoveredData = entry;
		tooltipX = event.clientX - 100;
		tooltipY = event.clientY - 200;
	}

	function handleMouseLeave() {
		hoveredData = null;
	}

	function handlePointClick(reportId: string) {
		if (reportId) {
			goto(`/report/${encodeURIComponent(reportId)}`);
		}
	}

	// Helper to format dates for the tooltip
	const formatTooltipDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

<div class="chartWrapper">
	<svg
		viewBox="0 0 {width} {height}"
		preserveAspectRatio="xMidYMid meet"
		aria-label="Score progression chart"
	>
		<!-- Y-Axis labels and grid lines -->
		{#each [3, 6, 9] as score}
			{@const y =
				height - padding.bottom - (score / yAxisMax) * (height - padding.top - padding.bottom)}
			<g class="grid">
				<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
				<text x={padding.left - 8} y={y + 4} class="axisLabel">{score}</text>
			</g>
		{/each}

		<!-- X-Axis Line -->
		<line
			x1={padding.left}
			y1={height - padding.bottom}
			x2={width - padding.right}
			y2={height - padding.bottom}
			class="axisLine"
		/>

		<!-- Data Line -->
		{#if points}
			<polyline class="dataLine" {points} />
		{/if}

		<!-- Data Points, Labels, and INTERACTION LAYERS -->
		{#each plotData as d, i}
			{@const x =
				padding.left + (i * (width - padding.left - padding.right)) / (plotData.length - 1 || 1)}
			{@const y =
				height -
				padding.bottom -
				(d.overallScore / yAxisMax) * (height - padding.top - padding.bottom)}

			<!-- Visible point circle, highlighted on hover -->
			<circle
				cx={x}
				cy={y}
				r="4"
				class="dataPoint"
				class:active={hoveredData?.id === d.id}
				on:mouseenter={(e) => handleMouseEnter(d, e)}
				on:mouseleave={handleMouseLeave}
				on:click={() => handlePointClick(d.id)}
			/>

			<!-- Date label on X-axis -->
			{#if i % labelStep === 0}
				<text {x} y={height - padding.bottom + 15} class="axisLabel dateLabel">
					{new Date(d.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
				</text>
			{/if}
		{/each}
	</svg>

	<!-- Tooltip Element -->
	{#if hoveredData}
		<div class="tooltip" style="--x:{tooltipX}px; --y:{tooltipY}px;">
			<div class="tooltip-score">{hoveredData.overallScore.toFixed(1)}</div>
			<div class="tooltip-date">{formatTooltipDate(hoveredData.date)}</div>
		</div>
	{/if}
</div>

<style>
	/* Make the wrapper a positioning context for the tooltip */
	.chartWrapper {
		position: relative;
		width: 100%;
		height: auto;
	}
	svg {
		display: block;
		width: 100%;
	}
	.grid line {
		stroke: rgba(255, 255, 255, 0.1);
		stroke-width: 1;
		stroke-dasharray: 2, 3;
	}
	.axisLine {
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 1;
	}
	.axisLabel {
		font-size: 10px;
		fill: #c7c7cc;
		text-anchor: middle;
	}
	.dateLabel {
		font-size: 9px;
	}
	.dataLine {
		fill: none;
		stroke: #34c759;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.dataPoint {
		fill: #ffffff;
		stroke: #34c759;
		stroke-width: 2;
		transition: r 0.2s ease; /* Smooth transition for size change */
		cursor: pointer;
	}

	/* Highlight the hovered data point */
	.dataPoint.active {
		r: 6; /* Make the circle larger */
	}

	/* Tooltip styling */
	.tooltip {
		position: absolute;
		left: var(--x);
		top: var(--y);
		background: #2c2c2e;
		color: white;
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 0.8rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		pointer-events: none; /* So the tooltip doesn't block mouse events on the chart */
		white-space: nowrap;
		text-align: center;
		transition: opacity 0.2s;
		z-index: 10;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.tooltip-score {
		font-weight: 600;
		font-size: 1rem;
	}

	.tooltip-date {
		color: #c7c7cc;
		font-size: 0.7rem;
	}
</style>
