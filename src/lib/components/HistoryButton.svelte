<script>
    import { goto } from "$app/navigation";
</script>

<button class="historyButton" on:click={() => goto('/history')} aria-label="View History">
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z"
      fill="white"
    />
  </svg>
  <span class="tooltip">Show History</span>
</button>

<style>
  .historyButton {
    position: absolute;
    right: 95px;
    top: 14px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .historyButton:hover {
    opacity: 1;
  }

  /* Hide the tooltip by default */
  .historyButton .tooltip {
    visibility: hidden;
    opacity: 0;
    
    /* Tooltip appearance */
    width: max-content; /* Or a fixed width like 120px */
    background-color: #2e2e2e;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 14px;
    
    /* Position the tooltip */
    position: absolute;
    z-index: 1; /* Ensure it's on top of other elements */
    top: 125%; /* Position it below the button */
    left: 50%;
    transform: translateX(-50%); /* Center the tooltip horizontally */

    transition: opacity 0.2s ease;
  }
  
  .historyButton:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }
</style>