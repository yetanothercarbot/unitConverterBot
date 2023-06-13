/* This is what temporarily stores the last seen conversion for each channel */

var seenConversions = {};

function retrieveConversionByChannel(guildId, channelId) {
    return seenConversions[guildId + channelId];
}

function setLastConversionByChannel(guildId, channelId, value) {
    seenConversions[guildId + channelId] = value;
}

module.exports = {
    retrieve: retrieveConversionByChannel,
    set: setLastConversionByChannel
}