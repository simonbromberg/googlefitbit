// interday.gs -- download daily totals of step data
// Doesn't require special permission, just follow setup and authorize

// Simon Bromberg (http://sbromberg.com)
// You are free to use, modify, copy any of the code in this script for your own purposes, as long as it's not for evil
// If you do anything cool with it, let me know!
// Note: there are minor improvements/cleanups still to be made in this file, but it should work as is if everything is setup properly
// See readme on github repo for more information

// Parts of this script is based on a script with the following information in the header.
// The main difference is this version uses Fitbit new OAuth2 and Google's OAuth2 instead of OAuthConfig which is deprecated
// Original script by loghound@gmail.com
// Original instructional video by Ernesto Ramirez at http://vimeo.com/26338767
// Modifications by Mark Leavitt (PDX Quantified Self organizer) www.markleavitt.com
// https://github.com/qslabs/FitbitDailyData/blob/master/FitbitDailyData.gs


/*
 * Do not change these key names. These are just keys to access these properties once you set them up by running the Setup function from the Fitbit menu
 */
// Key of ScriptProperty for Firtbit consumer key.
var CONSUMER_KEY_PROPERTY_NAME = "fitbitConsumerKey";
// Key of ScriptProperty for Fitbit consumer secret.
var CONSUMER_SECRET_PROPERTY_NAME = "fitbitConsumerSecret";

/*
 * You also need to add the callback URL to your app at dev.fitbit.com in the following format (replace {PROJECT KEY} with your project key:
 * https://script.google.com/macros/d/{PROJECT KEY}/usercallback
 * Go to your app at dev.fitbit.com and click "Edit Application Settings", add the URL in the Callback URL textbox, one URL per line (can do multiple in a single app)
 */

var SERVICE_IDENTIFIER = 'fitbit'; // usually do not need to change this either

// Default loggable resources (from Fitbit API docs).
var LOGGABLES = ["activities/log/steps", "activities/log/distance",
                 "activities/log/activeScore", "activities/log/activityCalories",
                 "activities/log/calories", "foods/log/caloriesIn",
                 "activities/log/minutesSedentary",
                 "activities/log/minutesLightlyActive",
                 "activities/log/minutesFairlyActive",
                 "activities/log/minutesVeryActive", 
                 "sleep/startTime",  
                 "sleep/timeInBed",  
                 "sleep/minutesAsleep",  
                 "sleep/awakeningsCount",  
                 "sleep/minutesAwake",  
                 "sleep/minutesToFallAsleep",  
                 "sleep/minutesAfterWakeup",  
                 "sleep/efficiency",
                 "body/weight", "body/bmi", "body/fat",];

function getFitbitService() {
    // Create a new service with the given name. The name will be used when
    // persisting the authorized token, so ensure it is unique within the
    // scope of the property store
    if (!isConfigured()) {
        setup();
        return;
    }
                 
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
    .setScope('activity nutrition sleep weight profile settings')
    // but not desirable in a production application.
    //.setParam('approval_prompt', 'force')
    .setTokenHeaders({
        'Authorization': 'Basic ' + Utilities.base64Encode(getConsumerKey() + ':' + getConsumerSecret())
    });
}

function clearService(){
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
        Logger.log("Has access!");
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
        /*"oAuthServiceName": SERVICE_IDENTIFIER,
         "oAuthUseToken": "always",*/
        "method": "GET"
    }};
    var response = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/profile.json",options);
    var o = Utilities.jsonParse(response.getContentText());
    return o.user;
}

