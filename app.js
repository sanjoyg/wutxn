// WU BOT

var restify = require('restify');
var builder = require('botbuilder');


console.log('Starting WU Bot...');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'cbb3405c-70d4-4e7d-b4b6-83940686b651',
   appPassword: 'on2XB5NQNOqfi10fOgGZaVR'
//	appId: null,
//	appPassword: null
});

//var connector = new builder.ConsoleConnector().listen()
var bot = new builder.UniversalBot(connector);
server.post('/', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var recognizer = new builder.LuisRecognizer('https://api.projectoxford.ai/luis/v1/application?id=95afd29a-06d9-498f-9849-16c55dfc3d1b&subscription-key=fe19cd20c4a84c829a1c8d572e198788')
//var intents = new builder.IntentDialog();
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', intents);

intents.matches('TrackATransfer', [

	function (session, args, next) {
		var mtcn = builder.EntityRecognizer.findEntity(args.entities, 'builtin.number');
		if (mtcn != null) {
			session.userData.mtcn = mtcn.entity;
			console.log(' got mtcn');
			next();
		} else {
			session.beginDialog('/lasttransaction');
		}
	},

	function (session, results, next) {
		session.beginDialog('/lastname');
	},

	function (session, results) {
		if ( session.userData.mtcn == null)
			session.send('Your last transfer has been remitted to the recepient, succesfully!');
		else
			session.send('MTCN : ' + session.userData.mtcn + ' has been remitted to the recepient, succesfully!' );

		session.userData.mtcn = null;
		session.userData.lastName = null;
	}
]);

bot.dialog('/lasttransaction', [
	function (session, next) {
		builder.Prompts.confirm(session, "Should I look for the status of your last transaction?");
	}, 

	function (session, results) {
		console.log(results);
		if (results.response == true)
			session.endDialog();
		else
			session.beginDialog('/mtcn');
	}
]);

bot.dialog('/lastname',[
	function(session, next) {
		var promptStr = "For security reasons please confirm the last name of the recepient ? (to cancel the operation respond with 'cancel' or 'mtcn' for alternate mtcn)"

		if (session.userData.mtcn == null)
			promptStr =  "Alright, lets pick the status of the last transaction! " + promptStr;
		
		builder.Prompts.text(session,promptStr);
	},

	function (session,results,next) {
		console.log(results.response.entity);
		
		if (results.response == "cancel") {
			session.endDialog();
		} else if (results.response == "mtcn") {
			session.beginDialog('/mtcn');
		} else {
			session.userData.lastName = results.response;
			next();
		}
	},

	function(session,results) {
		if (session.userData.mtcn == null) {
			session.send("Alright finding the status of last transfer with last name " + session.userData.lastName);
		} else {
			session.send("Alright finding status of " + session.userData.mtcn + " with last name " + session.userData.lastName);
		}
		session.endDialog();
	}
]);

bot.dialog('/mtcn',[
	function(session) {
		builder.Prompts.text(session, "Alright, help me with the mtcn that you want me to track? (to cancel the operation respond with 'cancel')");
	},

	function (session,results) {
		if (results.response == "cancel") {
							
		} else {
			console.log(results);
			session.userData.mtcn = results.response;
		}
		session.endDialog();
	}
]);

intents.matches('AgentLocation', [

	function (session, args, next) {	
		var country = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.country');
		var city = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.city');
		
		if (city != null)
			session.userData.city = city.entity;
		if (country != null)
			session.userData.country = country.entity;
		next();
	},

	function (session, results, next) {
		if (session.userData.city == null) {
			session.beginDialog('/city');
		} else {
			next();
		}
	},

	function (session,results) {
		var promptStr = "Let me go ahead and find an agent location @ " + (session.userData.city == null ? session.userData.zipCode : session.userData.city);		
		session.send(promptStr);
		
		var msg = new builder.Message(session)
        	.textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("Agent Location @ " + session.userData.city)
                    .subtitle('WU Agent')
                    .text(session.userData.city)
                    .images([
                        builder.CardImage.create(session, "http://www.wyomason.net/images/map_with_pin.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://www.westernunion.com"))
            ]);

        session.send(msg);
        
		session.userData.city = null;
	}
]);

bot.dialog('/city', [
	function (session) {
		builder.Prompts.text(session, "Please help me with the city or zip code")
	},

	function (session, results) {
		//var city = builder.EntityRecognizer.findEntity(results.entities, 'builtin.geography.city');
		//console.log(city);
		//if ( city != null) {
		//	session.userData.city = city.entity;
		//} else {
		//	session.userData.zipCode = results.entity;
		//}
		session.userData.city = results.response;
		session.endDialog();
	}
]);

intents.matches(/^reset/i,[
	function(session) {
		session.userData.mtcn = null
		session.userData.lastName = null
		session.send('As you wish, have forgotten all that you commanded earlier! Lets try again, shall we?');
		session.endDialog();
	}
]);

intents.onDefault([
    function (session, args) {
        session.send('Hello welcome to wubot!');
    }
]);