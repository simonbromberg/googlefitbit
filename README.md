# googlefitbit
Google scripts for Fitbit step data / heart rate interday / intraday download (other data may work with modification, but this script does not intend to support other endpoints at this time. You are welcome to submit PRs to add additional functionality. There is some code for other loggables in there but that was copied over from an older version of the script.) You are free to use, duplicate, and/or modify these scripts for any (non-evil) purpose.

**Important Notes:** If you run into trouble, please double check the steps **carefully** and check the error log in the script editor before raising issues or seeking help. If you find anything in this _Readme_ confusing, please raise an issue in Github. Please be as specific as possible with any questions.

If you are seeing this error "_The app you're trying to connect did not provide valid information to Fitbit. Please report this issue to them_."

And "_Developer information: invalidrequest - Invalid redirecturi parameter value_"

That means you did not follow the instructions correctly.

## interday.gs
Download step data, one row per day, from a start day to the present. Make sure not to set the start day too far in the past.

Parts of this script are based on work from the following sources. The main difference in my version is that I use Fitbit's new OAuth2 and Google's OAuth2 instead of OAuthConfig which is deprecated.

- Original script by loghound@gmail.com
- Original instructional video by Ernesto Ramirez at http://vimeo.com/26338767
- Modifications by Mark Leavitt (PDX Quantified Self organizer) www.markleavitt.com
- https://github.com/qslabs/FitbitDailyData

### Setting up:
1. Create a **new** Google spreadsheet (do not try to re-use one with the old version of the script), click Tools > Script editor... then copy and paste the contents of the interday.gs file (see above) into the script editor and save. Return to the spreadsheet and refresh the page (Note: actually click the refresh button or select it from the menu; the keyboard shortcut is overriden on Google Sheets, at least in Google Chrome). A couple seconds after the page reloads you should see a "Fitbit" menu at the top.

2. Add the Oauth2 Google Script library to your project by clicking Resources > Libraries... (menus inside the script editor). Then search for the OAuth2.0 library by typing in the Script ID "MswhXl8fVhTFUH_Q3UOJbXvxhMjh3Sh48" and hitting Select. More info on that library on [its Github page](https://github.com/googlesamples/apps-script-oauth2 "apps-script-oauth2"). Select the latest version and click Save.

3. Find your project's key by clicking on the 'Fitbit' menu inside your spreadsheet and clicking 'Setup'. A popup window may appear asking you to Authorize your application. Click 'Continue', sign into / select the Google account you want to authorize the application on (doesn't really matter which account, this has nothing to do with your Fitbit account). Then it will show you the permissions the application is requesting, click 'Allow'. Then the 'Setup Fitbit Download' panel should appear. Copy the text adjacent to 'Project Key' in the popup. You will need that in subsequent steps.

4. Go to https://dev.fitbit.com/apps and log in. If you haven't already, register a new app by clicking at the top right. 
 - For OAuth 2.0 Application Type select 'Server' [Fitbit now has a 'Personal' option here which will give you access to intraday data but will only allow you to authorize a single personal account; [more info here](https://community.fitbit.com/t5/Web-API/Intraday-data-now-immediately-available-to-personal-apps/td-p/1014524 "Fitbit community forum")]. 
 - Default access type Read only. 
 - Other fields at top: Application Name, Description, Application Website, Organization, Organization Website put whatever you want, just need to put something.

 - Add the following inside the callback url box: 

     https://script.google.com/macros/d/YOUR_PROJECT_KEY/usercallback
     
     (Replace YOUR_PROJECT_KEY with the project key you got from step 3).

 - Agree to the terms, and tap register. Then you will be directed to a page with credentials. Keep your 'OAuth 2.0 Client ID' and your 'Client Secret' keys handy.

5. Inside your spreadsheet (not the script editor; refresh if the Fitbit menu isn't visible at the top), select 'Setup' from the 'Fitbit' menu. In the appropriate fields in the 'Setup Fitbit Download' panel copy in your 'OAuth 2.0 Client ID', 'Client Secret' from the previous step, and your project key from step 3. Select 'activities/logs/steps' from the 'Data elements to download' list, and enter a start/end date (defaults to current day). If you try to download more than a couple years worth of data, Fitbit's API will not like you. Then click 'Save Setup' and the panel will disappear.

7. In your spreadsheet, click 'Authorize' from the Fitbit menu and a sidebar will show up on the right. Click the word 'Authorize' in the sidebar. A page will open up with the Fitbit login page. Log in to the Fitbit account you would like to download data from in the new window, authorize the application by clicking 'Allow', and then close the tab when it says "Success you can close this tab"

8. Back in your spreadhseet, hit Sync, and after a few moments the data should load in.

## intraday.gs
Download minute-by-minute step data.

Similar setup to interday, except _**you need to [contact Fitbit](mailto:api@fitbit.com "email Fitbit")**_ to request access to intraday data. Also the  menu names in the spreadsheet will be slightly different. If you're just developing for a single personal Fitbit account, you can also use the new Personal application type instead of Server, which you can get intraday data with. [More information here](https://community.fitbit.com/t5/Web-API/Intraday-data-now-immediately-available-to-personal-apps/td-p/1014524).

Intraday script is based on [this post](http://quantifiedself.com/2014/09/download-minute-fitbit-data/).

Note: if you want to get heart rate data follow these additional steps, courtesy of [gthm on the Fitbit forum](https://community.fitbit.com/t5/Web-API/Google-apps-script-for-minute-by-minute-data-stopped-working/m-p/890582/highlight/true#M2685 "Fitbit Forum")

1) When requisting Oauth2 the default permission scope does not include heart rate. It pretty much includes everything but heart rate and calories. So for better measure I explicitly granted scope.
 
In function getFitbitService() { // updated the below line
.setScope('activity heartrate location nutrition profile settings sleep social weight')
 
2) Update the activities and intradays variables accordingly
 
`var activities = ["activities/heart"];`
`var intradays = ["activities-heart-intraday"];`
 
3) Request the proper URL for heart rate. The API docs are not clear enought, especially near the URL templates. I got the last template of the API docs working for heart rate.
 
It was easier for me to hardcode the URL so I just replaced the featch call with this
 
`var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/activities/heart/date/2015-07-07/1d/1sec/time/00:00/23:59.json", options);`
 
Once you get this request to work, you can generalize and construct the above request dynamically based on user inputs.
 
NOTE: I could not find a way to download intraday heart for multiple days through single call. Looks like the call only supports for a single day (too much data to include multiple days I guess). I am thinking about looping the date range and fetching the details multiple times.

I have also uploaded heartrate.gs which is a rough version of a script to download heart rate data.

## intraday_all.gs

See the instructions from intraday.gs

This version was created 2017-03-08. It supports downloading steps, calories, heartrate and other intraday data into one sheet. Time interval is by design one minute and cannot be changed with this version.

Configure the sheet name where you want the data to be saved inside the script. By default it is "Sheet1" and if you create a sheet with that name no script changes are needed.

This version retrieves one day per execution so no range can be specified, only a singular date.

Here you can see an example of the data it produces and some example charts:
https://docs.google.com/spreadsheets/d/1chREgu98XGocOM8mHyTvbUMlKG_-NfFXsLYHvwq9Dv8/edit#gid=1507130755