// function setup accepts and stores the Consumer Key, Consumer Secret, Project Key, firstDate, and list of Data Elements
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    var app = UiApp.createApplication().setTitle("Setup Fitbit Download"); // UiApp API deprecated, may need to eventually replace with HTML service
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
    
    var lastDate = app.createTextBox().setId("lastDate").setName("lastDate");
    lastDate.setName("lastDate");
    lastDate.setWidth("100%");
    lastDate.setText(getLastDate());
    
    // add listbox to select data elements
    var loggables = app.createListBox(true).setId("loggables").setName(
                                                                       "loggables");
    loggables.setVisibleItemCount(4);
    // add all possible elements (in array LOGGABLES)
    var logIndex = 0;
    for (var resource in LOGGABLES) {
        loggables.addItem(LOGGABLES[resource]);
        // check if this resource is in the getLoggables list
        if (getLoggables().indexOf(LOGGABLES[resource]) > -1) {
            // if so, pre-select it
            loggables.setItemSelected(logIndex, true);
        }
        logIndex++;
    }
    // create the save handler and button
    var saveHandler = app.createServerClickHandler("saveSetup");
    var saveButton = app.createButton("Save Setup", saveHandler);
    
    // put the controls in a grid
    var listPanel = app.createGrid(8, 2);
    listPanel.setWidget(1, 0, consumerKeyLabel);
    listPanel.setWidget(1, 1, consumerKey);
    listPanel.setWidget(2, 0, consumerSecretLabel);
    listPanel.setWidget(2, 1, consumerSecret);
    listPanel.setWidget(3, 0, app.createLabel(" * (obtain these at dev.fitbit.com)"));
    listPanel.setWidget(4, 0, projectKeyTitleLabel);
    listPanel.setWidget(4, 1, projectKeyLabel);
    listPanel.setWidget(5, 0, app.createLabel("Start date (yyyy-mm-dd)"));
    listPanel.setWidget(5, 1, firstDate);
    listPanel.setWidget(6, 0, app.createLabel("End date (yyyy-mm-dd)"));
    listPanel.setWidget(6, 1, lastDate);
    listPanel.setWidget(7, 0, app.createLabel("Data Elements to download:"));
    listPanel.setWidget(7, 1, loggables);
    
    // Ensure that all controls in the grid are handled
    saveHandler.addCallbackElement(listPanel);
    // Build a FlowPanel, adding the grid and the save button
    var dialogPanel = app.createFlowPanel();
    dialogPanel.add(listPanel);
    dialogPanel.add(saveButton);
    app.add(dialogPanel);
    doc.show(app);
}

// function sync() is called to download all desired data from Fitbit API to the spreadsheet
function sync() {
    // if the user has never performed setup, do it now
    if (!isConfigured()) {
        setup();
        return;
    }
    var colIndex = 1
    var dateColDone = 0;
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    doc.setFrozenRows(4);
    doc.getRange("R1C1").setValue("Sheet last synced: " + new Date());
    doc.getRange("R2C1").setValue("Battery");
    doc.getRange("R3C1").setValue("Last Sync");
    doc.getRange("R4C1").setValue("Date");
    var user = getUser();
    var options = { headers:{
        "Authorization": 'Bearer ' + getFitbitService().getAccessToken(),
        "method": "GET"
    }};
    // prepare and end date, and a list of desired data elements
    var dateString = getLastDate();
    var activities = getLoggables();
    // for each data element, fetch a list beginning from the firstDate, ending with today
    Logger.log("here");
    try {
        var devices = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/devices.json",options);
        var device = JSON.parse(devices.getContentText())[0];
    } catch (exception) {
        Logger.log(exception);
        Browser.msgBox("error getting device info for " + user["displayName"]);
    }
    for (var activity in activities) {
        var currentActivity = activities[activity];
        try {
            var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/"
                                           + currentActivity + "/date/" + getFirstDate() + "/"
                                           + dateString + ".json", options);
        } catch (exception) {
            Logger.log(exception);
            Browser.msgBox("Error downloading " + currentActivity);
        }
        var o = JSON.parse(result.getContentText());
        // set title
        var workingCol = (colIndex + !dateColDone).toString()
        var headerCell = doc.getRange("R1C"+workingCol);
        headerCell.setValue(user["displayName"]);
        headerCell = doc.getRange("R2C"+workingCol);
        if (device != null) {
            headerCell.setValue(device["battery"]);
        }
        else {
            headerCell.setValue("error no device");
        }
        headerCell = doc.getRange("R3C"+workingCol);
        if (device != null) {
            var syncDate = new Date(device["lastSyncTime"]+"Z");
            headerCell.setValue(Utilities.formatDate(syncDate, "GMT", "EEE, d MMM yyyy HH:mm"));
        }
        else {
            headerCell.setValue("error no device");
        }
        var titleCell = doc.getRange("R4C"+colIndex.toString());
        var cell = doc.getRange("R5C"+colIndex.toString());
        
        // fill the spreadsheet with the data
        var index = 0;
        for (var i in o) {
            // set title for this column
            var title = i.substring(i.lastIndexOf('-') + 1);
            titleCell.offset(0, !dateColDone + activity * 1.0).setValue(title);
            
            var row = o[i];
            for (var j = row.length - 1; j >= 0; j--) {
                var val = row[j];
                
                if (!dateColDone) {
                    cell.offset(index, 0).setValue(val["dateTime"]); // set the date index
                }
                cell.offset(index, !dateColDone + activity * 1.0).setValue(val["value"]);
                index++;
            }
        }
    }
    colIndex+= 1 + !dateColDone;
    dateColDone = 1;
}

