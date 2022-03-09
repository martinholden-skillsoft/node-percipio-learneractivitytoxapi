const moment = require('moment');
const defer = require('config/defer').deferConfig;

const config = {};

// The local JSON file
config.source = null;

// This is used as the account.homepage in the xAPI statements
config.homepage = 'https://customer.percipio.com';

// The transform file to use
config.transform = 'transform/default.jsonata';

// The xapilookup JSON file to use
config.xapilookup = null;

// Configuration for connecting to LRS
config.lrs = {};
// Statements endpoint
config.lrs.endpoint = '';
// Basic Username
config.lrs.username = '';
// Basic Password
config.lrs.password = '';
// Basic Auth Header
config.lrs.auth = defer((cfg) => {
  return `Basic ${Buffer.from(`${cfg.lrs.username}:$${cfg.lrs.password}`).toString('base64')}`;
});
// LRS Connection Timeout
config.lrs.timeout = 20000;

config.startTimestamp = moment().utc().format('YYYYMMDD_HHmmss');
// Null logger object
config.logger = {};

// DEBUG Options - Enables the check for Fiddler, if running the traffic is routed thru Fiddler
config.debug = {};
// Debug logging
config.debug.path = 'results';
config.debug.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results.log`;
});

config.output = {};
// Output path
config.output.path = 'results';
// Filename
config.output.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results`;
});

// Report Generation Request
config.reportrequest = {};
// Request Timeout
config.reportrequest.timeout = 2000;
// Bearer Token
config.reportrequest.bearer = null;
// Base URI to Percipio API
config.reportrequest.baseURL = null;
// Request Path Parameters
config.reportrequest.path = {};
/**
 * Name: orgId
 * Description: Organization UUID
 * Required: true
 * Type: string
 * Format: uuid
 */
config.reportrequest.path.orgId = null;

// Request Query string Parameters
config.reportrequest.query = {};

// Request Body
config.reportrequest.body = {};
/**
 * Name: start
 * Description : Start date for events retrieval
 * Type: string
 * Format: date-time
 * Example: 2018-01-01T10:10:24Z
 */
config.reportrequest.body.start = null;
/**
 * Name: end
 * Description : End date for events retrieval
 * Type: string
 * Format: date-time
 * Example: 2018-01-10T10:20:24Z
 */
config.reportrequest.body.end = null;
/**
 * Name: timeFrame
 * Description : To calculate the start/end date dynamically based on timeframe and when the
 * report is submitted date. [User can submit an absolute date range (start/end date) or a
 * relative date range (timeframe) but never both]
 * Type: string
 * Enum: DAY, WEEK, THIRTY_DAYS, CALENDAR_MONTH
 */
config.reportrequest.body.timeFrame = defer((cfg) => {
  return cfg.reportrequest.body.start ? null : 'THIRTY_DAYS';
});

/**
 * Name: audience
 * Description : Audience filter, defaults to all audience
 * Type: string
 */
config.reportrequest.body.audience = 'ALL';
/**
 * Name: locale
 * Description : The field to use for specifying language. Will default to all when not
 * specified. example format 'en' or 'fr' or 'de' etc.
 * Type: string
 */
config.reportrequest.body.locale = null;
/**
 * Name: contentType
 * Description : Content types filter, comma delimited and default to all content types
 * Type: string
 * Example: AudioBook,Audio Summary,Book,Book Summary,Channel,Course,Linked Content,Video
 */
config.reportrequest.body.contentType = null;
/**
 * Name: template
 * Description : XML template for LMS based on learning report export. This parameter is
 * required for XML formatType. `Please Note- If template is present then the value of
 * formatType should be XML only`.
 * Type: string
 * Enum: WORKDAY_REPORTING
 */
config.reportrequest.body.template = null;
/**
 * Name: transformName
 * Description : Jsonata transform name to transform Percipio fields to client sepecific
 * fields, either transform name or mapping should be given but not both.
 * Type: string
 */
config.reportrequest.body.transformName = null;
/**
 * Name: mapping
 * Description : Jsonata transform mapping to transform Percipio fields to client sepecific
 * fields, either transform name or mapping should be given but not both.
 * Type: string
 */
config.reportrequest.body.mapping = null;
/**
 * Name: csvPreferences
 * Description : csv preferences to generate csv file for the transformed output
 * Type: object
 */
config.reportrequest.body.csvPreferences = {};

/**
 * Name: header
 * Type: boolean
 */
config.reportrequest.body.csvPreferences.header = true;
/**
 * Name: rowDelimiter
 * Type: string
 */
