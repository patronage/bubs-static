const cacheBuster = require('@mightyplow/eleventy-plugin-cache-buster');

module.exports = function(config) {

  // Add a date formatter filter to Nunjucks
  config.addFilter("dateDisplay", require("./filters/dates.js") );
  config.addFilter("timestamp", require("./filters/timestamp.js") );
  config.addFilter("squash", require("./filters/squash.js") );
  
  //config.addPassthroughCopy("src/img", "img");
  
  //add versioning to assets
  const cacheBusterOptions = {
    outputDirectory: 'dist'
  };
  config.addPlugin(cacheBuster(cacheBusterOptions));

  return {
    dir: {
      input: "src/site",
      output: "dist",
      includes: "_includes",
      data: "_data"
    },
    templateFormats : ["njk", "md"],
    htmlTemplateEngine : "njk",
    markdownTemplateEngine : "njk",
    passthroughFileCopy: true
  };

};
