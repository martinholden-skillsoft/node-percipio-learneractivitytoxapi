const { jsonataTransformStream } = require('./transform.jsonata');
const { csvTransformStream } = require('./transform.csv');
const { xapienhancementTransformStream } = require('./transform.xapienhancement');

module.exports = {
  jsonataTransformStream,
  csvTransformStream,
  xapienhancementTransformStream,
};
