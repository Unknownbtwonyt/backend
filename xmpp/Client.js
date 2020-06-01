const uuid = require("uuid").v4
const EventEmitter = require("events").EventEmitter
const xmlparser = require('xml-parser')
const xmlbuilder = require("xmlbuilder")

const Friends = require(`${__dirname}/../model/Friends`)

module.exports = class Client extends EventEmitter {
    constructor(ws) {
        super()
        this.bIsAuthenticated = false;
        this.bIsConnectedToParty = false
        this.uuid = uuid()
        this.ws = ws

        this.ws.on("message", (message) => {
            if (xmlparser(message).root != undefined) {
                this[`handle${xmlparser(message).root.name.replace(/:/g, '')}`]  (xmlparser(message))
            }
        })

    }

    handleopen() {
        this.ws.send(xmlbuilder.create({
            'open': {
                '@xmlns': 'urn:ietf:params:xml:ns:xmpp-framing', 
                '@from': 'prod.ol.epicgames.com',
                '@id': this.uuid
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
        this.sendFeatures()

    }

    sendFeatures() {
        if (this.bIsAuthenticated) {
            this.ws.send(xmlbuilder.create({
                'stream:features': {
                    '@xmlns:stream': 'http://etherx.jabber.org/streams', 
                    ver: {'@xmlns': 'urn:xmpp:features:rosterver'},
                    starttls: {'@xmlns': 'urn:ietf:params:xml:ns:xmpp-tls'},
                    bind: {'@xmlns': 'urn:ietf:params:xml:ns:xmpp-bind'},
                    compression: {
                        '@xmlns': 'http://jabber.org/features/compress',
                        method: {
                            '#text': "zlib"
                        }
                    },
                    session: {'@xmlns': 'urn:ietf:params:xml:ns:xmpp-session'}
                }
            }).end().replace(`<?xml version="1.0"?>`, "").trim())
        } else {
            this.ws.send(xmlbuilder.create({
                'stream:features': {
                    '@xmlns:stream': 'http://etherx.jabber.org/streams', 
                    mechanisms: {
                        '@xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
                        mechanism: {
                            "#text": "PLAIN"
                        }
                    },
                    ver: {'@xmlns': 'urn:xmpp:features:rosterver'},
                    starttls: {'@xmlns': 'urn:ietf:params:xml:ns:xmpp-tls'},
                    compression: {
                        '@xmlns': 'http://jabber.org/features/compress',
                        method: {
                            '#text': "zlib"
                        }
                    },
                    auth: {'@xmlns': 'http://jabber.org/features/iq-auth'}
                }
            }).end().replace(`<?xml version="1.0"?>`, "").trim())
        }
    }

    handleauth(message) {
        var parsed = Buffer.from(message.root.content, "base64").toString().split("\u0000").splice(1)

        //var token = accessTokens.find(x => x.id == parsed[0])
        var token = true
        if (token) {
            if (true) {
            //if (token.token == parsed[1]) {
                this.id = parsed[0]
                this.bIsAuthenticated = true
                xmppClients[this.id] = {
                    id: this.id,
                    token: parsed[1],
                    client: this
                }

                this.ws.send(xmlbuilder.create({
                    'success': {
                        '@xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl'
                    }
                }).end().replace(`<?xml version="1.0"?>`, "").trim())
            } else this.ws.send(xmlbuilder.create({
                //<not-authorized/><text xml:lang='en'>Password not verified</text>
                'failure': {
                    '@xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
                    'not-authorized': {
                        'text': {
                            "@xml:lang": "eng",
                            "#text": "Password not verified"
                        }
                   }
                }
            }).end().replace(`<?xml version="1.0"?>`, "").trim())
        } else this.ws.send(xmlbuilder.create({
            //<not-authorized/><text xml:lang='en'>Password not verified</text>
            'failure': {
                '@xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
                'not-authorized': {
                    'text': {
                        "@xml:lang": "eng",
                        "#text": "Password not verified"
                    }
               }
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
    }


    handleiq(message) {
        switch (message.root.attributes.id) {
            case "_xmpp_bind1":
                this.jid = message.root.attributes.to ? message.root.attributes.to : `${this.id}@prod.ol.epicgames.com/${message.root.children.find(x => x.name == "bind").children[0].content}`

                this.ws.send(xmlbuilder.create({
                    'iq': {
                        '@xmlns': 'jabber:client',
                        '@to': this.jid,
                        '@type': "result",
                        '@id': "_xmpp_bind1",
                        'bind': {
                            '@xmlns': 'urn:ietf:params:xml:ns:xmpp-bind',
                            'jid': {
                                "#text": this.jid
                            }
                        }
                    }
                }).end().replace(`<?xml version="1.0"?>`, "").trim())
                break;
            case "_xmpp_session1":
                this.ws.send(xmlbuilder.create({
                    'iq': {
                        '@xmlns': 'jabber:client',
                        '@to': this.jid,
                        '@type': "result",
                        '@id': "_xmpp_session1"
                    }
                }).end().replace(`<?xml version="1.0"?>`, "").trim())
                break;
            default:
                this.ws.send(xmlbuilder.create({
                    'iq': {
                        '@xmlns': 'jabber:client',
                        '@to': this.jid,
                        '@type': "result",
                        '@id': uuid().replace(/-/g, '').toUpperCase()
                    }
                }).end().replace(`<?xml version="1.0"?>`, "").trim())
                break;
        }

    }

    async handlepresence(message) {
        try {
            var thing = JSON.parse(message.root.children.find(x => x.name == "status").content)
            this.sendPresence(this.jid, this.jid.split("/")[0], JSON.stringify(thing))

            this.latest = JSON.stringify(thing)
            this.sendPresenceToFriends()
            this.sender = setInterval(() => {
                this.sendPresenceToFriends()
            }, 30000)
        } catch (e) {

        }
    }

    async sendPresenceToFriends() {
        var friends = await Friends.findOne({id: this.id})

        friends.accepted.forEach(friend => {
            if (xmppClients[friend.id]) {
                xmppClients[friend.id].client.sendPresence(`${friend.id}@prod.ol.epicgames.com`, this.jid, this.latest)
            }
        })
    }


    handlemessage(message) {
        switch(message.root.attributes.type) {
            case "chat":
                xmppClients[message.root.attributes.to.split("@")[0]].client.sendChat(this.jid, message.root.children[0].content)
                break;
            case "groupchat":
                //todo
                break;
        }
    }

    handleclose() {
        this.ws.send(xmlbuilder.create({
            'presence': {
                '@xmlns': 'jabber:client',
                '@to': to,
                '@from': from,
                '@type': "unavailable",
                'status': {
                    "#text": data
                }
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
        //this.latest = <presence xmlns="jabber:client" type="unavailable" from="10271576defb4c5f98a8956781d1db44@prod.ol.epicgames.com/V2:Fortnite:PSN::1D77E107147C45FBA539EA5ECEEE05E6" id="adf3e480-8ce0-4051-b850-5725612b21eb" to="a44546da44fb460784d1c793fa95c3c2@prod.ol.epicgames.com/V2:Fortnite:PSN::41772E6C83B240239A3CBBD2F6A62676"><status>{"bHasVoiceSupport":false,"bIsJoinable":false,"bIsPlaying":false,"Properties":{"bInPrivate":true},"SessionId":"","Status":"Playing Battle Royale - 1 / 16"}
        
        this.sendPresenceToFriends()
        clearInterval(this.sender)
        delete xmppClients[this.id]
    }

    sendMessage(from, data) {
        this.ws.send(xmlbuilder.create({
            'message': {
                '@xmlns': 'jabber:client',
                '@to': this.jid,
                '@from': from,
                '@id': uuid().replace(/-/g, '').toUpperCase(),
                'body': {
                    "#text": data
                }
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
    }

    sendChat(from, data) {
        this.ws.send(xmlbuilder.create({
            'message': {
                '@xmlns': 'jabber:client',
                '@type': "chat",
                '@to': this.jid,
                '@from': from,
                '@id': uuid().replace(/-/g, '').toUpperCase(),
                'body': {
                    "#text": data
                }
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
    }

    sendPresence(to, from, data) {
        this.ws.send(xmlbuilder.create({
            'presence': {
                '@xmlns': 'jabber:client',
                '@to': to,
                '@from': from,
                'status': {
                    "#text": data
                }
            }
        }).end().replace(`<?xml version="1.0"?>`, "").trim())
    }
}