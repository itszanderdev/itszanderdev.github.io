module.exports = function (eleventyConfig) {
  // passthrough paths are relative to the project root, and the input dir is
  // stripped from the output path, so src/css lands at _site/css
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/audio": "audio" });

  // Date filters
  eleventyConfig.addFilter("readableDate", (value) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }));

  eleventyConfig.addFilter("isoDate", (value) =>
    new Date(value).toISOString().slice(0, 10));

  return {
    pathPrefix: "/",
    dir: {
      input: "src",
      output: "_site",
      // includes and data are resolved relative to dir.input, so these climb
      // back out of src/ to reach _build/
      includes: "../_build/includes",
      data: "../_build/data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
