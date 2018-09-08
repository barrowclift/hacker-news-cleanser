"use strict"

const CLASS_NAME = "emailReport"
const nodemailer = require('nodemailer');

var CONFIG = require("./config")
var mongoConnection = require("./mongoConnection")
var tables = require("./tables")
var logger = require("./logger")

function createHumanReadableDate(date) {
	var dd = date.getDate()
	var mm = date.getMonth() + 1 // January is 0!
	var yyyy = date.getFullYear()
	var date = dd+'/'+mm+'/'+yyyy
	return date;
}

function createHtmlStoriesList(stories) {
	var htmlStories = ""
	for (var i in stories) {
		var story = stories[i]
		var humanReadableHideTime = new Date(story.hideTime).toLocaleString()
		var storyElement = `
		<tr class="athing" id="`+story.storyId+`">
			<td align="right" valign="top" class="title"><span class="rank">&#8226;</span></td>
			<td valign="top" class="votelinks"></td>
			<td class="title"><a href="`+story.link+`" class="storylink">`+story.title+`</a><span class="sitebit comhead"> (<a href="https://news.ycombinator.com/from?site=`+story.source+`"><span class="sitestr">`+story.source+`</span></a>)</span>
			</td>
		</tr>
		<tr>
			<td colspan="2"></td>
			<td class="subtext">
				Originally shared by <a href="https://news.ycombinator.com/user?id=`+story.user+`" class="hnuser">`+story.user+`</a> at <span class="age"><a href="https://news.ycombinator.com/item?id=`+story.storyId+`">`+humanReadableHideTime+`</a></span>
		</tr>
		<tr class="spacer" style="height:6px"></tr>
		`
		htmlStories += storyElement
	}
	return htmlStories
}

function shouldSendCleanserReport(callback) {
	if (!CONFIG.emailReportEnabled) {
		return false;
	}

	var query = {}
	var sortQuery = {
		sentTime: -1
	}
	mongoConnection.find(tables.WEEKLY_REPORTS_LOG, query, sortQuery, function(error, reports) {
		if (error) {
			logger.logError(CLASS_NAME, "shouldSendCleanserReport", "Unable to get time of last report, " + error)
			callback(false)
		} else {
			var lookback = new Date();
			lookback.setDate(lookback.getDate() - CONFIG.emailReportEnabled);
			if (reports.length > 0) {
				var lastSentTime = new Date(reports[0].sentTime)
				if (lookback.getTime() > lastSentTime.getTime()) {
					var allStoriesSinceLastReportQuery = {
						hideTime: {
							$gte: lastSentTime.getTime()
						}
					}
					var sortQuery = {
						hideTime: -1
					}
					mongoConnection.find(tables.CLEANSED_ITEMS, allStoriesSinceLastReportQuery, sortQuery, function(error, cleansedStoriesSinceLastReport) {
						if (error) {
							logger.logError(CLASS_NAME, "shouldSendCleanserReport", "Unable to collect stories for cleanser report, " + error)
							callback(false)
						} else {
							cleansedStoriesSinceLastReport.sort(function(a, b) {
								return parseFloat(b.hideTime) - parseFloat(a.hideTime);
							});
							callback(true, cleansedStoriesSinceLastReport)
						}
					})
				} else {
					callback(false)
				}
			} else {
				var lastSentTime = new Date()
				var sentTimeDocument = {
					sentTime: lastSentTime.getTime()
				}
				mongoConnection.insertOne(tables.WEEKLY_REPORTS_LOG, sentTimeDocument, function(error, result) {
					if (error) {
						console.log("FAILED")
					} else {
						console.log("INSERTED")
					}
				})
				callback(false)
			}
		}
	})
}

