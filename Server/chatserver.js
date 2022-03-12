// start websocket server on port 5050
var websocketserver = require('ws').Server;

var wss = new websocketserver({ port: 5050 });

var servers = {
    "public": {
        channels: [
            { name: 'general' },
            { name: 'memes' },
            { name: 'coding' },
        ],
        clients: []
    }
};

wss.on('connection', function connection(ws) {
    console.log('client connected');
    ws.on('message', function incoming(message) {
        var messageData = JSON.parse(message);
        if (messageData.type === 'message') {
            var parsedMessage = parseMessage(messageData.message);
            var server = servers[messageData.serverCode];
            for(var i = 0; i < server.clients.length; i++) {
                if(server.clients[i].ws === ws) {
                    var id = server.clients[i].id;
                    break;
                }
            }
            for(serverClient in server.clients) {
                var serverClient = server.clients[serverClient];
                serverClient.ws.send(JSON.stringify({
                    type: 'message',
                    channel: messageData.channel,
                    message: parsedMessage,
                    id: id,
                    name: messageData.name,
                }));
            }
        } else if (messageData.type === 'join') {
            var server = servers[messageData.serverCode];
            if (!server) {
                ws.send(JSON.stringify({
                    type: 'unknownServer',
                }));
                return;
            } else {
                server.clients.push({
                    ws: ws,
                    owner: false,
                    addPermissions: false,
                    id: server.clients.length,
                    name: 'unnamed',
                });

                ws.send(JSON.stringify({
                    type: 'serverData',
                    channels: server.channels,
                    members: createMembers(server.clients),
                    serverCode: messageData.serverCode,
                    owner: false,
                }));

                updateMemberList(server, [{
                    type: 'memberJoined',
                    name: 'unnamed',
                }]);
            }
        } else if (messageData.type === 'updateName') {
            var server = servers[messageData.serverCode];
            for(var i = 0; i < server.clients.length; i++) {
                if(server.clients[i].ws === ws) {
                    server.clients[i].name = messageData.name;
                    break;
                }
            }

            updateMemberList(server);
        } else if(messageData.type === 'updatePermissions') {
            var server = servers[messageData.serverCode];
            for(var i = 0; i < server.clients.length; i++) {
                if(server.clients[i].ws === ws) {
                    var client = server.clients[i];

                    if(client.owner) {
                        server.clients[messageData.id].addPermissions = messageData.permission;

                        updateMemberList(server);

                        server.clients[messageData.id].ws.send(JSON.stringify({
                            type: 'updatePermissions',
                            createPermissions: messageData.permission,
                            name: client.name,
                        }));
                    }
                }
            }
        } else if (messageData.type === 'createChannel') {
            var server = servers[messageData.serverCode];
            server.channels.push({
                name: messageData.channelName,
            });

            var server = servers[messageData.serverCode];
            for(var i = 0; i < server.clients.length; i++) {
                server.clients[i].ws.send(JSON.stringify({
                    type: 'channelCreated',
                    channelName: messageData.channelName,
                }));
            }
        } else if (messageData.type === 'createServer') {
            //Randomly generate a 8-digit server code including numbers and letters
            var serverCode = '';
            for (var i = 0; i < 8; i++) {
                var char = Math.floor(Math.random() * 36).toString(36);
                if (i === 0 && char === '0') {
                    char = '1';
                }
                serverCode += char;
            }

            servers[serverCode] = {
                channels: [
                    { name: 'general' },
                ],
                clients: [{ws: ws, owner: true, name: 'unnamed', id: 0, addPermissions: false}]
            };

            var server = servers[serverCode];
            
            ws.send(JSON.stringify({
                type: 'serverData',
                channels: server.channels,
                members: createMembers(server.clients),
                serverCode: serverCode,
                owner: true,
            }));
        } else if(messageData.type === 'leaveServer') {   
            removeClient(ws);
        }
    });
    ws.on('close', function close() {
        console.log('client disconnected');
        removeClient(ws);
    });
});

function createMembers(clients) {
    var members = [];
    for(var i = 0; i < clients.length; i++) {
        members.push({name: clients[i].name, permissions: {isOwner: clients[i].owner, addPermissions: clients[i].addPermissions}, id: clients[i].id});
    }
    return members;
};

function removeClient(ws) {
    //Find a server with a client.ws of this
    for(var server in servers) {
        var serverData = servers[server];
        for(var i = 0; i < serverData.clients.length; i++) {
            if(serverData.clients[i].ws === ws) {
                if(serverData.clients[i].owner && serverData.clients.length > 1) {
                    for(var j = 0; j < serverData.clients.length; j++) {
                        if(j !== i) {
                            serverData.clients[j].ws.send(JSON.stringify({
                                type: 'ownerLeft',
                            }));
                            serverData.clients[j].owner = true;
                            break;
                        }
                    }
                }

                var oldName = serverData.clients[i].name;

                serverData.clients.splice(i, 1);

                setClientIds(serverData);

                updateMemberList(serverData, [{
                    type: 'memberLeft',
                    name: oldName,
                }]);

                if(serverData.clients.length === 0 && server !== 'public') {
                    delete servers[server];
                }
                return;
            }
        }
    }
}
//Properly set the ID of each client
function setClientIds(server) {
    for(var i = 0; i < server.clients.length; i++) {
        server.clients[i].id = i;
    }
}

function updateMemberList(server, additionalRequests = false) {
    var memberList = createMembers(server.clients);
    for(var i = 0; i < server.clients.length; i++) {
        server.clients[i].ws.send(JSON.stringify({
            type: 'updateMembers',
            members: memberList,
        }));
        if(additionalRequests !== false) {
            for(var j = 0; j < additionalRequests.length; j++) {
                server.clients[i].ws.send(JSON.stringify(additionalRequests[j]));
            }
        }
    }
}

function parseMessage(message) {
    return message.replace('>', '&gt;').replace('<', '&lt;');
}