function isConfigured() {
    return getConsumerKey() != "" && getConsumerSecret() != "";
}

// function saveSetup saves the setup params from the UI
function saveSetup(e) {
    setConsumerKey(e.parameter.consumerKey);
    setConsumerSecret(e.parameter.consumerSecret);
    setLoggables(e.parameter.loggables);
    setFirstDate(e.parameter.firstDate);
    setLastDate(e.parameter.lastDate);
    
    var app = UiApp.getActiveApplication();
    app.close();
    return app;
}

function getProperty(key) {
    Logger.log("get property "+key);
    return PropertiesService.getScriptProperties().getProperty(key);
}

function setProperty(key, value) {
    PropertiesService.getScriptProperties().setProperty(key, value);
}

function setConsumerKey(consumerKey) {
    setProperty(CONSUMER_KEY_PROPERTY_NAME, consumerKey);
}

function getConsumerKey() {
    var consumer = getProperty(CONSUMER_KEY_PROPERTY_NAME);
    if (consumer == null) {
        consumer = "";
    }
    
    return consumer;
}

function setConsumerSecret(secret) {
    setProperty(CONSUMER_SECRET_PROPERTY_NAME, secret);
}

function getConsumerSecret() {
    var secret = getProperty(CONSUMER_SECRET_PROPERTY_NAME);
    
    if (secret == null) {
        secret = "";
    }
    
    return secret;
}

function setLoggables(loggables) {
    setProperty("loggables", loggables);
}

function getLoggables() {
    var loggable = getProperty("loggables");
    
    if (loggable == null) {
        loggable = LOGGABLES;
    } else {
        loggable = loggable.split(',');
    }
    
    return loggable;
}

function setFirstDate(firstDate) {
    setProperty("firstDate", firstDate);
}

function getFirstDate() {
    var firstDate = getProperty("firstDate");
    
    if (firstDate == null) {
        firstDate = formatToday(); // default value; feel free to change this
    }
    
    return firstDate;
}

function setLastDate(lastDate) {
    setProperty("lastDate", lastDate);
}

function getLastDate() {
    var lastDate = getProperty("lastDate");
    if (lastDate == null) {
        lastDate = formatToday(); // default value set to
    }
    return lastDate;
}

function formatToday() {
    var todayDate = new Date;
    return todayDate.getFullYear()
    + '-'
    + ("00" + (todayDate.getMonth() + 1)).slice(-2)
    + '-'
    + ("00" + todayDate.getDate()).slice(-2);
}

// function onOpen is called when the spreadsheet is opened; adds the Fitbit menu
function onOpen() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var menuEntries = [{
                       name: "Sync",
                       functionName: "sync"
                       }, {
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
                       }];
    ss.addMenu("Fitbit", menuEntries);
}
