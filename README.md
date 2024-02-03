# MC Bot
Based on my [Discord bot framework](https://github.com/sollybunny/discord-bot), extra information can be found here on how the bot works

## Features
* Ping bot for help
* Restart voting
* Chat sync

## Usage
Run `./run.sh` or `./index.js` with `nodejs`

## Config
Config is located in `conf.json`

### Main config
* `token`: The discord token to use (also known as OAuth2 Client Secret)  
* `prefix`: The command prefix to use
* `admins`: Array of string IDs of admins
* `activity`: Activity text of the bot



## Globals
Stuff that you can use everywhere

### Modules
Both `fs` and `https` are available globally

### Custom log
When possible use the custom `log` global instead of `console.log`, here are the functions available:  
* `log(msg: String) => undefined`: Print a msg
* `log.warn(msg: String) => undefined`: Print a warn msg
* `log.error(msg: String) => undefined`: Print an error msg
* `log.time() => String`: Return the current time as a string
* `log.raw(color: Integer, msg: String)`: Print a message with a colored timestamp (internal)
* `log.fake(...args: *) => String`: Same arguments as `console.log`, outputs the string which would've been printed (includes escape codes) (don't use this) (ever)

### Discord.js
Discord.js is included as `dc` with added parts  
#### Argument types
This is used in command arguments. The types are in `dc.XXX`. You can get a string name for these using `dc.typename[dc.XXX]`.  

### Util
`util.levdis(a: String, b: String) => dis: Integer`: Get the Levenshtein distance between two strings  
`util.levdisclosest(array: Array<String>, target: String, cutoff: Integer) => Array<String>`: Sort an array by `levdis` to a `target` (items further than `cutoff` are removed)  
`util.levdisuserclosest(array: Array<User / GuildMember>, target: String, cutoff: Integer) => Array<String>`: Sort an array of users by `levdis` to a `target` (items further than `cutoff` are removed)  
`util.fetch(url: String) => Promise<String>`: A URL fetching tool when built-in fetch doesn't work  

