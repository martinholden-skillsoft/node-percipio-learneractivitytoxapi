require('dotenv-safe').config();

const config = require('config');
const Axios = require('axios');
const createError = require('axios/lib/core/createError');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const stringifySafe = require('json-stringify-safe');
const Combiner = require('stream-combiner');
const JSONStream = require('jsonstream2');
const rateLimit = require('axios-rate-limit');
const rax = require('retry-axios');
const { accessSafe } = require('access-safe');
const { v4: uuidv4 } = require('uuid');

const { transports } = require('winston');
const logger = require('./lib/logger');

const pjson = require('./package.json');

const {
  jsonataTransformStream,
  xapienhancementTransformStream,
  xapisendTransformStream,
} = require('./lib/streams');
const timingAdapter = require('./lib/timingAdapter');

/**
 * Process the template string and replace the path values
 *
 * @param {string} templateString
 * @param {*} templateVars
 * @return {string}
 */
const processTemplate = (templateString, templateVars) => {
  const compiled = _.template(templateString.replace(/{/g, '${'));
  return compiled(templateVars);
};

/**
 * Call Percipio API
 *
 * @param {*} options
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise}
 */
const callPercipio = (options, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const opts = _.cloneDeep(options);
    const requestUri = processTemplate(opts.request.uritemplate, opts.request.path);

    let requestParams = opts.request.query || {};
    requestParams = _.omitBy(requestParams, _.isNil);

    let requestBody = opts.request.body || {};
    requestBody = _.omitBy(requestBody, _.isNil);

    const axiosConfig = {
      baseURL: opts.request.baseURL,
      url: requestUri,
      headers: {
        Authorization: `Bearer ${opts.request.bearer}`,
      },
      method: opts.request.method,
      timeout: opts.request.timeout || 2000,
      correlationid: uuidv4(),
      logger,
    };

    if (!_.isEmpty(requestBody)) {
      axiosConfig.data = requestBody;
    }

    if (!_.isEmpty(requestParams)) {
      axiosConfig.params = requestParams;
    }

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

/**
 * Submit the report request
 *
 * @param {*} options
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise} Promise object resolves to obect with total and pagingRequestId.
 */
const submitReport = (options, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'submitReport',
    };

    const opts = _.cloneDeep(options);
    opts.request = opts.reportrequest;

    callPercipio(opts, axiosInstance)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        logger.error(err, loggingOptions);
        reject(err);
      });
  });
};

/**
 * Poll for the specified reportRequestId
 *
 * @param {*} options
 * @param {*} reportRequestId
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise} Resolves to the report response
 */
const pollForReport = async (options, reportRequestId, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'pollForReport',
    };

    const opts = _.cloneDeep(options);
    opts.request = opts.pollrequest;
    opts.request.path.reportRequestId = reportRequestId;
    opts.request.uritemplate = `/reporting/v1/organizations/${opts.request.path.orgId}/report-requests/${opts.request.path.reportRequestId}`;

    callPercipio(opts, axiosInstance)
      .then((response) => {
        // If response.data.status not present in JSON we are receiving the JSON results so return
        if (_.isUndefined(response.data.status)) {
          resolve(response);
        }
      })
      .catch((err) => {
        logger.error(err, loggingOptions);
        reject(err);
      });
  });
};

/**
 * Read an existing JSON file
 *
 * @param {*} options
 * @returns {Promise} resolves to boolean to indicate if results saved and the filename
 */
