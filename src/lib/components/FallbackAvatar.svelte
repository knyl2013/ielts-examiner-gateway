<script lang="ts">
    export let name: string;
    export let size = 40; // The size of the avatar in pixels

    // A predefined, nice-looking color palette.
    const colors = [
        '#ef4444', // Red
        '#f97316', // Orange
        '#eab308', // Yellow
        '#84cc16', // Lime
        '#22c55e', // Green
        '#14b8a6', // Teal
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#d946ef', // Fuchsia
        '#ec4899' // Pink
    ];

    /**
     * A simple hashing function to convert a string into a number.
     * This ensures that the same name always gets the same color.
     */
    function stringToHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    // Reactive statements: these re-run whenever 'name' changes.
    $: initial = name ? name.charAt(0).toUpperCase() : '?';
    $: backgroundColor = name ? colors[Math.abs(stringToHash(name)) % colors.length] : '#6b7280';
</script>

<div
    class="fallback-avatar"
    style="
    background-color: {backgroundColor};
    width: {size}px;
    height: {size}px;
    font-size: {size / 2}px;
  "
>
    <span class="initial">{initial}</span>
</div>

<style>
    .fallback-avatar {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        color: white;
        font-weight: 500;
        text-transform: uppercase;
        /* Prevents user from selecting the text */
        user-select: none;
    }
</style>