// var webSocket = new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/ws/");
var webSocket = new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host.split(":")[0] + ":5050");

webSocket.onopen = function(event) {
    console.log("Connection established!");
};

var selectedChannel = 0;
var channels = [];

var members = [];

var currentServerCode = "";

var isOwner = false;
var hasCreatePermissions = false;
var createPermissions = false;

webSocket.onmessage = function(event) {
    var messageData = JSON.parse(event.data);
    if (messageData.type === 'serverData') {
        for(channel in messageData.channels) {
            channel = messageData.channels[channel];
            channels.push({
                name: channel.name,
                messages: [],
            });
        }
        currentServerCode = messageData.serverCode;
        updateChannels();

        var joinContainer = document.getElementById('joinContainer');
        joinContainer.style.display = 'none';

        if(messageData.owner) {
            isOwner = true;
        } else {
            isOwner = false;
        }
        updatePermissions();

        members = messageData.members;
        updateMembers();
    } else if(messageData.type === 'updateMembers') {
        members = messageData.members;
        updateMembers();
    } else if(messageData.type === 'updatePermissions') {
        createPermissions = messageData.createPermissions;
        channels[selectedChannel].messages.push({
            name: false,
            message: `${messageData.name} has ${messageData.createPermissions ? 'given' : 'removed'} you create permissions.`,
        });
        updatePermissions();
        updateMessages();
    } else if(messageData.type === 'message') {
        channels[messageData.channel].messages.push({
            name: messageData.name,
            userID: messageData.id,
            message: messageData.message,
        });
        
        updateMessages();
    } else if(messageData.type === 'unknownServer') {
        var serverCodeInput = document.getElementById('serverCodeInput');

        serverCodeInput.classList.add("shake");
        setTimeout(function() {
            serverCodeInput.classList.remove("shake");
        }, 1000);
    } else if(messageData.type === 'memberJoined') {
        channels[selectedChannel].messages.push({
            name: false,
            message: messageData.name + ' joined the server.',
        });
        updateMessages();
    } else if(messageData.type === 'memberLeft') {
        channels[selectedChannel].messages.push({
            name: false,
            message: messageData.name + ' left the server.',
        });
        updateMessages();
    } else if(messageData.type === 'ownerLeft') {
        isOwner = true;
        updatePermissions();
    } else if(messageData.type === 'channelRemoved') {
        channels.splice(messageData.channelIndex, 1);
        if(selectedChannel >= channels.length) {
            selectedChannel = channels.length - 1;
        }
        updateChannels();
        updateMessages();
    } else if(messageData.type === 'channelCreated') {
        channels.push({
            name: messageData.channelName,
            messages: [],
        });
        updateChannels();
    }
};

function updatePermissions() {
    var permissionsDisplay = document.getElementById('serverPermissions');

    if(isOwner) {
        permissionsDisplay.innerHTML = `
            <div class="server-permissions-name">You're the server owner.</div>
            <svg class="server-permissions-icon server-owner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M576 136c0 22.09-17.91 40-40 40c-.248 0-.4551-.1266-.7031-.1305l-50.52 277.9C482 468.9 468.8 480 453.3 480H122.7c-15.46 0-28.72-11.06-31.48-26.27L40.71 175.9C40.46 175.9 40.25 176 39.1 176c-22.09 0-40-17.91-40-40S17.91 96 39.1 96s40 17.91 40 40c0 8.998-3.521 16.89-8.537 23.57l89.63 71.7c15.91 12.73 39.5 7.544 48.61-10.68l57.6-115.2C255.1 98.34 247.1 86.34 247.1 72C247.1 49.91 265.9 32 288 32s39.1 17.91 39.1 40c0 14.34-7.963 26.34-19.3 33.4l57.6 115.2c9.111 18.22 32.71 23.4 48.61 10.68l89.63-71.7C499.5 152.9 496 144.1 496 136C496 113.9 513.9 96 536 96S576 113.9 576 136z"/></svg>
        `;
    } else if(createPermissions) {
        permissionsDisplay.innerHTML = `
            <div class="server-permissions-name">You're a server member with create permissions.</div>
        `;
    } else {
        permissionsDisplay.innerHTML = `
            <div class="server-permissions-name">You're a server member.</div>
        `;
    }

    hasCreatePermissions = false;

    if(isOwner || createPermissions) hasCreatePermissions = true;

    updateChannels();
}

