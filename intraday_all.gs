//--------
// intraday_all.gs -- Supports downloading all intraday data
// Currently fetches steps, floors, calories and heart rate
//
// Your google sheets must have one sheet that is called "Sheet1"
//
// Based on https://github.com/simonbromberg/googlefitbit intraday.gs
// Read instructions first on above URL
//
// See here for an example for the data it produces: https://docs.google.com/spreadsheets/d/1wCnUg6zMc930jji3T_lUGSs9XJ8jkVVHGSzXFyuv-7I/edit#gid=1507130755


// Change activities if you want more stuff
// The heart rate activity always needs to be last!

var activities = ["activities/steps", "activities/calories", "activities/floors","activities/distance", "activities/heart"];

// Set the sheet name where data will be downloaded. Nothing else should be in this sheet

var mySheetName = "Sheet1"


/*
 * Do not change these key names. These are just keys to access these properties once you set them up by running the Setup function from the Fitbit menu
 */
// Key of ScriptProperty for Firtbit consumer key.
var CONSUMER_KEY_PROPERTY_NAME = "fitbitConsumerKey";
// Key of ScriptProperty for Fitbit consumer secret.
var CONSUMER_SECRET_PROPERTY_NAME = "fitbitConsumerSecret";

var SERVICE_IDENTIFIER = 'fitbit';
function onOpen() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var menuEntries = [{
            name: "Setup",
            functionName: "setup"
        },
        {
            name: "Authorize",
            functionName: "showSidebar"
        },
        {
            name: "Reset",
            functionName: "clearService"
        },
        {
            name: "Download data",
            functionName: "refreshTimeSeries"
        }
    ];
    ss.addMenu("Fitbit", menuEntries);
}


function isConfigured() {
    return getConsumerKey() != "" && getConsumerSecret() != "";
}

function setConsumerKey(key) {
    ScriptProperties.setProperty(CONSUMER_KEY_PROPERTY_NAME, key);
}

function getConsumerKey() {
    var key = ScriptProperties.getProperty(CONSUMER_KEY_PROPERTY_NAME);
    if (key == null) {
        key = "";
    }
    return key;
}

function setLoggables(loggable) {
    ScriptProperties.setProperty("loggables", loggable);
}

function getLoggables() {
    var loggable = ScriptProperties.getProperty("loggables");
    if (loggable == null) {
        loggable = LOGGABLES;
    } else {
        loggable = loggable.split(',');
    }
    return loggable;
}

function setConsumerSecret(secret) {
    ScriptProperties.setProperty(CONSUMER_SECRET_PROPERTY_NAME, secret);
}

function getConsumerSecret() {
    var secret = ScriptProperties.getProperty(CONSUMER_SECRET_PROPERTY_NAME);
    if (secret == null) {
        secret = "";
    }
    return secret;
}

// function saveSetup saves the setup params from the UI
function saveSetup(e) {
    setConsumerKey(e.parameter.consumerKey);
    setConsumerSecret(e.parameter.consumerSecret);
    setLoggables(e.parameter.loggables);
    setFirstDate(e.parameter.firstDate);
    var app = UiApp.getActiveApplication();
    app.close();
    return app;
}

function setFirstDate(firstDate) {
    ScriptProperties.setProperty("firstDate", firstDate);
}

function getFirstDate() {
    var firstDate = ScriptProperties.getProperty("firstDate");
    if (firstDate == null) {
        firstDate = "today";
    }
    return firstDate;
}



// function setup accepts and stores the Consumer Key, Consumer Secret, Project Key, firstDate, and list of Data Elements
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var app = UiApp.createApplication().setTitle("Setup Fitbit Download");
    app.setStyleAttribute("padding", "10px");

    var consumerKeyLabel = app.createLabel("Fitbit OAuth 2.0 Client ID:*");
    var consumerKey = app.createTextBox();
    consumerKey.setName("consumerKey");
    consumerKey.setWidth("100%");
    consumerKey.setText(getConsumerKey());

    var consumerSecretLabel = app.createLabel("Fitbit OAuth Consumer Secret:*");
    var consumerSecret = app.createTextBox();
    consumerSecret.setName("consumerSecret");
    consumerSecret.setWidth("100%");
    consumerSecret.setText(getConsumerSecret());

    var projectKeyTitleLabel = app.createLabel("Project key: ");
    var projectKeyLabel = app.createLabel(ScriptApp.getProjectKey());

    var firstDate = app.createTextBox().setId("firstDate").setName("firstDate");
    firstDate.setName("firstDate");
    firstDate.setWidth("100%");
    firstDate.setText(getFirstDate());

    // create the save handler and button
    var saveHandler = app.createServerClickHandler("saveSetup");
    var saveButton = app.createButton("Save Setup", saveHandler);

    // put the controls in a grid
    var listPanel = app.createGrid(8, 3);
    listPanel.setWidget(1, 0, consumerKeyLabel);
    listPanel.setWidget(1, 1, consumerKey);
    listPanel.setWidget(2, 0, consumerSecretLabel);
    listPanel.setWidget(2, 1, consumerSecret);
    listPanel.setWidget(3, 0, app.createLabel(" * (obtain these at dev.fitbit.com, use OAuth2.0)"));
    listPanel.setWidget(4, 0, projectKeyTitleLabel);
    listPanel.setWidget(4, 1, projectKeyLabel);
    listPanel.setWidget(5, 0, app.createLabel("Download day (yyyy-mm-dd or 'today')"));
    listPanel.setWidget(5, 1, firstDate);
    listPanel.setWidget(7, 0, app.createLabel("Very long intervals will not work; exceed Fitbit rate limit and/or function will timeout"));

    // Ensure that all controls in the grid are handled
    saveHandler.addCallbackElement(listPanel);
    // Build a FlowPanel, adding the grid and the save button
    var dialogPanel = app.createFlowPanel();
    dialogPanel.add(listPanel);
    dialogPanel.add(saveButton);
    app.add(dialogPanel);
    doc.show(app);
}

