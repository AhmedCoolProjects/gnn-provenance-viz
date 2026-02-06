const plugin = require('tailwindcss/plugin')

module.exports = plugin(function({ addUtilities }) {
  addUtilities({
    '.animate-in': {
      animation: 'animate-in 0.2s ease-out',
    },
    '.animate-out': {
      animation: 'animate-out 0.2s ease-in',
    },
  })
})
