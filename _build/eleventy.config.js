module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/audio": "audio" });

  eleventyConfig.addFilter("readableDate", (value) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));

  eleventyConfig.addFilter("isoDate", (value) =>
    new Date(value).toISOString().slice(0, 10));

  // every distinct category used by a set of posts, so the filter bar builds itself and a new category
  // evil stuff ..
  eleventyConfig.addFilter("categoriesOf", (posts) =>
    [...new Set((posts || []).map((p) => p.data.category).filter(Boolean))].sort());

  return {
    pathPrefix: "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "../_build/includes",
      data: "../_build/data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
