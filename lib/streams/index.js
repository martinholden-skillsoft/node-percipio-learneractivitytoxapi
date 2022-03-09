const { jsonataTransformStream } = require('./transform.jsonata');
const { csvTransformStream } = require('./transform.csv');
const { xapienhancementTransformStream } = require('./transform.xapienhancement');
const { xapisendTransformStream } = require('./transform.xapisend');

module.exports = {
  jsonataTransformStream,
  csvTransformStream,
  xapienhancementTransformStream,
  xapisendTransformStream,
};
