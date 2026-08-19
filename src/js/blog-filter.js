document.addEventListener('click', (event) => {
  const button = event.target.closest('.filter[data-filter]');
  if (!button) return;

  const bar = button.closest('.filters');
  const scope = bar.closest('.panel-body') || document;
  const wanted = button.dataset.filter;

  bar.querySelectorAll('.filter').forEach((b) => {
    const on = b === button;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  if (wanted === 'all') {
    scope.style.removeProperty('--active-filter-colour');
  } else {
    const colour = getComputedStyle(button)
      .getPropertyValue('--head-color')
      .trim();

    scope.style.setProperty('--active-filter-colour', colour);
  }

  let shown = 0;

  scope.querySelectorAll('.card[data-category]').forEach((card) => {
    const match = wanted === 'all' || card.dataset.category === wanted;
    card.hidden = !match;
    if (match) shown++;
  });

  const empty = scope.querySelector('.no-matches');
  if (empty) empty.hidden = shown > 0;
});
