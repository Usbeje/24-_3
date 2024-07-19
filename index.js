const { modul } = require('./module');
const moment = require('moment-timezone');
const { baileys, boom, chalk, fs, figlet, FileType, path, pino, process, PhoneNumber } = modul;
const { Boom } = boom;
const { 
    default: XeonBotIncConnect, 
    useSingleFileAuthState, 
    fetchLatestBaileysVersion, 
    generateForwardMessageContent, 
    prepareWAMessageMedia, 
    generateWAMessageFromContent, 
    generateMessageID, 
    downloadContentFromMessage, 
    jidDecode, 
    proto 
} = require("@adiwajshing/baileys");
const {
    default: makeWASocket,
    BufferJSON,
    initInMemoryKeyStore,
    DisconnectReason,
    AnyMessageContent,
    makeInMemoryStore,
    useMultiFileAuthState,
    delay
} = require("@adiwajshing/baileys");
const { color, bgcolor } = require('./lib/color');
const colors = require('colors');
const readline = require("readline");
const { uncache, nocache } = require('./lib/loader');
const { start } = require('./lib/spinner');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep, reSize } = require('./lib/myfunc');

const owner = JSON.parse(fs.readFileSync('./database/owner.json'));
const mongoDB = require('./lib/mongoDB');

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rl.question(text, resolve));
};

const usePairingCode = true;

require('./case.js');
nocache('../case.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'));
require('./index.js');
nocache('../index.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'));

function title() {
    console.clear();
    console.log(chalk.yellow(`\n\n               ${chalk.bold.yellow(`[ ${botname} ]`)}\n\n`));
    console.log(color(`< ================================================== >`, 'cyan'));
    console.log(color(`\n${themeemoji} YT CHANNEL: ???`, 'magenta'));
    console.log(color(`${themeemoji} GITHUB: Usbeje`, 'magenta'));
    console.log(color(`${themeemoji} WA NUMBER: ${owner}`, 'magenta'));
    console.log(color(`${themeemoji} CREDIT: ${wm}\n`, 'magenta'));
}

async function XeonBotIncBot() {
    const { state, saveCreds } = await useMultiFileAuthState('kyuu');
    const XeonBotInc = XeonBotIncConnect({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ['Chrome (Linux)', '', '']
    });

    if (usePairingCode && !XeonBotInc.authState.creds.registered) {
        const phoneNumber = await question('Masukan Nomer Yang Aktif Awali Dengan 62:\n');
        const code = await XeonBotInc.requestPairingCode(phoneNumber.trim());
        console.log(`Pairing code: ${code}`);
    }

    console.log(color(figlet.textSync(`KyuuXPLOID`, {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        whitespaceBreak: false
    }), 'aqua'));

    XeonBotInc.ws.on('CB:Blocklist', json => {
        if (blocked.length > 2) return;
        for (let i of json[1].blocklist) {
            blocked.push(i.replace('c.us', 's.whatsapp.net'));
        }
    });

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            let kay = chatUpdate.messages[0];
            if (!kay.message) return;
            kay.message = (Object.keys(kay.message)[0] === 'ephemeralMessage') ? kay.message.ephemeralMessage.message : kay.message;
            if (kay.key && kay.key.remoteJid === 'status@broadcast') return;
            if (!XeonBotInc.public && !kay.key.fromMe && chatUpdate.type === 'notify') return;
            if (kay.key.id.startsWith('BAE5') && kay.key.id.length === 16) return;

            let m = smsg(XeonBotInc, kay, store);
            require('./case')(XeonBotInc, m, chatUpdate, store);
        } catch (err) {
            console.log(err);
        }
    });

    XeonBotInc.ev.on("groups.update", async (json) => {
        try {
            const res = json[0];
            let ppgroup;
            try {
                ppgroup = await XeonBotInc.profilePictureUrl(res.id, 'image');
            } catch (err) {
                ppgroup = 'https://i.ibb.co/RBx5SQC/avatar-group-large-v2.png?q=60';
            }
            console.log(json);

            let text;
            if (res.announce) {
                text = `Group has been closed by admin, now only admins can send messages!`;
            } else if (res.restrict) {
                text = `Group info has been restricted, now only admin can edit group info!`;
            } else if (res.desc) {
                text = `Group description has been changed to\n\n${res.desc}`;
            } else {
                text = `Group name has been changed to\n\n*${res.subject}*`;
            }

            await sleep(2000);
            XeonBotInc.sendMessage(res.id, { text });
        } catch (err) {
            console.log(err);
        }
    });

    global.DATABASE = global.db;
    global.loadDatabase = async function loadDatabase() {
        if (global.db.READ) return new Promise((resolve) => setInterval(function () {
            if (!global.db.READ) {
                clearInterval(this);
                resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
            }
        }, 1 * 1000));
        if (global.db.data !== null) return;

        global.db.READ = true;
        await global.db.read();
        global.db.READ = false;
        global.db.data = {
            users: {},
            chats: {},
            game: {},
            database: {},
            settings: {},
            setting: {},
            others: {},
            sticker: {},
            ...(global.db.data || {})
        };
        global.db.chain = _.chain(global.db.data);
    };
    loadDatabase();

    XeonBotInc.ev.on('group-participants.update', async (anu) => {
        console.log(anu);
        try {
            let metadata = await XeonBotInc.groupMetadata(anu.id);
            let participants = anu.participants;
            for (let num of participants) {
                try {
                    ppuser = await XeonBotInc.profilePictureUrl(num, 'image');
                } catch (err) {
                    ppuser = 'https://static1.cbrimages.com/wordpress/wp-content/uploads/2018/12/Webp.net-resizeimage-3-1.jpg?q=50&fit=crop&w=767&h=431&dpr=1.5';
                }

                const ppgroup = 'https://i.ibb.co/RBx5SQC/avatar-group-large-v2.png?q=60';
                const memb = metadata.participants.length;
                const XeonWlcm = await getBuffer(ppuser);
                const XeonLft = await getBuffer(ppuser);
                const xeonName = num.split("@")[0];
                const text = `@${xeonName} joined to group ${metadata.subject}`;
                const contextInfo = {
                    mentionedJid: [num],
                    externalAdReply: {
                        showAdAttribution: true,
                        containsAutoReply: true,
                        title: global.botname,
                        body: ownername,
                        previewType: "PHOTO",
                        thumbnailUrl: ``,
                        thumbnail: XeonWlcm,
                        sourceUrl: wagc
                    }
                };

                if (anu.action === 'add') {
                    XeonBotInc.sendMessage(anu.id, { text, contextInfo });
                } else if (anu.action === 'remove') {
                    const text = `@${xeonName} left the group ${metadata.subject}`;
                    XeonBotInc.sendMessage(anu.id, { text, contextInfo });
                } else if (anu.action === 'promote') {
                    const text = `Congrats @${xeonName}, you have been promoted to admin!`;
                    XeonBotInc.sendMessage(anu.id, { text, contextInfo });
                } else if (anu.action === 'demote') {
                    const text = `Oops! @${xeonName}, you have been demoted from admin!`;
                    XeonBotInc.sendMessage(anu.id, { text, contextInfo });
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    XeonBotInc.send
