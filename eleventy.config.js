module.exports = function (eleventyConfig) {
  // these are static assets, not templates: copy them across untouched
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("audio");

  // 2026-08-18 -> 18 August 2026
  eleventyConfig.addFilter("readableDate", (value) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));

  // 2026-08-18, for the <time datetime> attribute
  eleventyConfig.addFilter("isoDate", (value) =>
    new Date(value).toISOString().slice(0, 10));

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // lets .html files use nunjucks tags, which is what makes layouts work
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