const readJSONAndTransform = (options, source) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'readJSONAndTransform',
    };

    const opts = _.cloneDeep(options);

    const filename = `${opts.output.filename || 'result'}_transformed.json`;

    const outputFile = Path.join(options.output.path, filename);
    opts.logcount = opts.logcount || 1000;

    // Move homepage to JSONata bindings
    opts.jsonataBinding = { homepage: opts.homepage };

    let loadedRecords = 0;

    const inputStream = fs.createReadStream(source);
    // When we read in the Array, we want to emit a "data" event for every item in
    // the serialized record-set. As such, we are going to use the path "*".
    const parseJSONStream = JSONStream.parse('*');
    const jsonataStream = jsonataTransformStream(opts);
    // A stream that adds xapi data to each Learner Activity record
    const xapienhancementStream = xapienhancementTransformStream(opts);

    const xapisendStream = xapisendTransformStream(opts);

    // JSON Stringify transformed data
    const processTransformedJSON = JSONStream.stringify();
    const outputStream = fs.createWriteStream(outputFile);

    parseJSONStream.on('data', () => {
      if (loadedRecords !== 0 && loadedRecords % opts.logcount === 0) {
        logger.info(`Processing. Processed: ${loadedRecords.toLocaleString()}`, {
          label: `${loggingOptions.label}-parseJSONStream`,
        });
      }
      loadedRecords += 1;
    });

    outputStream.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    jsonataStream.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    processTransformedJSON.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    xapisendStream.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    jsonataStream.on('progress', (counter) => {
      if (counter % opts.logcount === 0) {
        logger.info(`Processing. Processed: ${counter.toLocaleString()}`, {
          label: `${loggingOptions.label}-jsonataStream`,
        });
      }
    });

    xapienhancementStream.on('progress', (counter) => {
      if (counter % opts.logcount === 0) {
        logger.info(`Processing. Processed: ${counter.toLocaleString()}`, {
          label: `${loggingOptions.label}-xapienhancementStream`,
        });
      }
    });

    xapisendStream.on('progress', (counter) => {
      if (counter % opts.logcount === 0) {
        logger.info(`Processing. Processed: ${counter.toLocaleString()}`, {
          label: `${loggingOptions.label}-xapisendStream`,
        });
      }
    });

    outputStream.on('finish', () => {
      let saved = false;

      if (loadedRecords === 0) {
        logger.info('No records downloaded', loggingOptions);
        fs.unlinkSync(outputFile);
      }

      if (loadedRecords > 0) {
        logger.info(`Total Records Downloaded: ${loadedRecords.toLocaleString()}`, loggingOptions);
        saved = true;
        logger.info(`Records Saved. Path: ${outputFile}`, loggingOptions);
      }

      resolve({
        saved,
        outputFile,
      });
    });

    const chain = new Combiner([
      inputStream,
      parseJSONStream,
      xapienhancementStream,
      jsonataStream,
      xapisendStream,
      processTransformedJSON,
      outputStream,
    ]);
    chain.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });
  });
};

/**
 * Call the API to generate the report, and the poll for it
 * pass thru a stream and return the path to the file
 *
 * @param {*} options
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {string} file path
 */
const getAllReportDataAndSave = async (options, axiosInstance = Axios) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const loggingOptions = {
      label: 'getAllReportDataAndSave',
    };

    const filename = `${options.output.filename || 'result'}.json`;

    const outputFile = Path.join(options.output.path, filename);

    try {
      submitReport(options, axiosInstance)
        .then((submitResponse) => {
          options.logger.info(`Report Id: ${submitResponse.data.id}`, loggingOptions);
          pollForReport(options, submitResponse.data.id, axiosInstance)
            .then((reportResponse) => {
              // Handle a JSON response
              if (_.isObject(reportResponse.data) && !_.isString(reportResponse.data)) {
                options.logger.info(
                  `Records Downloaded ${reportResponse.data.length.toLocaleString()}`,
                  loggingOptions
                );

                const outputStream = fs.createWriteStream(outputFile);

                outputStream.on('finish', () => {
                  options.logger.info(`Records Saved. Path: ${outputFile}`, loggingOptions);

                  if (!_.isEmpty(accessSafe(() => options.transform, null))) {
                    readJSONAndTransform(options, outputFile).then((transformedResponse) => {
                      options.logger.info(
                        `Transformed Records Saved. Path: ${transformedResponse.outputFile}`,
                        loggingOptions
                      );
                      resolve(transformedResponse.outputFile);
                    });
                  } else {
                    resolve(outputFile);
                  }
                });

                outputStream.write(stringifySafe(reportResponse.data, null, 2));
                outputStream.end();
              } else if (!_.isObject(reportResponse.data) && _.isString(reportResponse.data)) {
                // Handle a CSV response
                options.logger.info(
                  `Records Downloaded. Download Size: ${reportResponse.data.length.toLocaleString()} bytes`,
                  loggingOptions
                );
                const outputStream = fs.createWriteStream(outputFile);

                outputStream.on('finish', () => {
                  options.logger.info(`Records Saved. Path: ${outputFile}`, loggingOptions);
                  resolve(outputFile);
                });

                outputStream.write(reportResponse.data);
                outputStream.end();
              } else {
                options.logger.warn(
                  'Response is not valid JSON or CSV. No results file created.',
                  loggingOptions
                );
                resolve(null);
              }
            })
            .catch((err) => {
              options.logger.error(
                `${err} Details: ${stringifySafe(accessSafe(() => err.response.data, ''))}`,
                loggingOptions
              );
              reject(err);
            });
        })
        .catch((err) => {
          options.logger.error(err, loggingOptions);
          reject(err);
        });
    } catch (err) {
      options.logger.error('Trying to generate report results', loggingOptions);
      reject(err);
    }
  });
};

/**
 * Process the Percipio call
 *
 * @param {*} options
 * @returns
 */
