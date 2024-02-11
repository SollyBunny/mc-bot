# MC Bot
Based on my [Discord bot framework](https://github.com/sollybunny/discord-bot), extra information can be found here on how the bot works

## Features
* Server control
* Chat sync
* Supports any minecraft version with any modloader

## Usage
1. Create your config file from copying `conf.def.json`
2. Start your minecraft server in a screen with the same name as as in `mc.screenname` (default is mc)
3. Run `./run.sh` or `./index.js` with `nodejs`
4. If you wish to interact with the minecraft server manually you can use the `-x` flag in the screen command

## Config
Config is located in `conf.json`
* `main.token`: The discord token to use (also known as OAuth2 Client Secret)  
* `main.prefix`: The command prefix to use
* `main.admins`: Array of string IDs of admins
* `main.activity`: Activity text of the bot
* `mc.screenname`: Name of screen that the minecraft server is running in
* `mc.channelid`: ID of the channel where chat sync happens
