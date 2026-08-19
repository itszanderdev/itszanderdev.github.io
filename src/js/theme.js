const root = document.documentElement;
const button = document.getElementById('theme-toggle');

function current() {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(mode) {
  if (mode === 'light') {
    root.dataset.theme = 'light';
  } else {
    delete root.dataset.theme;
  }

  try { localStorage.setItem('theme', mode); } catch (e) {}

  // the voronoi bakes primary-color into its palette so it needs telling
  window.dispatchEvent(new CustomEvent('themechange'));
}

button.addEventListener('click', () => {
  apply(current() === 'light' ? 'dark' : 'light');
});