const main = async (configOptions) => {
  const loggingOptions = {
    label: 'main',
  };

  const options = configOptions || null;

  options.logger = logger;

  if (_.isNull(options)) {
    options.logger.error('Invalid configuration', loggingOptions);
    return false;
  }

  // Create logging folder if one does not exist
  if (!_.isNull(options.debug.path)) {
    if (!fs.existsSync(options.debug.path)) {
      mkdirp(options.debug.path);
    }
  }

  // Create outpur folder if one does not exist
  if (!_.isNull(options.output.path)) {
    if (!fs.existsSync(options.output.path)) {
      mkdirp(options.output.path);
    }
  }

  // Add logging to a file
  options.logger.add(
    new transports.File({
      filename: Path.join(options.debug.path, options.debug.filename),
      options: {
        flags: 'w',
      },
    })
  );

  options.logger.info(`Start ${pjson.name} - v${pjson.version}`, loggingOptions);

  options.logger.debug(`Options: ${stringifySafe(options)}`, loggingOptions);

  if (accessSafe(() => options.source, false)) {
    if (!_.isEmpty(accessSafe(() => options.transform, null))) {
      if (fs.existsSync(options.source)) {
        logger.info(`Processing local JSON: ${options.source}`, loggingOptions);
        readJSONAndTransform(options, options.source)
          .then(() => {
            logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
          })
          .catch((err) => {
            logger.error(err, loggingOptions);
            logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
          });
      } else {
        logger.error(`File not found for local JSON: ${options.source}`, loggingOptions);
        logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
      }
    } else {
      logger.error('No tranform defined', loggingOptions);
      logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
    }
  } else {
    // Create an axios instance that this will allow us to replace
    // with ratelimiting
    // see https://github.com/aishek/axios-rate-limit

    const axiosInstance = rateLimit(Axios.create({ adapter: timingAdapter }), options.ratelimit);

    // Add a response interceptor for Polling. If report still IN_PROGRESS
    // throw AxiosError and the retry-axios code will capture it.
    axiosInstance.interceptors.response.use(
      (response) => {
        // Any status code that lie within the range of 2xx cause this function to trigger
        // Check if the response has a status of IN_PROGRESS and throw error so we retry
        if (
          accessSafe(
            () =>
              response.data.status.localeCompare('IN_PROGRESS', undefined, {
                sensitivity: 'accent',
              }) === 0,
            false
          )
        ) {
          const err = createError(
            'Report IN_PROGRESS',
            response.config,
            'ECONNABORTED',
            response.request,
            response
          );
          err.reportInProgress = true;
          throw err;
        }
        if (
          accessSafe(
            () =>
              response.data.status.localeCompare('FAILED', undefined, {
                sensitivity: 'accent',
              }) === 0,
            false
          )
        ) {
          const err = createError(
            'Report FAILED',
            response.config,
            'ECONNABORTED',
            response.request,
            response
          );
          err.reportInProgress = false;
          throw err;
        }
        return response;
      },
      (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        // Do something with response error
        return Promise.reject(error);
      }
    );

    // Add Axios Retry
    // see https://github.com/JustinBeckwith/retry-axios
    axiosInstance.defaults.raxConfig = _.merge(
      {},
      {
        instance: axiosInstance,
        // You can detect when a retry is happening, and figure out how many
        // retry attempts have been made
        onRetryAttempt: (err) => {
          const raxcfg = rax.getConfig(err);
          logger.warn(
            `CorrelationId: ${err.config.correlationid}. Retry attempt #${raxcfg.currentRetryAttempt}`,
            {
              label: 'onRetryAttempt',
            }
          );
        },
        // Override the decision making process on if you should retry
        shouldRetry: (err) => {
          const cfg = rax.getConfig(err);

          // If report in progress retry
          if (accessSafe(() => err.reportInProgress, false)) {
            logger.warn(`CorrelationId: ${err.config.correlationid}. Report not ready. Retrying.`, {
              label: `shouldRetry`,
            });
            return true;
          }

          // ensure max retries is always respected
          if (cfg.currentRetryAttempt >= cfg.retry) {
            logger.warn(`CorrelationId: ${err.config.correlationid}. Maximum retries reached.`, {
              label: `shouldRetry`,
            });
            return false;
          }

          // ensure max retries for NO RESPONSE errors is always respected
          if (cfg.currentRetryAttempt >= cfg.noResponseRetries) {
            logger.warn(
              `CorrelationId: ${err.config.correlationid}. Maximum retries reached for No Response Errors.`,
              {
                label: `shouldRetry`,
              }
            );
            return false;
          }

          // Handle the request based on your other config options, e.g. `statusCodesToRetry`
          if (rax.shouldRetryRequest(err)) {
            return true;
          }

          logger.error(`CorrelationId: ${err.config.correlationid}. None retryable error.`, {
            label: `shouldRetry`,
          });
          return false;
        },
      },
      options.rax
    );
    rax.attach(axiosInstance);
    options.logger.info('Calling Percipio', loggingOptions);
    await getAllReportDataAndSave(options, axiosInstance)
      .then(() => {
        logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
      })
      .catch((err) => {
        options.logger.error(`Error:  ${err}`, loggingOptions);
        options.logger.info(`End ${pjson.name} - v${pjson.version}`, loggingOptions);
      });
  }
  return true;
};

try {
  main(config);
} catch (error) {
  throw new Error(`An error occured during configuration. ${error.message}`);
}
