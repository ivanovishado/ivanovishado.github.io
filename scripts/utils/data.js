/**
 * Calculate and display years of experience
 */
export function initYearsExperience() {
  const startDate = new Date(2018, 7, 1); // August 2018
  const now = new Date();
  const years = Math.floor((now - startDate) / (365.25 * 24 * 60 * 60 * 1000));

  const yearsEl = document.getElementById('years-experience');
  const footerYearsEl = document.getElementById('footer-years');

  if (yearsEl) yearsEl.textContent = years;
  if (footerYearsEl) footerYearsEl.textContent = years;
}
