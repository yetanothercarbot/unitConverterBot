"use strict"

const fs = require('node:fs');
const path = require('node:path');

const { Client, Collection, Events, GatewayIntentBits  } = require('discord.js');
const storage = require('./storage.js');
const { token } = require('./config.json');
const units = require('./units.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

/* Run command */
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
    console.log(interaction)

	if (interaction.commandName == "convert") {
        var response = storage.retrieve(interaction.guildId, interaction.channelId);
        if (response) {
            interaction.reply({content: response});
        } else {
            interaction.reply({content: "No recent unit conversions.", ephemeral: true})
        }
    }
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on(Events.MessageCreate , (message) => {
    console.log(JSON.stringify(message))
    var conversions = []
    if (!message.author.bot) {
        // Regex: '[0-9]+\s*' plus unit plus '\b'.
        units.forEach((currUnitType) => {
            conversions = conversions.concat(createConversions(message.content, currUnitType.unitsSI, getImperial));
            conversions = conversions.concat(createConversions(message.content, currUnitType.unitsImperial, getMetric));
        });
    }
    if (conversions.length != 0) {
        storage.set(message.guildId, message.channelId, conversions.join("\n"));
    }
})

function createConversions(messageText, unitList, conversionFunction) {
    var conversions = [];
    unitList.forEach((unit) => {
        var matches = [];
        matches = matches.concat(Array.from(messageText.matchAll("\\d+\\.?\\d*\\s*" + unit.name + "\\b")));
        unit.alternate.forEach((altName) => {
            matches = matches.concat(Array.from(messageText.matchAll("\\d+\\.?\\d*\\s*" + altName + "\\b")));
        });

        if (matches.length > 0) {
            matches.forEach((match) => {
                conversions.push(match[0] + " is "
                    + conversionFunction(parseFloat(match[0]), unit.name));
            });
        }
    });
    return conversions;
}

/*
 * Converts a given imperial value to metric.
 * Arguments:
   * value (int): The value to be converted
   * oldUnit (str): Name of imperial unit to be converted
 * Returns:
   * (str): Converted value w/ units
 */
function getMetric(value, oldUnit) {
    var baseValue = 0;
    var unitTypeIndex = -1;
    units.forEach((unitType, i) => {
        unitType.unitsImperial.forEach((currUnit) => {
            if (currUnit.name == oldUnit) {
                unitTypeIndex = i;
                baseValue = value * currUnit.conversionFactor;
            }
        });
    });

    // Generate unit options
    var outputUnits = [];

    units[unitTypeIndex].unitsSI.forEach((candidate) => {
        if (candidate.target) {
            outputUnits.push({"name": candidate.name, "value": baseValue/candidate.conversionFactor});
        }
    });


    // Now sort, by distance to the value 70 to find most appropriate conversion.
    outputUnits.sort((a, b) => {
        return Math.abs(20 - a.value) - Math.abs(20 - b.value)
    });
    console.log(outputUnits);

    return Math.round(100*outputUnits[0].value)/100 + " " + outputUnits[0].name;
}

/*
 * Converts given metric unit to imperial.
 * Arguments:
   * value (int): The value to be converted
   * oldUnit (str): Name of metric unit.
 * Returns:
   * (str): Converted value w/ units.
 */
function getImperial(value, oldUnit) {
    var baseValue = convertToBaseSI(value, oldUnit);

    // Get type of unit
    var unitTypeIndex = -1;
    units.forEach((unitType, i) => {
        unitType.unitsSI.forEach((currUnit) => {
            if (currUnit.name == oldUnit) {
                unitTypeIndex = i;
            }
        });
    });
    if (unitTypeIndex == -1) {
        throw "Invalid unit."
    }

    // Generate unit options
    var outputUnits = [];

    units[unitTypeIndex].unitsImperial.forEach((candidate) => {
        if (candidate.target) {
            outputUnits.push({"name": candidate.name, "value": baseValue/candidate.conversionFactor});
        }
    });


    // Now sort, by distance to the value 70 to find most appropriate conversion.
    outputUnits.sort((a, b) => {
        return Math.abs(20 - a.value) - Math.abs(20 - b.value)
    });
    console.log(outputUnits);

    // Return first value.
    var toReturn = "";
    if (outputUnits[0].value < 0.01) {
        // don't try to round bc it's so small!
        toReturn += outputUnits[0].value;
    } else {
        toReturn += Math.round(100*outputUnits[0].value)/100;
    }
    toReturn += " " + outputUnits[0].name;
    return toReturn
}

/*
 * Converts an SI value to its base value.
 * Arguments:
   * value (int): the value to convert
   * oldUnit (str): the name of the SI unit being converted
 * Returns:
   * Converted value (no units) - base value for this unit type.
 */
function convertToBaseSI(value, oldUnit) {
    for (const currUnitType of units) {
        for (const currSI of currUnitType.unitsSI) {
            if (currSI.name == oldUnit) {
                console.log(value, oldUnit, "=>", value*currSI.conversionFactor);
                return value*currSI.conversionFactor;
            }
        }
    }
    throw "Invalid unit."
}

// Login to Discord with your client's token
client.login(token);