function getFitbitService() {
    // Create a new service with the given name. The name will be used when
    // persisting the authorized token, so ensure it is unique within the
    // scope of the property store
    Logger.log(PropertiesService.getUserProperties());
    return OAuth2.createService(SERVICE_IDENTIFIER)

        // Set the endpoint URLs, which are the same for all Google services.
        .setAuthorizationBaseUrl('https://www.fitbit.com/oauth2/authorize')
        .setTokenUrl('https://api.fitbit.com/oauth2/token')

        // Set the client ID and secret, from the Google Developers Console.
        .setClientId(getConsumerKey())
        .setClientSecret(getConsumerSecret())

        // Set the name of the callback function in the script referenced
        // above that should be invoked to complete the OAuth flow.
        .setCallbackFunction('authCallback')

        // Set the property store where authorized tokens should be persisted.
        .setPropertyStore(PropertiesService.getUserProperties())

        .setScope('activity profile heartrate nutrition weight')

        .setTokenHeaders({
            'Authorization': 'Basic ' + Utilities.base64Encode(getConsumerKey() + ':' + getConsumerSecret())
        });

}

function clearService() {
    OAuth2.createService(SERVICE_IDENTIFIER)
        .setPropertyStore(PropertiesService.getUserProperties())
        .reset();
}

function showSidebar() {
    var service = getFitbitService();
    if (!service.hasAccess()) {
        var authorizationUrl = service.getAuthorizationUrl();
        var template = HtmlService.createTemplate(
            '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
            'Reopen the sidebar when the authorization is complete.');
        template.authorizationUrl = authorizationUrl;
        var page = template.evaluate();
        SpreadsheetApp.getUi().showSidebar(page);
    } else {
        Logger.log("Has access!!!!");
    }
}

function authCallback(request) {
    Logger.log("authcallback");
    var service = getFitbitService();
    var isAuthorized = service.handleCallback(request);
    if (isAuthorized) {
        Logger.log("success");
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
        Logger.log("denied");
        return HtmlService.createHtmlOutput('Denied. You can close this tab');
    }
}

function getUser() {
    var service = getFitbitService();

    var options = {
        headers: {
            "Authorization": "Bearer " + service.getAccessToken(),
            "method": "GET"
        }
    };
    var response = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/profile.json", options);
    var o = JSON.parse(response.getContentText());
    return o.user;
}

function refreshTimeSeries() {
    if (!isConfigured()) {
        setup();
        return;
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet()
    var sheet = doc.getSheetByName(mySheetName);
    sheet.clear();
    sheet.setFrozenRows(1);

    var options = {
        headers: {
            "Authorization": 'Bearer ' + getFitbitService().getAccessToken(),
            "method": "GET"
        }
    };
    

    var lastIndex = 0;
    var table = {};
    for (var activity in activities) {

        var dateString = getFirstDate();

        var currentActivity = activities[activity];
        try {
            if (currentActivity == 'activities/heart') {
                var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/activities/heart/date/" + dateString + "/1d/1min.json", options);
            } else {
                var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/" + currentActivity + "/date/" + dateString + "/1d.json", options);
            }
        } catch (exception) {
            Logger.log(exception);
        }
        var o = JSON.parse(result.getContentText());
        //Logger.log(result.getContentText())

        var titleCell = sheet.getRange("a1");
        titleCell.setValue("Time");
        var title = currentActivity.split("/");
        title = title[title.length - 1];
        titleCell.offset(0, 1 + activity * 1.0).setValue(title);
        var intradaysfield = "activities-" + title + "-intraday"
        var row = o[intradaysfield]["dataset"];

        for (var j in row) {
            var val = row[j];

            index = val["time"];
            if (table[index] instanceof Array) {} else {
                table[index] = new Array()
            }
            table[index][0] = val["time"];
            table[index].push(val["value"])

        }


    }
    var al = activities.length + 1

    //Pad the array - setValues needs a value in each field
    Object.keys(table).forEach(function(key) {
        var tl = table[key].length
        //Logger.log(tl + " " + al)
        if (tl < al) {
            table[key].push(0)
        }

    });

    //Convert the object to an array - setValues needs an array
    var tablearray = Object.keys(table).map(function(key) {
        return table[key];
    });


    var range = "R2C1:R" + (tablearray.length + 1) + "C" + al
    sheet.getRange(range).setValues(tablearray);
}
// parse a date in yyyy-mm-dd format
function parseDate(input) {
    var parts = input.match(/(\d+)/g);
    // new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[0], parts[1] - 1, parts[2]); // months are 0-based
}

// parse a date in 2011-10-25T23:57:00.000 format
function parseDate2(input) {
    var parts = input.match(/(\d+)/g);
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
}
