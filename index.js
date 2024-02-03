#!/usr/bin/env node

if (__dirname !== process.cwd()) process.chdir(__dirname); // change to current working dir

global.http = require("https");
global.fs   = require("fs");

{ // Discord.js
	global.dc   = require("discord.js");
	dc.TEXT    = 0;
	dc.BIGTEXT = 1;
	dc.INT     = 2;
	dc.NUM     = 3;
	dc.USER    = 4;
	dc.ROLE    = 5;
	dc.BOOL    = 6;
	dc.CHOICE  = 7;
	dc.CHANNEL = 8;
	dc.SERVER  = 9;
	dc.typename = ["Text", "Text+", "Integer", "Number", "User", "Role", "Boolean", "Choice", "Channel", "Server"];
}
{ // Log
	global.log = (m) => {
		log.raw(36, m);
	};
	log.raw = (c, m) => {
		console.log(`\x1b[${c}m[${log.time()}]\x1b[0m ${m}`);
	};
	log.warn = (m) => {
		log.raw(33, m);
	};
	log.error = (m) => {
		log.raw(31, m);
	};
	log.fake = (...m) => {
		let out = "";
		const old = process.stdout.write;
		process.stdout.write = a => {
			out += a;
		};
		console.log(...m);
		process.stdout.write = old;
		return out;
	};
	log.time = () => {
		const d = new Date();
		return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDay() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}.${String(d.getSeconds()).padStart(2, "0")}`;
	};
}
{ // Util

	global.util = {};

	// Get the levenhtein distance between two strings
	util.levdis = (a, b) => {
		// https://en.wikipedia.org/wiki/Levenshtein_distance
		// ChatGPT is gonna kill us all
		const d = [];
		const n = a.length;
		const m = b.length;

		if (n == 0) return m;
		if (m == 0) return n;

		for (let i = 0; i <= n; ++i) {
			d[i] = [];
			d[i][0] = i;
		}
		for (let j = 0; j <= m; ++j)
			d[0][j] = j;

		for (let j = 1; j <= m; ++j) {
			for (let i = 1; i <= n; ++i) {
				if (a[i - 1] === b[j - 1])
					d[i][j] = d[i - 1][j - 1];
				else
					d[i][j] = Math.min(
						d[i - 1][j],
						d[i][j - 1],
						d[i - 1][j - 1]
					) + 1;
			}
		}
		return d[n][m];
	};

	// Get the closest value to a target by levdis, cutoff t
	util.levdisclosest = (l, v, t) => {
		let min_s = undefined;
		let min_d = Number.MAX_SAFE_INTEGER;
		let d;
		for (let i = 0; i < l.length; ++i) {
			d = util.levdis(l[i], v);
			if (d < 2) {
				min_s = l[i];
				break;
			}
			if (d > t) continue;
			if (d < min_d) {
				min_s = l[i];
				min_d = d;
			}
		}
		return min_s;
	};

	// Get the closest value to a target by levdis, cutoff t, l being a list of users
	util.levdisuserclosest = (l, v, t) => {
		v = v.toLowerCase();
		let min_s = undefined;
		let min_d = Infinity;
		let d, m;
		for (let i = 0; i < l.size || l.length; ++i) {
			m = l.at(i);
			if (m.nickname === null) {
				d = util.levdis(m.user.username.toLowerCase(), v);
			} else if (m.nickname) {
				d = Math.min(
					util.levdis(m.nickname.toLowerCase(), v),
					util.levdis(m.user.username.toLowerCase(), v)
				);
			} else {
				d = util.levdis(m.username.toLowerCase(), v);
			}
			if (d < t) {
				min_s = m;
				break;
			}
			if (d < min_d) {
				min_s = m;
				min_d = d;
			}
		}
		return min_s;
	};

	// A fetch function using http (usefull when fetch refuses to work and when fetch isn't available)
	util.fetch = function(url) {
		return new Promise((resolve, reject) => {
			http.get(url, res => {
				if (res.statusCode !== 200) {
					res.resume();
					reject(res.statusCode);
					return;
				}
				let body = "";
				res.on("data", chunk => { body += chunk; });
				res.on("end", () => {
					resolve(body);
				});
			}).on("error", reject);
		});
	};
}
{ // Config
	function confload() {
		global.conf = JSON.parse(fs.readFileSync("./conf.json"));
		conf.main = conf.main || {};
		conf.main.prefix = conf.main.prefix || "!";
		conf.main.admins = conf.main.admins || [];
		conf.main.errcolor = conf.main.errcolor || [255, 0, 0]
		conf.reload = confload;
	}
	confload();
	if (!conf.main.token) {
		log.error("I need a token please!");
		process.exit(1);
	}
}
{ // Client

	global.client = new dc.Client({
		// Add all intents / partials, because if they're not available nothing happens, and you never know when you'll need em
		intents: [dc.IntentsBitField.Flags.AutoModerationConfiguration, dc.IntentsBitField.Flags.AutoModerationExecution, dc.IntentsBitField.Flags.DirectMessageReactions, dc.IntentsBitField.Flags.DirectMessageTyping, dc.IntentsBitField.Flags.DirectMessages, dc.IntentsBitField.Flags.GuildBans, dc.IntentsBitField.Flags.GuildEmojisAndStickers, dc.IntentsBitField.Flags.GuildIntegrations, dc.IntentsBitField.Flags.GuildInvites, dc.IntentsBitField.Flags.GuildMembers, dc.IntentsBitField.Flags.GuildMessageReactions, dc.IntentsBitField.Flags.GuildMessageTyping, dc.IntentsBitField.Flags.GuildMessages, dc.IntentsBitField.Flags.GuildPresences, dc.IntentsBitField.Flags.GuildScheduledEvents, dc.IntentsBitField.Flags.GuildVoiceStates, dc.IntentsBitField.Flags.GuildWebhooks, dc.IntentsBitField.Flags.Guilds, dc.IntentsBitField.Flags.MessageContent],
		partials: [dc.Partials.User, dc.Partials.Channel, dc.Partials.GuildMember, dc.Partials.Message, dc.Partials.Reaction, dc.Partials.GuildScheduledEvent, dc.Partials.ThreadMember]
	});

	{ // Embed Replying
		client._embedreply = async function({
			msg    = "",
			title  = undefined,
			color  = undefined,
			colorraw = undefined,
			fields = undefined,
			thumb  = undefined,
			image  = undefined,
			url    = undefined
		}) {
			let embed = {
				description: msg,
				title      : title,
				color      : colorraw || (color ? (color[0] << 16) + (color[1] << 8) + color[2] : 0),
				fields     : fields,
				thumbnail  : thumb ? { url: thumb } : undefined,
				image      : image ? { url: image } : undefined,
				url        : url
			};
			try {
				this.reply ({ embeds: [embed] });
			} catch (e) { // if msg is deleted
				try {
					this.channel.send({ embeds: [embed] });
				} catch (e) {
					this.send({ embeds: [embed] });	
				}
			}
		};
		client._errorreply = async function(msg) {
			await this.embedreply({
				msg: msg,
				title: "Error",
				color: conf.main.errcolor,
			});
		};
		client._webhookreply = async function(user, msg) {
			if (user.nickname === undefined) {
				this.channel.send(msg); // TODO find some way to alert the user of the inability of webhooks in DMs
				return;
			}
			let webhook = await this.channel.createWebhook({
				name: user.nickname || user.user.username,
				channel: this.channel,
				avatar: user.rawAvatarURL || user.avatarURL() || user.user.avatarURL()
			});
			await webhook.send({
				content: msg,
				username: user.nickname || user.user.username,
				allowedMentions: {
					"users" : [],
					"roles" : [],
					"channels" : []
				}
			});
			await webhook.delete();
		};
	}
	{ // Hooks
		client.hooks = {};
		client.hooks.ID = 0;
		client.hooks.add = hook => { // TODO error checking
			hook.ID = client.hooks.ID;
			client.hooks.ID += 1;
			hook.priority = hook.priority || 0;
			hook.func.priority = hook.priority;
			if (client.hooks[hook.event] === undefined) { // init event hook
				client.on(hook.event, client.hooks.run.bind(hook.event));
				client.hooks[hook.event] = [hook.func];
				return;
			}
			let i = 0;
			for (; i < client.hooks[hook.event].length; ++i)
				if (hook.priority > client.hooks[hook.event][i].priority) break;
			client.hooks[hook.event].splice(i, 0, hook.func);
			log(`Hook added ${hook.event} (${hook.priority})`);
		};
		client.hooks.sub = hook => {
			log(`Hook subbed ${hook.event} (${hook.priority})`);
			let i = 0;
			for (; i < client.hooks[hook.event].length; ++i) {
				if (client.hooks[hook.event].ID === hook.ID) break;
			}
			client.hooks[hook.event].splice(i, 1);
			// TODO unregister event hook on zero hooks left
		};
		client.hooks.run = async function(arg) { // must be a function for this to work
			for (let i = 0; i < client.hooks[this].length; ++i)
				if (await client.hooks[this][i].apply(arg)) return; // return if the hook returns true
		};
	}
	{ // Commands
		client.cmds = {};
		client.cmds.serialize = async function() {
			const commands = [];
			Object.keys(client.cmds).forEach(i => {
				if (i.admin || i.disabled) return;
				const command = {
					name: i,
					description: client.cmds[i].desc || "No desc available",
					options: [],
					name_localizations: undefined,
					description_localizations: undefined,
					default_permission: undefined,
					default_member_permissions: client.cmds[i].perm && String(client.cmds[i].perm),
					dm_permission: client.cmds[i].dm
				};
				if (client.cmds[i].args) {
					let required = false;
					client.cmds[i].args.forEach(i => {
						const arg = {
							autocomplete: undefined,
							type: undefined,
							name: i[1],
							description: i[2],
							description_localizations: undefined,
							name_localizations: undefined
						}
						if (required) {
							arg.required = false;
						} else {
							required = true;
							arg.required = i[3];
						}
						switch (i[0]) {
							case dc.USER:
								arg.type = 6;
								break;
							case dc.TEXT:
							case dc.BIGTEXT:
								arg.type = 3;
								if (i[4]) arg.min_length = String(i[4]);
								if (i[5]) arg.max_length = String(i[5]);
								break;
							case dc.CHOICE:
								arg.type = 3;
								arg.choices = i[4].map(choice => {
									return { name: choice, name_localizations: undefined, value: choice };
								});
								break;
							case dc.INT:
								arg.type = 4;
								if (i[4]) arg.min_value = String(i[4]);
								if (i[5]) arg.max_value = String(i[5]);
								break;
							case dc.NUM:
								arg.type = 10;
								arg.min_value = i[4] && String(i[4]);
								arg.max_value = i[5] && String(i[5]);
								break;
						}
						command.options.push(arg);
					});
				}
				commands.push(command);
			});
			return commands;
		};
		client.cmds.push = async function(commands) {
			await client.rest.put(
				dc.Routes.applicationCommands(client.user.id),
				{ body: await commands }
			);
		};
		client.cmds.serialize.disabled = true;
		client.cmds.push.disabled = true;
	}
	{ // Cogs
		client.cogs = {};
		client.cogs.load = name => {
			if (!name.endsWith(".js")) return undefined;
			if (client.cogs[name]) {
				log.warn(`Cog \`${name}\` already loaded`);
				return false;
			}
			const cog = require(`./cogs/${name}`); // TODO make this configurable
			if (cog.disabled) {
				log.warn(`Cog \`${name}\` disabled`);
				return undefined;
			}
			client.cogs[name] = cog;
			if (!conf[name]) conf[name] = {};
			if (cog.onload) cog.onload();
			if (cog.onloadready) {
				if (client.isReady())
					cog.onloadready();
				else
					client.once("ready", cog.onloadready);
			}
			if (cog.cmds)
				Object.keys(cog.cmds).forEach(i => {
					client.cmds[i] = cog.cmds[i];
				});
			if (cog.hooks) cog.hooks.forEach(client.hooks.add);
			log(`Cog ${name} loaded`);
			return true;
		};
		client.cogs.unload = name => {
			cog = client.cogs[name];
			if (!cog) {
				log.warn(`Cog ${name} not loaded`);
				return false;
			}
			if (typeof(a) === "function") return false; // Prevent functions in the client.cogs obj to be unloaded
			if (cog.onunload) cog.onunload();
			if (cog.cmds)
				Object.keys(cog.cmds).forEach(i => {
					delete client.cmds[i];
				});
			if (cog.hooks) cog.hooks.forEach(client.hooks.sub);
			delete client.cogs[name];
			delete require.cache[require.resolve(`./cogs/${name}`)];
			log(`Cog ${name} unloaded`);
			return true;
		};
	}

}

