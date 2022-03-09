/* eslint-disable func-names */
const through2 = require('through2');
const _ = require('lodash');
const Axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Send Statement to LRS
 *
 * @param {*} options
 * @param {object} statement Valid xAPI statement
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise}
 */
const sendstatement = (options, statement, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const opts = _.cloneDeep(options);

    const axiosConfig = {
      baseURL: opts.lrs.endpoint,
      url: opts.lrs.endpoint,
      headers: {
        Authorization: opts.lrs.auth,
        'X-Experience-API-Version': '1.0.0',
        'Content-Type': 'application/json',
      },
      method: 'post',
      timeout: opts.lrs.timeout || 20000,
      correlationid: uuidv4(),
      data: statement,
    };

    axiosInstance
      .request(axiosConfig)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const xapisendTransformStream = (opts) => {
  const defaults = {
    objectMode: true,
    highWaterMark: 16,
    counter: 0,
    lrsconfig: null,
  };
  const { lrs, ratelimit } = opts;
  const options = { ...defaults, lrs, ratelimit };

  const destroy = () => {
    options.lrs = null;
  };

  const Th2 = through2.ctor(
    options,
    function (chunk, enc, callback) {
      let data = chunk;

      if (typeof chunk !== 'object' && chunk !== null) {
        data = JSON.parse(chunk);
      }

      try {
        this.options.counter += 1;
        this.emit('progress', this.options.counter);

        sendstatement(this.options, data)
          .then((result) => {
            this.push({ statement: data, status: result.status, lrsresponse: result.data }, enc);
            return callback(null);
          })
          .catch((err) => {
            return callback(err);
          });
        return;
      } catch (error) {
        callback(error);
      }
    },
    function (callback) {
      this.emit('flush');
      callback();
      destroy();
    }
  );

  return Th2();
};

module.exports = {
  xapisendTransformStream,
};