### Client
Where all client-related shenanigans are stored, refer to (docs)[https://discord.js.org/#/docs/discord.js/main/class/Client] for more info  
`client.cmds`: Dictionary of commands  
`client.cogs`: Paths of loaded cogs  
`client.hooks`: All hooks  
Here are some functions!  
`async client.cmds.serialize() => Array<Command>` Turn the commands in `client.cmds` into a single object which can be accepted by the discord API  
`async client.cmds.push(Array<Command>)` Push commands to the discord API  
`client.cogs.load(name: String) => Boolean | undefined` Load a cog, a bool return value represents whether the cog was loaded, an undefined means theres an error preventing the cog from loading (doesn't exist / disabled) (extention name included)  
`client.cogs.unload(name: String) => undefined` Unload a cog (extention name included)  
`client.hooks.add({event: String, priority: Number, func: async function => Boolean}) => undefined` Add a hook  
`client.hooks.sub({event: String, priority: Number, func: async function => Boolean}) => undefined` Sub a hook  

## Cogs
Cogs can be found in `./cogs/*.js`
```js

// Should this cog be ignored (optional)
module.exports.disabled = false;

// What things this cog requires such as node modules or binary packages (optional)
module.exports.requires = ["loveandcare"];

// A description of this cog (optional but recommended)
module.exports.desc = "<what I does>";

// The description of this cogs config, any values here can be accessed with conf.cogname.confpathorname (optional)
module.exports.conf = {
	...
	a: { def: 10 /* Default value */, desc: "This is a number" /* Description of the value (optional) */},
	b: {
		c: { def: "Hello", desc: "Values can be nested in objects or arrays" }
	}
	...
};

// Hooks into discord.js events with propogation and cancellation
module.exports.hooks = [
	...
	{
		"event": "<event name>", // See https://discord.js.org/#/docs/discord.js/main/class/Client for event names
		"priority": 0, // Higher priorities means the hook is ran first
		"func": async function () {
			...
			if (something) {
				return true; // Cancel this event, preventing hooks with lower priority from recieving it
			}
			...
		}
	}
	...
];

module.exports.cmds = { // optional
	...
	"commandname": {
		admin: false, // Whether a user must be an admin (in conf.main.admins) (optional)
		dm: true, // Whether this command can be used in DMs or not (optional)
		hide: false, // Whether the calling of this command is hidden (optional)
		args: [ // The arguments of the command (optional)
			// Format
			[type, name, desc, required /* (optional) */, ...args /* depends on type (optional) */],
			// A string
			[dc.TEXT, "name", "Mother's maiden name", true, 5 /* Min string size (optional) */, 20 /* Max string size (optional) */],
			// Either true or false (NOT IMPLEMENTED)
			[dc.BOOL, "violence", "Whether violence should be used", true],
			// A whole number
			[dc.INT, "bet", "How much money to bet", false, 100, 5 /* Min int value (optional) */, 100 /* Max int value (optional) */],
			// A floating point number
			[dc.NUMBER, "dmg", "How much pain to inflict", undefined /* Min value (optional) */, 123.45 /* Max value (optional) */],
			// A user in the channel (found first by ID then by a fuzzy search)
			[dc.USER, "user", "User to make immortal", false],
			// A role in the channel (NOT IMPLEMENTED)
			[dc.ROLE, "role", "Role to allow", true],
			// A channel in the server (NOT IMPLEMENTED)
			[dc.CHANNEL, "channel", "Channel to nuke", true],
			// A server the bot is in (NOT IMPLEMENTED)
			[dc.SERVER, "Server", "Gift location", true],
			// Same as text but must be one of these options (fuzzy search used)
			[dc.CHOICE, "animal", "Fav animal", true, ["Cat", "Dog", "Perry the Platypus"] /* Choices */],
			// Text not seperated by spaces (must come last)
			[dc.BIGTEXT, "prompt", "Prompt for AI", true, undefined /* Min string size (optional) */, 200 /* Max string size (optional) */],
		],
		func: async function(args) {
			// See below for more description
			this.embedreply({
				color: [12, 34, 56],
				msg: "Hello world!"
			});
		}
	}
	...
};

module.exports.onload = async function() { // optional, runs on cog load
	// Do all initialization of config and other stuff here
};

module.exports.onloadready = async function() { // optional, runs on cog load after bot is initialized
	// Fetch channels, servers, users, etc
};

module.exports.onunload = async function() { // optional, runs on cog unload
	// Cleanup any timers, callbacks, etc
};

// NOT IMPLEMNTED
module.exports.tick = async function() { // optional, runs every ~5m
	// Save any data, do random tasks, etc
};

```

### Commands

In the command function, `this` refers to the (message)[https://discord.js.org/#/docs/discord.js/main/class/Message] or (interaction)[https://discord.js.org/#/docs/discord.js/main/class/CommandInteraction] object with some extras.

These extras are:
* `this.author.isNotPerson`: Whether the author is a bot, system or webhook message or just a user
* `this.author.isAdmin`: Whether the author is a bot admin (defined in `conf.main.admins`)
* `async this.embedreply(Object<opts>) => undefined`: Send an embed reply
* `async this.errorreply(msg: String) => undefined`: A shorthand for an error embed
* `async this.webhookreply(user: dc.GuildMember, msg: String) => undefined`: Send a message as a different user (sends a message in DMs)  

Here is an explanation of the most complicated given function, and as such I'm going to break it down a bit more. Here is the semi-formal syntax for reference  
```js
async this.embedreply(Object<{
	msg: String, // (if not present, title must be)
	title: String, // (if not present, msg must be)
	color: Array<Integer>, // In format [r, g, b] (optional)
	colorraw: Integer, // Raw 24 bit color (optional)
	fields: Array<Object<{ // A way to show many small sections (optional)
		name: String,
		value: String
	}>>,
	thumb: Url (String), // Displayed in the top right (optional)
	image: Url (String), // Displayed largely at the bottom (optional)
	url: Url (String), // The link you are directed to if you click on the title (optional)
}>) => undefined
```
Don't be scared! look at this example instead  
```js
await this.embed({
	"title": "Hello World",
	"msg": "I'm a bot!"
});
```
See? EZ.

# Thank you for coming to my TED Talk