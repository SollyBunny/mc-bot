
const os = require("os");
const pty = require("node-pty");
const { spawn, exec } = require("child_process");

const UUIDs = {};
const avatars = {};
async function getUUID(name) {
	if (UUIDs[name])
		return UUIDs[name];
	const data = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`);
	const json = await data.json();
	return UUIDs[name] = json.id;
}
async function getAvatar(name) {
	return `https://crafatar.com/avatars/${await getUUID(name)}?overlay=true`;
}

let screen;
function screenStart() {
	screen = pty.spawn("screen", ["-x", "-r", conf.mc.screenname], {
		name: "xterm",
		cols: 80,
		rows: 30,
		cwd: process.env.HOME,
		env: process.env
	});
	screen.onData(data => {
		screenRead(data.toString());
  	});
	screen.onExit(code => {
		screen = undefined;
		log.warn("Screen closed, reopening in 1s")
    	setTimeout(screenStart, 1000);
	});
	return true;
}
function screenWrite(input) {
	if (!screen) return false;
    screen.write("\n" + input + "\n");
	return true;
}
function screenSay(user, msg) {
	if (!screen) return false;
	msg = [
		{"text": "<"},
		{"text": user, "color": "blue"},
		{"text": `> ${msg}`}
	];
	screenWrite(`/tellraw @a ${JSON.stringify(msg)}`);
}
const batchMsg = undefined;
async function screenBatchMsgCallback(forceBatchMsg) {
	let msg;
	if (forceBatchMsg) {
		msg = forceBatchMsg;
	} else if (batchMsg) {
		msg = batchMsg;
		batchMsg = undefined;
	} else {
		return;
	}
	cancelTimeout(msg.timeout);
	client._webhookreply.bind({
		channel: await client.channels.fetch(conf.mc.channelid),
	})({
		nickname: msg.name,
		rawAvatarURL: await getAvatar(msg.name)
	}, msg.msg);
}
async function screenRead(data) {
	if (data.length > 256) return; // Ignore any init data
	let match;
	match = data.match(/MinecraftServer\]\: \<(.+?)\> (.+)\n*/);
	if (match) {
		const name = match[1];
		const msg = match[2];
		if (batchMsg) { // There is currently a waiting msg
			batchMsg.timeout = cancelTimeout(batchMsg.timeout);
			if (batchMsg.name === name) { // Add to it
				batchMsg.msg += "\n" + msg;
			} else { // Flush batch
				screenBatchMsgCallback(batchMsg);
				batchMsg = undefined;
			}
		} else {
			batchMsg = { name, msg };
		}
		batchmsg.timeout = setTimeout(screenBatchMsgCallback, 1000);
		return;
	}
	match = data.match(/MinecraftServer\]\: (.+?) joined the/);
	if (match) {
		const name = match[1];
		(await client.channels.fetch(conf.mc.channelid)).send(`${name} joined the game`);
		return;
	}
	match = data.match(/MinecraftServer\]\: (.+?) left the/);
	if (match) {
		const name = match[1];
		(await client.channels.fetch(conf.mc.channelid)).send(`${name} left the game`);
		return;
	}
	match = data.match(/\/MinecraftServer\]\: (There (are|is) \d+ (of a max of \d+ )*players online: .+)/);
	if (match) {
		const msg = match[1];
		(await client.channels.fetch(conf.mc.channelid)).send(msg);
		return;
	}
	if (data.indexOf("DedicatedServer]: Starting minecraft server") !== -1) {
		(await client.channels.fetch(conf.mc.channelid)).send("Server starting");
		return;
	}
	if (data.indexOf("DedicatedServer]: Done") !== -1)  {
		(await client.channels.fetch(conf.mc.channelid)).send("Server ready");
		return;
	}
	if (data.indexOf("MinecraftServer]: Stopping server") !== -1) {
		(await client.channels.fetch(conf.mc.channelid)).send("Stopped server");
		return;
	}

}
screenStart();

module.exports.desc = "Interact with a minecraft server through GNU screen";

module.exports.conf = {
	"mc": {
		"screenname": { desc: "The screen name that should be connected to" },
		"channelid": { desc: "The channel ID to sync with minecraft" }
	}
};

let restartVotes = [];
module.exports.cmds = {
	"restart": {
		desc: "Restart the server",
		func: async function (args) {
			if (!screen) this.errorreply("Server not on");
			if (!this.author.isAdmin) {
				if (restartVotes.indexOf(this.author.id) !== -1) {
					this.errorreply("You already voted for a restart");
					return;
				}
				restartVotes.push(this.author.id);
				if (restartVotes.length < 2) {
					this.embedreply({
						title: "Restart vote",
						msg: `${restartVotes.length} / 2 votes`,
						color: conf.system.color
					});
					return;
				}
			}
			screenWrite("stop");
		}
	},
	"uptime": {
		desc: "Get uptime of the server",
		func: async function (args) {
			exec("screen -ls", (error, stdout, stderr) => {
				if (error) { this.errorreply(`Failed to get uptime: ${error}`); return; }
				if (stderr) { this.errorreply(`Failed to get uptime: ${stderr}`); return; }
				const match = stdout.match(new RegExp(`(\\d+)\\.${conf.mc.screenname}(?!.*Dead)`));
				if (!match) { this.errorreply(`Failed to get uptime: cannot find screen ${conf.mc.screenname}`); return; }
				const pid = match[1];
				exec(`ps -o etimes= -p ${pid}`, (error, stdout, stderr) => {
					if (error) { this.errorreply(`Failed to get uptime: ${error}`); return; }
					if (stderr) { this.errorreply(`Failed to get uptime: ${stderr}`); return; }
					let t = parseInt(stdout);
					if (t >= 604800) // weeks / days
						t = `${Math.floor(t / 604800)} weeks, ${Math.floor((t % 604800) / 86400)} days`;
					else if (t >= 86400) // days / hours
						t = `${Math.floor(t / 86400)} days, ${Math.floor((t % 86400) / 3600)} hours`;
					else if (t >= 3600) // hours / minutes
						t = `${Math.floor(t / 3600)} hours, ${Math.floor((t % 3600) / 60)} minutes`;
					else if (t >= 60) // minutes / seconds
						t = `${Math.floor(t / 60)} minutes, ${Math.floor(t % 60)} seconds`;
					else // seconds
						t = `${Math.floor(t)} seconds`;
					this.embedreply({
						title: "Uptime",
						msg: t,
						color: conf.system.color
					});
				});
			});
		}
	},
	"say": {
		desc: "Say a message in minecraft",
		args: [
			[dc.BIGTEXT, "message", "Message to send", true, undefined, 100]
		],
		func: async function (args) {
			screenSay(args.author.tag, args[0]);
		}
	},
	"list": {
		desc: "List players in server",
		func: async function() {
			screenWrite("list");
		}
	},
	"cmd": {
		desc: "Run a command in the server console",
		admin: true,
		args: [
			[dc.BIGTEXT, "message", "Message to send", true, undefined, 100]
		],
		func: async function (args) {
			screenWrite(args[0]);
		}
	},
};

module.exports.hooks = [
	{
		event: "messageCreate",
		priority: 10,
		func: async function() {
			if (this.author.isNotPerson) return;
			if (this.channel.id !== conf.mc.channelid) return;
			if (this.content.length > 100) {
				this.reply("Message too long");
				return;
			};
			screenSay(this.author.tag, this.content);
		}
	}
]