function selectChannel(channel) {
    selectedChannel = channel;
    updateChannels();
    updateMessages();
}

function updateChannels() {
    var channelSelect = document.getElementById('channels');
    channelSelect.innerHTML = `
    <div class="channels-name">
        Channels
        ${!hasCreatePermissions ? '' : `<svg tabindex="1" onclick="addChannel()" class="add-channel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"/></svg>`}
    </div>`;
    for (var i = 0; i < channels.length; i++) {
        channelSelect.innerHTML += `
        <div tabindex="1" class="channel ${i === selectedChannel ? 'selected-channel' : ''}" onclick="selectChannel(${i})">
            <!-- arrow right --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M438.6 278.6l-160 160C272.4 444.9 264.2 448 256 448s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L338.8 288H32C14.33 288 .0016 273.7 .0016 256S14.33 224 32 224h306.8l-105.4-105.4c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l160 160C451.1 245.9 451.1 266.1 438.6 278.6z"/></svg>
            <span class="channel-name">${channels[i].name}</span>
            ${!hasCreatePermissions ? '' : `<svg onclick="removeChannel(${i})" class="channel-remove" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M376.6 427.5c11.31 13.58 9.484 33.75-4.094 45.06c-5.984 4.984-13.25 7.422-20.47 7.422c-9.172 0-18.27-3.922-24.59-11.52L192 305.1l-135.4 162.5c-6.328 7.594-15.42 11.52-24.59 11.52c-7.219 0-14.48-2.438-20.47-7.422c-13.58-11.31-15.41-31.48-4.094-45.06l142.9-171.5L7.422 84.5C-3.891 70.92-2.063 50.75 11.52 39.44c13.56-11.34 33.73-9.516 45.06 4.094L192 206l135.4-162.5c11.3-13.58 31.48-15.42 45.06-4.094c13.58 11.31 15.41 31.48 4.094 45.06l-142.9 171.5L376.6 427.5z"/></svg>`}
        </div>`
    }
    channelSelect.innerHTML += `<div class="server-code-display" id="serverCodeDisplay">
        <div class="server-join-code">Join code: ${currentServerCode}</div>
        <div tabindex="1" class="leave-server-button" onclick="leaveServer()">Leave server</div>
    </div>`;
}

function updateMembers() {
    var membersElem = document.getElementById('members');
    membersElem.innerHTML = '<div class="members-name">Members</div>';
    for (var i = 0; i < members.length; i++) {
        membersElem.innerHTML += `
        <div class="member">
            <div tabindex="1" class="member-name">${members[i].name}${members[i].permissions.isOwner ? '<svg class="server-permissions-icon member-owner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M576 136c0 22.09-17.91 40-40 40c-.248 0-.4551-.1266-.7031-.1305l-50.52 277.9C482 468.9 468.8 480 453.3 480H122.7c-15.46 0-28.72-11.06-31.48-26.27L40.71 175.9C40.46 175.9 40.25 176 39.1 176c-22.09 0-40-17.91-40-40S17.91 96 39.1 96s40 17.91 40 40c0 8.998-3.521 16.89-8.537 23.57l89.63 71.7c15.91 12.73 39.5 7.544 48.61-10.68l57.6-115.2C255.1 98.34 247.1 86.34 247.1 72C247.1 49.91 265.9 32 288 32s39.1 17.91 39.1 40c0 14.34-7.963 26.34-19.3 33.4l57.6 115.2c9.111 18.22 32.71 23.4 48.61 10.68l89.63-71.7C499.5 152.9 496 144.1 496 136C496 113.9 513.9 96 536 96S576 113.9 576 136z"/></svg>' : ''}</div>
        </div>`
    }
}

function removeChannel(index) {
    if(channels.length > 1) {
        webSocket.send(JSON.stringify({
            "type": "removeChannel",
            "channelIndex": index,
            "serverCode": currentServerCode
        }));
    }
}

function addChannel() {
    var channelNameContainer = document.getElementById('channelNameContainer');
    channelNameContainer.style.display = "flex";
}

function confirmName() {
    var channelNameContainer = document.getElementById('channelNameContainer');
    channelNameContainer.style.display = "none";

    var channelNameInput = document.getElementById('channelNameInput');
    var channelName = channelNameInput.value;

    channelName = channelName.trim();
    if (channelName.length === 0) {
        channelNameInput.classList.add('shake');
        setTimeout(function() {
            channelNameInput.classList.remove('shake');
        }, 1000);
        return;
    }

    channelNameInput.value = '';

    webSocket.send(JSON.stringify({
        "type": "createChannel",
        "channelName": channelName,
        "serverCode": currentServerCode
    }));
}

function cancelName() {
    var channelNameContainer = document.getElementById('channelNameContainer');
    channelNameContainer.style.display = "none";
}

function openInfo() {
    var infoContainer = document.getElementById('infoScreenContainer');
    if(infoContainer.style.display === "flex") {
        infoContainer.style.display = "none";
    } else {
        infoContainer.style.display = "flex";
    }
}

function toggleChannels() {
    var channels = document.getElementById("channels");
    channels.classList.toggle("open");
}

function toggleUsers() {
    var users = document.getElementById("members");
    users.classList.toggle("open");
}

function closeInfo() {
    var infoContainer = document.getElementById('infoScreenContainer');
    infoContainer.style.display = "none";
}

function leaveServer() {
    webSocket.send(JSON.stringify({
        "type": "leaveServer",
    }));

    channels = [];
    members = [];
    selectedChannel = 0;
    currentServerCode = '';
    isOwner = false;

    var joinContainer = document.getElementById('joinContainer');
    joinContainer.style.display = "flex";

    var channelSelect = document.getElementById('channels');
    channelSelect.innerHTML = '';

    var messages = document.getElementById('messages');
    messages.innerHTML = '';

    var channelsElem = document.getElementById('channels');
    channelsElem.innerHTML = '<div class="channels-name">Channels</div>';

    var membersElem = document.getElementById('members');
    membersElem.innerHTML = '<div class="members-name">Members</div>';

    var permissionsDisplay = document.getElementById('serverPermissions');
    permissionsDisplay.innerHTML = '';
}

window.onload = function() {
    var messageInput = document.getElementById('messageInput');
    document.querySelector(":root").style.setProperty("--message-height", messageInput.scrollHeight + "px");
    messageInput.addEventListener("input", function (e) {
        updateMessageInput(this);
    });

    messageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            sendMessage();
            e.preventDefault();
        }
    });

    var nameInput = document.getElementById('nameInput');

    nameInput.addEventListener("keyup", function (e) {
        webSocket.send(JSON.stringify({
            "type": "updateName",
            "name": nameInput.value,
            "serverCode": currentServerCode,
        }));
    });
}

function sendMessage() {
    var messageInput = document.getElementById('messageInput');
    var nameInput = document.getElementById('nameInput');

    var message = messageInput.value;
    // strip the whitespace of the message, if any. If the message is empty, do nothing.
    message = message.trim();
    if (message.length === 0) {
        return;
    }

    // strip the whitespace of the name, if any. If the name is empty, add the shake tag to the name for 1 second.
    var name = nameInput.value;
    name = name.trim();
    if (name.length === 0) {
        nameInput.classList.add("shake");
        setTimeout(function() {
            nameInput.classList.remove("shake");
        }, 1000);
        return;
    }

    messageInput.value = "";
    webSocket.send(JSON.stringify({
        "type": "message",
        "channel": selectedChannel,
        "message": message,
        "serverCode": currentServerCode,
        "name": name,
    }));
}

function updateMessages() {
    var messages = document.getElementById('messages');
    messages.innerHTML = '';
    for (var i = 0; i < channels[selectedChannel].messages.length; i++) {
        var message = channels[selectedChannel].messages[i];
        messages.innerHTML += `
        <div class="message-container">
            ${message.name === false ? `` : `<div tabindex="2" class="message-user" onclick="changePermissions(${message.userID})">${message.name}</div>`}
            <div class="message-text">${message.message}</div>
        </div>`;
    }
    messages.scrollTop = messages.scrollHeight;
}

var editingPermissionsId = 0;
function changePermissions(id) {
    if(isOwner) {
        var permissions = document.getElementById("permissionsContainer");
        var addAccessCheckbox = document.getElementById("addAccess");
        addAccessCheckbox.checked = members[id].permissions.addPermissions;

        editingPermissionsId = id;

        permissions.style.display = "flex";
    }
}
function confirmPermissions(addAccess) {
    var permissions = document.getElementById("permissionsContainer");
    permissions.style.display = "none";

    webSocket.send(JSON.stringify({
        type: "updatePermissions",
        id: editingPermissionsId,
        serverCode: currentServerCode,
        permission: addAccess,
    }));
}

function updateMessageInput(element) {
    element.style.height = "auto";
    var maxInputHeight = "20rem";
    //Convert maxInputHeight to px
    var maxInputHeightPx = convertCssUnit(maxInputHeight, element);

    if(element.scrollHeight < maxInputHeightPx) {
        element.style.height = element.scrollHeight + "px";
        document.querySelector(":root").style.setProperty("--message-height", element.scrollHeight + "px");
        element.style["overflow-y"] = "hidden";
    } else {
        element.style.height = maxInputHeight;
        document.querySelector(":root").style.setProperty("--message-height", maxInputHeight);
        element.style["overflow-y"] = "scroll";
    }
}

function joinServer() {
    var serverCodeInput = document.getElementById('serverCodeInput');
    var serverCode = serverCodeInput.value;

    serverCode = serverCode.trim();
    if (serverCode.length === 0) {
        serverCodeInput.classList.add("shake");
        setTimeout(function() {
            serverCodeInput.classList.remove("shake");
        }, 1000);
        return;
    }

    webSocket.send(JSON.stringify({
        "type": "join",
        "serverCode": serverCode,
    }));
}

function joinGlobal() {
    webSocket.send(JSON.stringify({
        "type": "join",
        "serverCode": "public",
    }));
}

function createServer() {
    webSocket.send(JSON.stringify({
        "type": "createServer",
    }));
}

/**
 * Convert absolute CSS numerical values to pixels.
 *
 * @link https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units#numbers_lengths_and_percentages
 *
 * @param {string} cssValue
 * @param {null|HTMLElement} target Used for relative units.
 * @return {*}
 */
window.convertCssUnit = function( cssValue, target ) {

    target = target || document.body;

    const supportedUnits = {

        // Absolute sizes
        'px': value => value,
        'cm': value => value * 38,
        'mm': value => value * 3.8,
        'q': value => value * 0.95,
        'in': value => value * 96,
        'pc': value => value * 16,
        'pt': value => value * 1.333333,

        // Relative sizes
        'rem': value => value * parseFloat( getComputedStyle( document.documentElement ).fontSize ),
        'em': value => value * parseFloat( getComputedStyle( target ).fontSize ),
        'vw': value => value / 100 * window.innerWidth,
        'vh': value => value / 100 * window.innerHeight,

        // Times
        'ms': value => value,
        's': value => value * 1000,

        // Angles
        'deg': value => value,
        'rad': value => value * ( 180 / Math.PI ),
        'grad': value => value * ( 180 / 200 ),
        'turn': value => value * 360

    };

    // Match positive and negative numbers including decimals with following unit
    const pattern = new RegExp( `^([\-\+]?(?:\\d+(?:\\.\\d+)?))(${ Object.keys( supportedUnits ).join( '|' ) })$`, 'i' );

    // If is a match, return example: [ "-2.75rem", "-2.75", "rem" ]
    const matches = String.prototype.toString.apply( cssValue ).trim().match( pattern );

    if ( matches ) {
        const value = Number( matches[ 1 ] );
        const unit = matches[ 2 ].toLocaleLowerCase();

        // Sanity check, make sure unit conversion function exists
        if ( unit in supportedUnits ) {
            return supportedUnits[ unit ]( value );
        }
    }

    return cssValue;

};