// Main

fs.readdirSync("./cogs/").forEach(client.cogs.load);
client.cmds._serialized = client.cmds.serialize();

client.hooks.add({event: "ready", func: async function() {
	if (conf.main.activity)
		client.user.setPresence({
			activities: [{ name: conf.main.activity }],
		});
	log(`Ready as ${client.user.tag}`);
	client.cmds.push(client.cmds._serialized);
}});

async function setupmsg() {
	this.author = this.author || this.member || this.user;
	this.author.isNotPerson = (
		this.author.bot || // bots
		this.author.system || // system msgs
		this.author.discriminator === "0000" // webhooks
	);
	this.author.isAdmin = conf.main.admins.indexOf(this.author.id) !== -1;
	this.embedreply   = client._embedreply;
	this.webhookreply = client._webhookreply;
	this.errorreply   = client._errorreply;
}
client.hooks.add({event: "messageCreate",     priority: Infinity, func: setupmsg});
client.hooks.add({event: "interactionCreate", priority: Infinity, func: setupmsg});

client.hooks.add({event: "interactionCreate", func: async function() {
	if (!this.isCommand()) return;
	const cmd = client.cmds[this.commandName]
	if (!cmd) return; // just in case
	if (this.inGuild() === false && cmd.dm === false) {
		this.errorreply("This command cannot be used in DMs");
		return;
	}
	log(`slashcmd ${this.user.tag}: ${this.commandName}`);
	const args = [];
	if (cmd.args) {
		for (let i = 0; i < cmd.args.length; ++i) {
			let opt = this.options.get(cmd.args[i][1]);
			if (opt) {
				switch (opt.type) {
					case 6: // dc.USER
						opt = opt.member || opt.user;
						break;
					default: // everything else
						opt = opt.value;
						break;
				}
				if (i[3] && opt.length && opt.length === 0) {
					this.errorreply(`\`${cmd.args[i][1]}\`: This field is required`);
					return;
				}
				args.push(opt);
			} else {
				if (i[3]) {
					this.errorreply(`\`${cmd.args[i][1]}\`: This field is required`);
					return;
				}
				args.push(undefined);
			}
		};
	}
	if (cmd.hide && this.inGuild()) {
		await this.deferReply();
		await this.deleteReply();
	};
	cmd.func.bind(this)(args);		
}});

