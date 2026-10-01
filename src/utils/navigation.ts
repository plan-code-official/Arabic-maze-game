export const handleExitSite = () => {
  // Return to the portal when the game was opened from an existing page.
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Direct visits in a new tab need a safe root fallback.
    window.location.href = '/';
  }
};
