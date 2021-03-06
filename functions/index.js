'use strict';

const functions = require('firebase-functions');
const {WebhookClient, Card, Suggestion} = require('dialogflow-fulfillment');
var BadRequestError = require('./http-errors').BadRequestError
var UnauthorizedError = require('./http-errors').UnauthorizedError

var mqtt = require('mqtt');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.publish_mqtt = functions.https.onRequest((request, response) => {

  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  const agent = new WebhookClient({ request, response });
  
  try
  {
    // Safety first. Check to see if the API key is what we configured before deploying the function
    if (functions.config().access.api_key != request.headers.api_key) {
      throw new UnauthorizedError("Invalid API Key - please check your configuration.");
    }

    function welcome(agent) {
      agent.add(`Welcome to home control assistant!`);
    }

    function fallback(agent) {
      agent.add(`I didn't understand`);
      agent.add(`I'm sorry, can you try again?`);
    }

    function blinds(agent) {
      agent.add(`this is a response from the blinds intent!`)    
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('blinds', blinds);
    agent.handleRequest(intentMap);
  }
  catch (err)
  {
    console.error(err)
    agent.add(err.message);
    agent.send_()
  }
});

function publishToMqtt(topic, message)
{
  //Options for connecting to the MQTT host
  var options = {
    port: functions.config().mqtt.server.port,
    host: functions.config().mqtt.server.host,
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username: functions.config().mqtt.server.user,
    password: functions.config().mqtt.server.password,
    keepalive: 60,
    reconnectPeriod: 1000,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    encoding: 'utf8'
  };

  //Let's connect
  var client = mqtt.connect(functions.config().mqtt.server.host, options);

  client.on('connect', function () {
    console.log('client connected');
  });

  client.on('error', function(err) {
    console.error(err);
  });

  //debugging - check the firebase function log
  console.log("topic: " + topic);
  console.log("message: "  + message);

  //publish the topic and payload
  client.publish(topic, message, function(err) {
    // handle the error
    if ( err ) {
      console.log("Error:" + err);
      response.send("Error:" + err);
      return;
    }

    //If the publish is successful then return
    response.send("Successfullly published message: '" + message + "' to topic: " + topic);

    //end the connection to the mqtt server
    client.end();
  });
}