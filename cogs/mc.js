
const os = require("os");
const pty = require("node-pty");

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
	if (!screen)
		return false
    screenProcess.stdin.write(input);
	return true;
}
function screenRead(data) {
	console.log(`data: "${data}"`);
}
screenStart();

module.exports.desc = "Interact with a minecraft server through GNU screen";

module.exports.conf = {
	"mc": {
		"screenname": { desc: "The screen name that should be connected to" },
		"channelid": { desc: "The channel ID to sync with minecraft" }
	}
};

module.exports.cmds = {
	"restart": {
		desc: "Restart the server",
		func: async function (args) {
			process.exit(0);
		}
	},
	"uptime": {
		desc: "Get uptime of the server",
		func: async function(args) {
			let t = process.uptime();
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
		}
	},
	"say": {
		desc: "Say a message in minecraft",
		args: [
			[dc.BIGTEXT, "message", "Message to send", true, undefined, 100]
		],
		func: async function (args) {
			
		}
	}
};