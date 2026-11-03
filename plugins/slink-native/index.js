// Android-only плагин: веб-часть нужна только как мост к нативным методам.
const { registerPlugin } = require('@capacitor/core');

const SlinkNative = registerPlugin('SlinkNative');

module.exports = { SlinkNative };