config.reportrequest.body.csvPreferences.rowDelimiter = '\n';
/**
 * Name: columnDelimiter
 * Type: string
 */
config.reportrequest.body.csvPreferences.columnDelimiter = ',';
/**
 * Name: sort
 * Description : The field to use for sorting and which order to sort in, if sort is not
 * included the results will be returned descending by lastAccessDate
 * Type: object
 */
config.reportrequest.body.sort = {};

/**
 * Name: field
 * Type: string
 * Enum: contentId, contentTitle, contentType, status, duration, completedDate,
 * firstAccessDate, lastAccessDate, timesAccessed, firstScore, lastScore, highScore,
 * assessmentAttempts, percentOfBookOrVideo, audience
 */
config.reportrequest.body.sort.field = 'lastAccessDate';
/**
 * Name: order
 * Type: string
 * Enum: asc, desc
 */
config.reportrequest.body.sort.order = 'desc';
/**
 * Name: status
 * Description : Learner activity status filter, defaults to all status type
 * Type: string
 * Enum: ACHIEVED, ACTIVE, COMPLETED, LISTENED, READ, STARTED, WATCHED
 */
config.reportrequest.body.status = 'COMPLETED';
/**
 * Name: sftpId
 * Description : SFTP Id associated with OrgId
 * Type: string
 * Format: uuid
 */
config.reportrequest.body.sftpId = null;
/**
 * Name: isFileRequiredInSftp
 * Description : Generated files are required to deliver in the respected sftp location.
 * Default value is true.
 * Type: boolean
 */
config.reportrequest.body.isFileRequiredInSftp = true;
/**
 * Name: zip
 * Description : Generate the reports in zip file format. Default value is false.
 * Type: boolean
 */
config.reportrequest.body.zip = null;
/**
 * Name: encrypt
 * Description : Generate the report file as PGP encrypted file. Default value is false.
 * Type: boolean
 */
config.reportrequest.body.encrypt = null;
/**
 * Name: formatType
 * Description : Format Type, defaults to JSON, the value is extracted from Accept attribute
 * in header
 * Type: string
 * Enum: JSON, CSV, TXT
 */
config.reportrequest.body.formatType = 'JSON';
/**
 * Name: fileMask
 * Description : Absolute or masked pattern for the generated report file. Example file masks
 * - fileName_{DD}{MM}{YYYY}, fileName_{ORG_ID}
 * Type: string
 */
config.reportrequest.body.fileMask = null;
/**
 * Name: folderName
 * Description : custom folder under sftp reports wherein the generated report file is to be
 * placed.
 * Type: string
 */
config.reportrequest.body.folderName = null;
/**
 * Name: includeMillisInFilename
 * Description : Generate files with unix based timestamp. Example -
 * fileName.csv.1561642446608
 * Type: boolean
 */
config.reportrequest.body.includeMillisInFilename = null;

// Method
config.reportrequest.method = 'post';
// The Service Path the placeholders {} are replaced by values from *.path
config.reportrequest.uritemplate =
  '/reporting/v1/organizations/{orgId}/report-requests/learning-activity';

// Request
config.pollrequest = {};
// Request Timeout
config.pollrequest.timeout = 2000;
// Bearer Token
config.pollrequest.bearer = null;
// Base URI to Percipio API
config.pollrequest.baseURL = null;
// Request Path Parameters
config.pollrequest.path = {};
/**
 * Name: orgId
 * Description: Organization UUID
 * Required: true
 * Type: string
 * Format: uuid
 */
config.pollrequest.path.orgId = null;
/**
 * Name: reportRequestId
 * Description : Handle to access the report content
 * Required: true
 * Type: string
 */
config.pollrequest.path.reportRequestId = null;
// Request Query string Parameters
config.pollrequest.query = {};
// Request Body
config.pollrequest.body = null;
// Method
config.pollrequest.method = 'get';
// The Service Path the placeholders {} are replaced by values from *.path
config.pollrequest.uritemplate =
  '/reporting/v1/organizations/{orgId}/report-requests/{reportRequestId}';

// Global Axios Retry Settings
// see https://github.com/JustinBeckwith/retry-axios
config.rax = {};
// Retry 3 times on requests that return a response (500, etc) before giving up.
config.rax.retry = 20;
// Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
config.rax.noResponseRetries = 2;
// You can set the backoff type.
// options are 'exponential' (default), 'static' or 'linear'
config.rax.backoffType = 'exponential';

// Global Axios Rate Limiting#
// see https://github.com/aishek/axios-rate-limit
config.ratelimit = {};
config.ratelimit.maxRequests = 1;
config.ratelimit.perMilliseconds = 2000;

module.exports = config;
