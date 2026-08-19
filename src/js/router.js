const swup = new Swup({
  containers: ['#swup'],
  animationSelector: false,
  plugins: [
    // fetches the page as soon as you hover the link
    new SwupPreloadPlugin({
      preloadHoveredLinks: true,
      preloadVisibleLinks: false,
    }),
  ],
});