client.hooks.add({event: "messageCreate", func: async function() {
	if (this.author.isNotPerson) return;
	if (!this.content.startsWith(conf.main.prefix)) return;
	let index = this.content.indexOf(" ");
	let cmd;
	if (index === -1) {
		this.cmdname = this.content.slice(1);
		this.content = "";
	} else { 
		this.cmdname = this.content.slice(1, index);
		this.content = this.content.slice(index + 1);
	}
	this.cmdname = this.cmdname.toLowerCase();
	if (!client.cmds[this.cmdname]) { // use fuzzy match
		this.cmdname = util.levdisclosest(Object.keys(client.cmds), this.cmdname, 3);
		if (!this.msgname) return; // nothing near to it
	}
	cmd = client.cmds[this.cmdname];
	log(`cmd ${this.author.tag}: ${this.cmdname} ${this.content}`);
	if (!this.author.isAdmin) {
		if (cmd.admin) {
			msg.errorreply("You need to be bot admin to use this command");
			return;
		}
		if (this.inGuild()) {
			if (cmd.perm && !msg.member.permissions.has(cmd.perm)) {
				this.errorreply("You are missing permissions:\n\`" + new dc.PermissionsBitField(cmd.perms & ~this.member.permissions.bitfield).toArray().join("\`, \`") + "\`");
				return;
			}
		} else if (cmd.dm === false) {
			this.errorreply("This command cannot be used in DMs");
			return;	
		}
	} else if (cmd.dm === false && !this.inGuild()) {
		this.errorreply("This command cannot be used in DMs");
		return;	
	}
		
	if (cmd.args) {
		if (this.content.length === 0) {
			this.content = [];
		} else {
			this.content = this.content.split(/(?<=[^\\]) /g);
			for (let i = 0; i < this.content.length; ++i)
				this.content[i] = this.content[i].replace(/\\ /g, " ");
		}
		if (this.content.length > cmd.args.length && cmd.args.at(-1)[0] !== dc.BIGTEXT) {
			this.errorreply("Too many arguments");
			return;
		}
		for (let i = 0; i < cmd.args.length; ++i) {
			if (this.content[i] === undefined) {
				if (cmd.args[i][3]) { // if required
					this.errorreply(`\`${cmd.args[i][1]}\` This field is required`);
					return;
				}
				continue;
			}
			switch (cmd.args[i][0]) {
				case dc.USER:
					let user;
					let id = this.content[i].match(/[0-9]+/);
					if (id) {
						id = id[0];
						try {
							user = await this.guild.members.fetch(id);
						} catch (e) {
							if (cmd.dm) {
								try {
									user = await client.users.fetch(id);
								} catch (e) { }
							}
						}
					}
					if (!user) {
						if (this.channel.members) {
							user = util.levdisuserclosest(
								this.channel.members,
								this.content[i],
								3
							);
						} else {
							user = util.levdisuserclosest(
								[ client.user, this.author ],
								this.content[i],
								3
							);
						}
					}
					if (!user) {
						this.errorreply(`\`${cmd.args[i][1]}\`: Invalid user`);
						return;
					}
					this.content[i] = user;
					break;
				case dc.BIGTEXT:
					this.content[i] = this.content.slice(i).join(" ");
				case dc.TEXT:
					this.content[i] = this.content[i].replace(/\\ /g, " ");

					if (
						(cmd.args[i][4] && cmd.args[i][4] > this.content[i].length) ||
						(cmd.args[i][5] && cmd.args[i][5] < this.content[i].length)
					) {
						if (cmd.args[i][4]) {
							if (cmd.args[i][5]) this.errorreply(`\`${cmd.args[i][1]}\`: Length must be between ${cmd.args[i][4]} and ${cmd.args[i][5]}`);
							else                this.errorreply(`\`${cmd.args[i][1]}\`: Length must be above ${cmd.args[i][5]})`);
						} else {
							this.errorreply(`\`${cmd.args[i][1]}\`: Length must be below ${cmd.args[i][5]})`);
						}
						return;
					}
					break;
				case dc.CHOICE:
					this.content[i] = this.content[i].toLowerCase();
					if (cmd.args[i][4].indexOf(this.content[i]) === -1) {
						this.content[i] = util.levdisclosest(cmd.args[i][4], msg.content[i], 3);
						if (this.content[i] === undefined) { // nothing near to it
							this.errorreply(`\`${cmd.args[i][1]}\`: Invalid choice, options are:\n\`` + cmd.args[i][4].join("\`, \`") + "\`"); // "
							return;
						}
					}
					break;
				case dc.INT:
					try {
						this.content[i] = Math.round(this.content[i]);
					} catch (e) {
						this.errorreply(`\`${cmd.args[i][1]}\`: Invalid Integer`);
						return;
					}
					if (cmd.args[i][4]) {
						if (cmd.args[i][5]) this.errorreply(`\`${cmd.args[i][1]}\`: Must be between ${cmd.args[i][4]} and ${cmd.args[i][5]}`);
						else                this.errorreply(`\`${cmd.args[i][1]}\`: Must be above ${cmd.args[i][5]})`);
					} else {
						this.errorreply(`\`${cmd.args[i][1]}\`: Must be below ${cmd.args[i][5]})`);
					}
					return;
					break;
				case dc.NUM:
					this.content[i] = Number(msg.content[i]);
					if (isNaN(this.content[i])) {
						this.errorreply(`Invalid Number for \`${cmd.args[i][1]}\``);
						return;
					}
					if (
						(cmd.args[i][4] && cmd.args[i][4] > this.content[i]) ||
						(cmd.args[i][5] && cmd.args[i][5] < this.content[i])
					) {
						if (cmd.args[i][4]) {
							if (cmd.args[i][5]) this.errorreply(`Invalid Number (must be imbetween ${cmd.args[i][4]} and ${cmd.args[i][5]}) for \`${cmd.args[i][1]}\``);
							else                this.errorreply(`Invalid Number (must be above ${cmd.args[i][4]}) for \`${cmd.args[i][1]}\``);
						} else {
							this.errorreply(`Invalid Number (must be below ${cmd.args[i][5]}) for \`${cmd.args[i][1]}\``);
						}
						return;
					}
					break;
			}
		}
		if (cmd.hide && this.inGuild()) this.delete();
		cmd.func.bind(this)(this.content);
	} else {
		if (cmd.hide && this.inGuild()) this.delete();
		cmd.func.bind(this)([]);
	}
}});

client.login(conf.main.token);

// Error handling
process.on("uncaughtException", e => {
	log.error(`${e} ${e.stack}`);
	if (!conf.main.error) return;
	const embed = {
		description: `\`\`\`${e}: ${e.stack}\`\`\``,
		title      : "Error",
		color      : 255 << 16
	};
	client.channels.fetch(conf.main.error).then(channel => {
		channel.send({ embeds: [embed] }).catch(() => log.warn("Unable to send error message"));
	}).catch(() => log("Unable to fetch error channel"));
});

// REPL
if (require.main === module) {
	const repl = require("repl");
	if (repl.start)
		require("repl").start();
	else
		log.error("Cannot start repl");
}