function sendCleanserReport(stories, totalCount) {
	var rightNow = new Date()
	var today = createHumanReadableDate(rightNow)
	var subject = "Hacker News Cleanser Weekly Report: " + today
	var body = `
	<html op="news">
	<head>
		<meta name="referrer" content="origin">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<style>
			body  { font-family:Verdana, Geneva, sans-serif; font-size:10pt; color:#828282; background-color: rgb(246, 246, 239); }
			td    { font-family:Verdana, Geneva, sans-serif; font-size:10pt; color:#828282; }
			.admin td   { font-family:Verdana, Geneva, sans-serif; font-size:8.5pt; color:#000000; }
			.subtext td { font-family:Verdana, Geneva, sans-serif; font-size:  7pt; color:#828282; }
			.rank { color:#828282; }
			input    { font-family:monospace; font-size:10pt; }
			input[type="submit"] { font-family:Verdana, Geneva, sans-serif; }
			textarea { font-family:monospace; font-size:10pt; }
			a:link    { color:#000000; text-decoration:none; }
			a:visited { color:#828282; text-decoration:none; }
			.spacer { height: 6px; }
			.default { font-family:Verdana, Geneva, sans-serif; font-size: 10pt; color:#828282; }
			.admin   { font-family:Verdana, Geneva, sans-serif; font-size:8.5pt; color:#000000; }
			.title   { font-family:Verdana, Geneva, sans-serif; font-size: 10pt; color:#828282; padding-left:5px; padding-right:5px; }
			.subtext { font-family:Verdana, Geneva, sans-serif; font-size:  7pt; color:#828282; padding-left:5px;}
			.yclinks { font-family:Verdana, Geneva, sans-serif; font-size:  8pt; color:#828282; }
			.pagetop { font-family:Verdana, Geneva, sans-serif; font-size: 10pt; color:#222222; }
			.comhead { font-family:Verdana, Geneva, sans-serif; font-size:  8pt; color:#828282; }
			.comment { font-family:Verdana, Geneva, sans-serif; font-size:  9pt; }
			.hnname  { margin-right: 5px; }
			.comment a:link, .comment a:visited { text-decoration: underline; }
			.noshow { display: none; }
			.nosee { visibility: hidden; pointer-events: none; cursor: default }
			.c00, .c00 a:link { color:#000000; }
			.c5a, .c5a a:link, .c5a a:visited { color:#5a5a5a; }
			.c73, .c73 a:link, .c73 a:visited { color:#737373; }
			.c82, .c82 a:link, .c82 a:visited { color:#828282; }
			.c88, .c88 a:link, .c88 a:visited { color:#888888; }
			.c9c, .c9c a:link, .c9c a:visited { color:#9c9c9c; }
			.cae, .cae a:link, .cae a:visited { color:#aeaeae; }
			.cbe, .cbe a:link, .cbe a:visited { color:#bebebe; }
			.cce, .cce a:link, .cce a:visited { color:#cecece; }
			.cdd, .cdd a:link, .cdd a:visited { color:#dddddd; }
			.pagetop a:visited { color:#000000;}
			.topsel a:link, .topsel a:visited { color:#ffffff; }
			.subtext a:link, .subtext a:visited { color:#828282; }
			.subtext a:hover { text-decoration:underline; }
			.comhead a:link, .subtext a:visited { color:#828282; }
			.comhead a:hover { text-decoration:underline; }
			.default p { margin-top: 8px; margin-bottom: 0px; }
			.pagebreak {page-break-before:always}
			pre { overflow: auto; padding: 2px; }
			pre:hover { overflow:auto }
			.votearrow {
			  width:      10px;
			  height:     10px;
			  border:     0px;
			  margin:     3px 2px 6px;
			  background: url("grayarrow.gif")
			  no-repeat;
			}
			.votelinks.nosee div.votearrow.rotate180 {
			  display: none;
			}
			@media only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min-device-pixel-ratio: 2) {
			  .votearrow { background-size: 10px; background-image: url("grayarrow2x.gif"); }
			}
			.rotate180 {
			  -webkit-transform: rotate(180deg);  /* Chrome and other webkit browsers */
			  -moz-transform:    rotate(180deg);  /* FF */
			  -o-transform:      rotate(180deg);  /* Opera */
			  -ms-transform:     rotate(180deg);  /* IE9 */
			  transform:         rotate(180deg);  /* W3C complaint browsers */

			  /* IE8 and below */
			  -ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=-1, M12=0, M21=0, M22=-1, DX=0, DY=0, SizingMethod=\'auto expand\')";
			}
			/* mobile device */
			@media only screen
			and (min-width : 300px)
			and (max-width : 750px) {
			  #hnmain { width: 100%; }
			  body { padding: 0; margin: 0; width: 100%; -webkit-text-size-adjust: none; }
			  td { height: inherit !important; }
			  .title, .comment { font-size: inherit;  }
			  span.pagetop { display: block; margin: 3px 5px; font-size: 12px; }
			  span.pagetop b { display: block; font-size: 15px; }
			  table.comment-tree .comment a { display: inline-block; max-width: 200px; overflow: hidden; white-space: nowrap;
				text-overflow: ellipsis; vertical-align:top; }
			  img[src="s.gif"][width="40"] { width: 12px; }
			  img[src="s.gif"][width="80"] { width: 24px; }
			  img[src="s.gif"][width="120"] { width: 36px; }
			  img[src="s.gif"][width="160"] { width: 48px; }
			  img[src="s.gif"][width="200"] { width: 60px; }
			  img[src="s.gif"][width="240"] { width: 72px; }
			  img[src="s.gif"][width="280"] { width: 84px; }
			  img[src="s.gif"][width="320"] { width: 96px; }
			  img[src="s.gif"][width="360"] { width: 108px; }
			  img[src="s.gif"][width="400"] { width: 120px; }
			  img[src="s.gif"][width="440"] { width: 132px; }
			  img[src="s.gif"][width="480"] { width: 144px; }
			  img[src="s.gif"][width="520"] { width: 156px; }
			  img[src="s.gif"][width="560"] { width: 168px; }
			  img[src="s.gif"][width="600"] { width: 180px; }
			  img[src="s.gif"][width="640"] { width: 192px; }
			  img[src="s.gif"][width="680"] { width: 204px; }
			  img[src="s.gif"][width="720"] { width: 216px; }
			  img[src="s.gif"][width="760"] { width: 228px; }
			  img[src="s.gif"][width="800"] { width: 240px; }
			  img[src="s.gif"][width="840"] { width: 252px; }
			  .title { font-size: 11pt; line-height: 14pt;  }
			  .subtext { font-size: 9pt; }
			  .itemlist { padding-right: 5px;}
			  .votearrow { transform: scale(1.3,1.3); margin-right: 6px; }
			  .votearrow.rotate180 {
				-webkit-transform: rotate(180deg) scale(1.3,1.3);  /* Chrome and other webkit browsers */
				-moz-transform:    rotate(180deg) scale(1.3,1.3);  /* FF */
				-o-transform:      rotate(180deg) scale(1.3,1.3);  /* Opera */
				-ms-transform:     rotate(180deg) scale(1.3,1.3);  /* IE9 */
				transform:         rotate(180deg) scale(1.3,1.3);  /* W3C complaint browsers */
			  }
			  .votelinks { min-width: 18px; }
			  .votelinks a { display: block; margin-bottom: 9px; }
			  input[type="text"], input[type="number"], textarea { font-size: 16px; width: 90%; }
			}
			.comment { max-width: 1215px; overflow: auto }
			pre { max-width: 900px; }

			@media only screen and (min-width : 300px) and (max-width : 389px) {
			  .comment { max-width: 270px; overflow: auto }
			  pre { max-width: 200px; }
			}
			@media only screen and (min-width : 390px) and (max-width : 509px) {
			  .comment { max-width: 350px; overflow: auto }
			  pre { max-width: 260px; }
			}
			@media only screen and (min-width : 510px) and (max-width : 599px) {
			  .comment { max-width: 460px; overflow: auto }
			  pre { max-width: 340px; }
			}
			@media only screen and (min-width : 600px) and (max-width : 689px) {
			  .comment { max-width: 540px; overflow: auto }
			  pre { max-width: 400px; }
			}
			@media only screen and (min-width : 690px) and (max-width : 809px) {
			  .comment { max-width: 620px; overflow: auto }
			  pre { max-width: 460px; }
			}
			@media only screen and (min-width : 810px) and (max-width : 899px) {
			  .comment { max-width: 730px; overflow: auto }
			  pre { max-width: 540px; }
			}
			@media only screen and (min-width : 900px) and (max-width : 1079px) {
			  .comment { max-width: 810px; overflow: auto }
			  pre { max-width: 600px; }
			}
			@media only screen and (min-width : 1080px) and (max-width : 1169px) {
			  .comment { max-width: 970px; overflow: auto }
			  pre { max-width: 720px; }
			}
			@media only screen and (min-width : 1170px) and (max-width : 1259px) {
			  .comment { max-width: 1050px; overflow: auto }
			  pre { max-width: 780px; }
			}
			@media only screen and (min-width : 1260px) and (max-width : 1349px) {
			  .comment { max-width: 1130px; overflow: auto }
			  pre { max-width: 840px; }
			}
		</style>
		<link rel="shortcut icon" href="https://news.ycombinator.com/favicon.ico">
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<title>`+subject+`</title>
	</head>
	<body>
		<center>
			<table id="hnmain" border="0" cellpadding="0" cellspacing="0" width="85%" bgcolor="#f6f6ef">
				<tr>
					<td bgcolor="#ff6600">
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:2px">
							<tr>
								<td style="width:18px;padding-right:4px"><a href="https://news.ycombinator.com"><img src="https://news.ycombinator.com/y18.gif" width="18" height="18" style="border:1px white solid;"></a></td>
								<td style="line-height:12pt; height:10px;"><span class="pagetop"><b class="hnname"><a href="https://news.ycombinator.com/news">Hacker News</a></b></td>
								<td style="text-align:right;padding-right:4px;"><span class="pagetop">
	<a id="me" href="https://news.ycombinator.com/user?id=`+CONFIG.username+`">`+CONFIG.username+`</a> (`+totalCount+` stories cleansed, `+stories.length+` this week)</span></td>
							</tr>
						</table>
					</td>
				</tr>
				<tr style="height:10px"></tr>
				<tr>
					<td>
						<table border="0" cellpadding="0" cellspacing="0" class="itemlist">`
							+createHtmlStoriesList(stories)+
							`<tr class="morespace" style="height:10px"></tr>
						</table>
					</td>
				</tr>
				<tr>
					<td><img src="s.gif" height="10" width="0">
						<table width="100%" cellspacing="0" cellpadding="1">
							<tr>
								<td bgcolor="#ff6600"></td>
							</tr>
						</table>
						<br>
						<center><a href="#TODO">Generated by the Hacker News Cleanser</a></center>
						<br>
					</td>
				</tr>
			</table>
		</center>
	</body>
	</html>
	`

	nodemailer.createTestAccount((error, account) => {
		// Create reusable transporter object using the default SMTP transport
		let transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: CONFIG.emailReportSender,
				pass: CONFIG.emailReportSenderPassword
			}
		});

		// Setup email data with unicode symbols
		let mailOptions = {
			from: '"Hacker News Cleanser" <'+CONFIG.emailReportSender+'>',
			to: CONFIG.emailReportRecipients, // Comma delimited list of recievers
			subject: subject,
			text: body,
			html: body
		};

		// Send mail with defined transport object
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return console.log(error);
			} else {
				logger.logInfo(CLASS_NAME, "Weekly report has been sent: " + info.messageId)
				var sentTimeDocument = {
					sentTime: rightNow.getTime()
				}
				mongoConnection.insertOne(tables.WEEKLY_REPORTS_LOG, sentTimeDocument, function(error, result) {
					if (error) {
						logger.logError(CLASS_NAME, "sendCleanserReport", "Couldn't save the timestamp of the weekly report into Mongo, will continue to send every cleanse cycle until this issue is resolved.")
					}
				})
			}
		});
	});	
}

module.exports = {
	shouldSendCleanserReport: shouldSendCleanserReport,
	sendCleanserReport: sendCleanserReport
}
