// Using explicit require() so Turbopack's PostCSS worker resolves modules
// relative to this file's directory (project root), not from its own worker context.
module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
