# node-percipio-learneractivitytoxapi

Retrieve [Learner Activity Report](https://documentation.skillsoft.com/en_us/percipio/Content/A_Administrator/admn_rpt_learner_activity.htm) data from Percipio.

Convert to xapi statements and save locally.

To use this code you will need:

1. A Skillsoft [Percipio](https://www.skillsoft.com/platform-solution/percipio/) Site
1. A [Percipio Service Account](https://documentation.skillsoft.com/en_us/pes/3_services/service_accounts/pes_service_accounts.htm) with permission for accessing [REPORTING API](https://documentation.skillsoft.com/en_us/pes/2_understanding_percipio/rest_api/pes_rest_api.htm)
1. An export of all the xapi data for the assets from the [Percipio](https://www.skillsoft.com/platform-solution/percipio/) Site. You can use [node-percipio-metadatadownload](https://github.com/martinholden-skillsoft/node-percipio-metadatadownload) to downloand and this transform [lookupforxapi.jsonata](https://github.com/martinholden-skillsoft/node-percipio-metadatadownload/blob/main/otherTransforms/lookupforxapi.jsonata)

The code can also be used to process a JSON file (as retrieved from the API) without the need to download the data, this is useful if you want to use different TRANSFORMS on the same data.

The code uses the [JSONata-Extended](https://www.npmjs.com/package/jsonata-extended) package to transform the JSON returned by Percipio.

The [transform/default.jsonata](transform/default.jsonata) creates valid xAPI completed statements from the Learner Activity Report data that can then be sent to an LRS.

# Configuration

## Environment Configuration

Once you have copied this repository set the following NODE ENV variables, or config the [.env](.env) file

| ENV       | Required | Description |
| --------- | -------- | ------------|
| ORGID     | Required | This is the Percipio Organiation UUID for your Percipio Site |
| BEARER    | Required | This is the Percipio Bearer token for a Service Account with permissions for services. |
| BASEURL   | Required | This is set to the base URL for the Percipio data center. For US hosted use: https://api.percipio.com For EU hosted use: https://dew1-api.percipio.com |
| SOURCE    | Required for local file | This is the path to the previously downloaded JSON |
| XAPILOOKUP| Required | This is the path to the previously downloaded JSON that contains an array of all the items from the Percipio site and xapi info to use for lookup.<br/><br/>This is transformed using [node-percipio-metadatadownload](https://github.com/martinholden-skillsoft/node-percipio-metadatadownload) transformed using this transform [lookupforxapi.jsonata](https://github.com/martinholden-skillsoft/node-percipio-metadatadownload/blob/main/otherTransforms/lookupforxapi.jsonata) |
| TIMEFRAME | Optional | This is a filter criteria that specifies the timeframe for the results.<br/><br/>The report start/end dates are calculated dynamically based on when the report is submitted date.<br/><br/>Options are: DAY, WEEK, THIRTY_DAYS, CALENDAR_MONTH<br/><br/>If left empty/null THIRTY_DAYS is used. |
| START     | Optional | This is a filter criteria that specifies the START date for the report in ISO8601 format.<br/><br/>The END option must be specified if using this.<br/><br/>The TIMEFRAME option must be null if using this. |
| END       | Optional | This is a filter criteria that specifies the END date for the report in ISO8601 format.<br/><br/>The START option must be specified if using this.<br/><br/>The TIMEFRAME option must be null if using this |

## Configuring the API call

Make any additional config changes in [config/default.js](config/default.js) file, to specify the request criteria for the report other then date range.

# Running the application

Run the app

```bash
npm start
```

## Downloading and transforming
The Percipio [https://api.percipio.com/reporting/api-docs/#/%2Fv1/requestLearningActivityReport](https://api.percipio.com/reporting/api-docs/#/%2Fv1/requestLearningActivityReport) API wil be called to generate the report.

The Percipio[https://api.percipio.com/reporting/api-docs/#/%2Fv1/getReportRequest](https://api.percipio.com/reporting/api-docs/#/%2Fv1/getReportRequest) API will then be called to download the generated data.

The returned JSON report data will be stored in a file.

```
results/YYYYMMDD_hhmmss_results.JSON
```

The returned report JSON objects are "enhanced".

| PROPERTY | Description |
| -------- | ------------|
| xapistatementid | This is a new uuidv4 value we will use as the statement id |
| xapiobject | This is the object we look up from the JSON file referenced by **XAPILOOKUP** using **contentUuid** as the key.<br/><br/>If we dont find a value in this file for the **contentUuid** we create a default response treating the item as if it is a Skillsoft course type. |

An example of an enhanced record is below
```
{
    "userId": "anonuser",
    "firstName": "Anonymous",
    "lastName": "User",
    "audience": "All Users",
    "contentUuid": "24f09635-e4b1-11e6-a792-0242c0a80b09",
    "contentId": "bs_ald02_a03_enus",
    "contentTitle": "Leading Your Team through Change",
    "contentType": "Course",
    "languageCode": "en-US",
    "status": "Completed",
    "completedDate": "2021-07-20T00:00:00.000Z",
    "badgeEarned": "2021-07-20T12:59:41.503Z",
    "duration": "625",
    "estimatedDuration": "1348",
    "firstAccess": "2021-07-20T12:32:30.406Z",
    "lastAccess": "2021-07-20T13:01:12.776Z",
    "totalAccesses": "8",
    "emailAddress": "anon.user@customer.com",
    "durationHms": "00h10m25s",
    "estimatedDurationHms": "00h22m28s",
    "userUuid": "760118e4-19a0-4c60-861e-06d088fd6201",
    "userStatus": "Active",
    "xapistatementid": "1de7679e-916d-4e5d-9281-fa39b12dfa6b",
    "xapiobject": {
      "objectType": "Activity",
      "id": "https://xapi.percipio.com/xapi/course/24f09635-e4b1-11e6-a792-0242c0a80b09",
      "definition": {
        "name": {
          "en-US": "Leading Your Team through Change"
        },
        "type": "http://adlnet.gov/expapi/activities/course"
      }
    }
  },
```

These objects are transformed using [transform/default.jsonata](transform/default.jsonata) and the resulting xAPI statements are stored in

```
results/YYYYMMDD_hhmmss_results_transformed.json
```

## Local file loading and transforming
The Percipio JSON data returned will be loaded from the specified local file. The JSON objects are "enhanced" with:

| PROPERTY | Description |
| -------- | ------------|
| xapistatementid | This is a new uuidv4 value we will use as the statement id |
| xapiobject | This is the object we look up from the JSON file referenced by **XAPILOOKUP** using **contentUuid** as the key.<br/><br/>If we dont find a value in this file for the **contentUuid** we create a default response treating the item as if it is a Skillsoft course type. |

These objects are transformed using [transform/default.jsonata](transform/default.jsonata) and the resulting xAPI statements are stored in

```
results/YYYYMMDD_hhmmss_results_transformed.json
```

## Timestamp Format
The timestamp component is based on the UTC time when the script runs:

| DATEPART | COMMENTS                            |
| -------- | ----------------------------------- |
| YYYY     | Year (i.e. 1970 1971 ... 2029 2030) |
| MM       | Month Number (i.e. 01 02 ... 11 12) |
| DD       | Day (i.e. 01 02 ... 30 31)          |
| HH       | Hour (i.e. 00 01 ... 22 23)         |
| mm       | Minutes (i.e. 00 01 ... 58 59)      |
| ss       | Seconds (i.e. 00 01 ... 58 59)      |

# Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information what has changed recently.

# License

MIT © martinholden-skillsoft
