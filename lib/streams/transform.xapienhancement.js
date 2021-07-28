/* eslint-disable func-names */
const through2 = require('through2');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { accessSafe } = require('access-safe');

const xapienhancementTransformStream = (opts) => {
  const defaults = {
    objectMode: true,
    highWaterMark: 16,
    loggingOptions: {
      label: 'xapilookupTransformStream',
    },
  };

  const options = { ...defaults, ...opts };

  options.counter = 0;

  if (fs.existsSync(options.xapilookup)) {
    const xapilookuparray = JSON.parse(fs.readFileSync(options.xapilookup, 'utf8'));
    options.xapilookupmap = new Map(
      xapilookuparray.map((record) => [record.contentUuid, record.xapiobject])
    );
  } else {
    throw new Error(`xapilookupTransformStream. No such file or directory ${options.xapilookup}`);
  }

  const Th2 = through2.ctor(
    options,
    function (chunk, enc, callback) {
      let data = chunk;

      if (typeof chunk !== 'object' && chunk !== null) {
        data = JSON.parse(chunk);
      }

      // Create a new JSON object we merge with the Learner Activity JSON so we can transform it
      // If lookup fails default to a course activity
      const defaultxapiname = {};
      defaultxapiname[data.languageCode] = data.contentTitle;

      const defaultxapiobject = {
        objectType: 'Activity',
        id: `https://xapi.percipio.com/xapi/course/${data.contentUuid}`,
        definition: defaultxapiname,
        type: 'http://adlnet.gov/expapi/activities/course',
      };

      const xapiobjectlookup = {
        xapistatementid: uuidv4(),
        xapiobject: accessSafe(
          () => this.options.xapilookupmap.get(data.contentUuid),
          defaultxapiobject
        ),
      };

      try {
        const result = { ...data, ...xapiobjectlookup };

        this.options.counter += 1;
        this.emit('progress', this.options.counter);
        this.push(result, enc);
        return callback(null);
      } catch (error) {
        return callback(error);
      }
    },
    function (callback) {
      callback();
    }
  );

  return Th2();
};

module.exports = {
  xapienhancementTransformStream,
};
