// Description:
//   Use Hubot to send messages to Redis for Chrysus to consume!
//
// Dependencies:
//   "hubot": "latest"
//   "node-slack-client": "latest"
//   "redis": "latest"
//
// Configuration:
//   HUBOT_SLACK_TOKEN - This is the Hubot's Slack API token key
//   CHRYSUS_REDISHOST - This is the Redis IP Address or FQDN (must be resolvable from Hubot)
//   CHRYSUS_REDISPORT - This is the Redis TCP port (must be reachable from Hubot, usually TCP 6379)
//   CHRYSUS_REDISPASS - This is the Redis password (normally found on Redis in /etc/redis.conf set via requirepass RedisPasswordHere)
//   CHRYSUS_REDISCHAN - This is the Redis Pub/Sub channel (usually 'incoming' for Chrysus)
//
// Commands:
//   mtr IPAddressOrName
//
// Author:
//   Ernest G. Wilson II <ErnestGWilsonII@gmail.com>
////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////
// Ensure startup configuration  //
///////////////////////////////////
// Verify that all of the needed environment variables are available to start the Chrysus Engine
// Note: These are typically set in: /etc/systemd/system/chatops.service
// For console debug and testing you may manually set these variables by:
// export CHRYSUS_REDISHOST='RedisIPAddressHere'
// export CHRYSUS_REDISPORT='6379'
// export CHRYSUS_REDISPASS='RedisPasswordHere'
// export CHRYSUS_REDISCHAN='incoming'
var ensureConfig = function () {
    if (!process.env.HUBOT_SLACK_TOKEN) {
            throw new Error("Error: HUBOT_SLACK_TOKEN environment variable is not set");
        }
    if (!process.env.CHRYSUS_REDISHOST) {
        throw new Error("Error: CHRYSUS_REDISHOST environment variable is not set");
    }
    if (!process.env.CHRYSUS_REDISPORT) {
        throw new Error("Error: CHRYSUS_REDISPORT environment variable is not set");
    }
    if (!process.env.CHRYSUS_REDISPASS) {
        throw new Error("Error: CHRYSUS_REDISPASS environment variable is not set");
    }
    if (!process.env.CHRYSUS_REDISCHAN) {
        throw new Error("Error: CHRYSUS_REDISCHAN environment variable is not set");
    }
    return true;
};
ensureConfig();
////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////
// Global variables //
//////////////////////
var debug = true; // Controls debugging - In production turn OFF debugging!
var botKey = process.env.HUBOT_SLACK_TOKEN; // This is the unique Slack API Hubot key that identifies which bot the results will get posted as 
// Require specific Node.js modules
var redis = require("redis");
// Populate global Redis connection parameters variables based on environment variables
var redisHost = process.env.CHRYSUS_REDISHOST; // 'RedisIPAddressHere'
var redisPort = process.env.CHRYSUS_REDISPORT; // 'RedisPortHere'
var redisPass = process.env.CHRYSUS_REDISPASS; // 'RedisPasswordHere'
var redisChan = process.env.CHRYSUS_REDISCHAN; // 'RedisChannelHere'
////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////
module.exports = function (robot) {

    robot.respond(/mtr (.*)/i, function(msg) {

        // Optional debug is helpful for trouble shooting
        if (debug === true){console.log("msg.envelope.user.name: " + msg.envelope.user.name);} // See value of msg.envelope.user.name
        if (debug === true){console.log("msg.envelope.user.id: " + msg.envelope.user.id);} // See value of msg.envelope.user.id
        if (debug === true){console.log("msg.message.room: " + msg.message.room);} // See value of msg.message.room
        
        // Logging
        if (msg.envelope.user.name === msg.message.room) {console.log(msg.envelope.user.id + " " + msg.envelope.user.name + " in PRIVATE_DIRECT_MESSAGE issued " + msg.message);}
        else {console.log(msg.envelope.user.id + " " + msg.envelope.user.name + " in " + msg.message.room + " issued " + msg.message);}
        
        // Determine which Slack channel to have the output sent to (was the request sent to Hubot in a private message or in a specific channel)
        var SendToChannel;
        if (msg.envelope.user.name === msg.message.room) {SendToChannel=msg.envelope.user.id;} // Send it to the human in a private response where they requested it
        else {SendToChannel=msg.message.room;} // Send it to the specific channel where the human sent the request from

        // Read the human's input
        var AllArguments = msg.match[0];
        var Arg = AllArguments.split(" ");
        // Argument debugging
        if (debug === true){console.log("AllArguments: " + AllArguments);} // See value of AllArguments
        if (debug === true){console.log("Arg0: " + Arg[0]);} // See value of Arg[0]
        if (debug === true){console.log("Arg1: " + Arg[1]);} // See value of Arg[1]
        if (debug === true){console.log("Arg2: " + Arg[2]);} // See value of Arg[2]
        if (debug === true){console.log("Arg3: " + Arg[3]);} // See value of Arg[3]
        if (debug === true){console.log("Arg4: " + Arg[4]);} // See value of Arg[4]

        // Reply to the human so they know we heard the request!
        msg.send("Just a moment please as I perform the requested mtr for you...");

        // Generate the message that will be sent to Redis for Chrysus to consume
        var publishMessage = {
            "message": {
            "tasks": [
                {
                    "task": "mtr",
                    "target": Arg[2],
                    "outputs": [
                        {
                            "output": "slack",
                            "botKey": botKey,
                            "reqName": msg.envelope.user.name,
                            "reqRoom": SendToChannel,
                            "reqRawText": msg.envelope.message.rawText
                        }
                    ]
                }
            ]
            }
        }

        var publisher = redis.createClient(redisPort, redisHost);
        var dbAuth = function () {
            publisher.auth(redisPass);
        };
        publisher.addListener('connected', dbAuth);
        publisher.addListener('reconnected', dbAuth);
        dbAuth();

        var channel = redisChan;

        function myPublisher() {
            publisher.publish(channel, JSON.stringify(publishMessage));
        }

        myPublisher(channel, publishMessage);
    });
};
////////////////////////////////////////////////////////////
