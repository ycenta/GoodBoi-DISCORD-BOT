//const { Client, Util } = require('discord.js');
//const client = require('discord.js');
const Util = require('discord.js');
//const { TOKEN, PREFIX, GOOGLE_API_KEY, FORTNITE_KEY, ADMIN_ID} = require('./config');
const TOKEN = process.env.BOT_TOKEN ;
const PREFIX = "??" ;
const GOOGLE_API_KEY = process.env.GOOGLE_KEY ;
const FORTNITE_KEY = process.env.FT_KEY ;
const Discord = require('discord.js');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();
const Fortnite = require('fortnite');
const clientFortnite = new Fortnite(FORTNITE_KEY);
var md = "```";
var ADMIN_ID = 'YOURDISCORDID';
var request = require('request');

//////////////////////////////////////

client.on('ready',()=> { //->>>>>>>>> WHEN THE BOT STARTS
client.user.setStatus('idle');
	console.log('Bot connected !');
	 client.user.setGame(`With dog toys and ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} servers.`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
	var maDate = new Date() ;
	var h = maDate.getHours();
	var s = maDate.getSeconds();
	var min = maDate.getMinutes();
	const ADMIN_CHANNEL = client.channels.get("IDSERVER","IDCHANNELOFSERVER"); 
	var GUILD_NAME = guild.name;
	var GUILD_ID = guild.id ;
	var GUILD_MEMBERCOUNT = guild.memberCount;
	const embed = new Discord.RichEmbed()
		.setTitle("You bot was invited in "+GUILD_NAME)
		.setAuthor("New Guild Joined !", "https://i.imgur.com/lm8s41J.png")
		.setColor(0x00AE86)
		.setDescription("The guild "+GUILD_NAME+" has "+GUILD_MEMBERCOUNT+" members")
		.setFooter("guild id : "+GUILD_ID)
		.setImage("https://i.imgur.com/y9vr4eu.png")
		.setThumbnail("https://i.imgur.com/FrHXZZX.gif")
		.setTimestamp()
		.setURL("https://ihasabucket.com/")
		
		ADMIN_CHANNEL.send({embed});
});

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)

	if (command === 'play') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
					msg.channel.send(`
__**Song selection:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Please provide a value to select one of the search results ranging from 1-10.
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('No or invalid value entered, cancelling video selection.');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('⚠️ I could not obtain any search results.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'skip') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
	} else if (command === 'stop') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could stop .');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used');
		return undefined;
	} else if (command === 'volume') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
		if(args[1]>5){return msg.reply("Max volume is 5")}
		if(args[1]<6){serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5); }
		return msg.channel.send(`I set the volume to: **${args[1]}**`);
	} else if (command === 'np') {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		return msg.channel.send('<a:MUSIC:467809933887275008> '+` Now playing: **${serverQueue.songs[0].title}**`+' <a:MUSIC:467809933887275008> '); 
	} else if (command === 'queue') {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		return msg.channel.send(`
__**Song queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Now playing:** ${serverQueue.songs[0].title}
		`);
	} else if (command === 'pause') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('⏸ Paused !');
		}
		return msg.channel.send('There is nothing playing.');
	} else if (command === 'resume') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('▶ Resumed !');
		}
		return msg.channel.send('There is nothing playing.');
	} else if(command === "ping") {
		const m = await msg.channel.send("Ping?");
		m.edit(`Pong! Latency is ${m.createdTimestamp - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
	} else if(command === "setgame" && msg.author.id==ADMIN_ID){ 
		client.user.setActivity(args[1]);
	} else if(command ==="resetgame" && msg.author.id==ADMIN_ID){
		client.user.setGame(`With dog toys and ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} servers.`);
	} else if(command === "say" && msg.author.id==ADMIN_ID ){
		msg.delete();
		msg.channel.send(args[1]);
	} else if(command === "fortnite"){
		clientFortnite.getInfo(args[1], 'pc').then(data =>msg.channel.send("```css"+"\r\n"+"lifetime Stats of : "+args[1]+"\r\n"+"TOP1 : "+JSON.stringify(data.lifetimeStats[8].value)+"\r\n"+"Match played : "+JSON.stringify(data.lifetimeStats[7].value)+"\r\n"+"Win % : "+JSON.stringify(data.lifetimeStats[9].value)+"\r\n"+"Kills : "+JSON.stringify(data.lifetimeStats[10].value)+"\r\n"+"KD ratio : "+JSON.stringify(data.lifetimeStats[11].value)+"\r\n"+"Time played : "+JSON.stringify(data.lifetimeStats[13])+"\r\n"+"```"));
	} else if(command === "hello"){
		if(msg.mentions.users.first()){
		BOTHIMSELF=msg.mentions.users.first();
		if(BOTHIMSELF.id=='BOT_ID'){
		msg.channel.send('hi');
		}
									}
	} else if(command === "avatar"){
		if(msg.mentions.users.first()){
		var TaggedUSER = msg.mentions.users.first();
		let avatar = TaggedUSER.displayAvatarURL ; 
		let embed = {description:"Here is the Avatar of "+TaggedUSER.username+" *[url]("+avatar+")*",image:{url:avatar}}
		msg.channel.send("", {embed});
		}else{return ;} 
	} else if(command === "dog"){
		/*var numberimage=Math.floor(Math.random() * Math.floor(imageurl.length));
		msg.reply(imageurl[numberimage]) */
		  request({
	  url: 'https://dog.ceo/api/breeds/image/random',
	  json: true
	}, function(error, response, body) {
		msg.reply(body.message);	
		}); 
	} else if(command === "archillect"){
		var randomnum=Math.floor(Math.random() * Math.floor(183851));
		msg.channel.send("http://archillect.com/"+randomnum);
	} else if(command === "hug") {	
		var hug = md+` 	
		*Hug*     *Hug*    *Hug*     *Hug*          *Hug*
		*Hug*     *Hug*    *Hug*     *Hug*       *Hug* *Hug*
		*Hug*     *Hug*    *Hug*     *Hug*      *Hug*   *Hug*
		*Hug*     *Hug*    *Hug*     *Hug*     *Hug*
		*Hug**Hug**Hug*    *Hug*     *Hug*    *Hug*
		*Hug**Hug**Hug*    *Hug*     *Hug*    *Hug*    *Hug**Hug*
		*Hug*     *Hug*    *Hug*     *Hug*     *Hug*     *Hug*
		*Hug*     *Hug*     *Hug*   *Hug*       *Hug*   *Hug*
		*Hug*     *Hug*      *Hug* *Hug*         *Hug* *Hug*
		*Hug*     *Hug*         *Hug*               *Hug* `+ md;
		msg.reply(hug);
	} else if(command === "info"){
		if(msg.mentions.users.first()){
		var TaggedUSER = msg.mentions.users.first();
		var TaggedMember = msg.mentions.members.first();
		let avatar = TaggedUSER.displayAvatarURL ;
		var creatime = TaggedUSER.createdAt.toString().slice(0,16);
		 const embed = new Discord.RichEmbed()
		.setColor(0x13f97b)
		.setDescription("Username :"+TaggedUSER+"    #"+TaggedUSER.discriminator)
		.setTimestamp()
		.setThumbnail(avatar)
		.addField("Is a bot ?",TaggedUSER.bot)
		.addField("Account created",creatime)
		.addField("Join",TaggedMember.joinedAt.toString().slice(0,16) )
		.addField("Status", TaggedMember.presence.status)
		.addField("Highest role",TaggedMember.highestRole.name) 
		msg.channel.send({embed});
		//console.log(TaggedUSER); https://discord.js.org/#/docs/main/stable/class/GuildMember?scrollTo=highestRole  A VOIR A VOIR A VOIR
		}else{	
		 const embed = new Discord.RichEmbed()
		.setColor(0xff0000)
		.setDescription("You must mention a valid user")
		.setTimestamp()
		
		msg.channel.send({embed});	
			 }
	}
	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 3,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(`✅ **${song.title}** has been added to the queue!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`🎶 Start playing: **${song.title}** 🎶`);
}
var imageurl = new Array('https://i.imgur.com/kVLWTgy.jpg','https://i.imgur.com/W1PKAlu.jpg','https://i.imgur.com/DUvgdhr.jpg','https://i.imgur.com/L1oQhJU.png','https://i.imgur.com/o7rgMYY.png','https://i.imgur.com/tGaNmRB.jpg','https://i.imgur.com/MdcDpeZ.jpg','https://i.imgur.com/7z3dS5i.png','https://i.imgur.com/bfHeLH4.jpg','https://i.imgur.com/JIfsXR9.png','https://i.imgur.com/poM8Dhw.jpg','https://i.imgur.com/VKoaUwj.jpg','https://i.imgur.com/bY7ORrX.jpg','https://i.imgur.com/aQgoCfP.jpg','https://i.imgur.com/lWE2ZW0.jpg','https://i.imgur.com/hroKIcX.jpg','https://i.imgur.com/dpEXNbr.jpg','https://i.imgur.com/OVNLWpQ.jpg','https://i.imgur.com/yRCkRz4.jpg','https://i.imgur.com/iyITZLU.jpg','https://i.imgur.com/XjrwIF0.jpg','https://i.imgur.com/vUv9vrj.png','https://i.imgur.com/nzSAqDh.png','https://i.imgur.com/nHfrURC.jpg','https://i.imgur.com/q1MZa9H.jpg','https://i.imgur.com/pBgLa8q.jpg','https://i.imgur.com/ONBCmWV.png','https://i.imgur.com/nd1AwPm.jpg','https://i.imgur.com/3Likenl.jpg','https://i.imgur.com/b2wyJNH.png','https://i.imgur.com/ik1KTLZ.png','https://i.imgur.com/SulZnOp.jpg','https://i.imgur.com/4oBoujQ.png','https://i.imgur.com/EXDUlLZ.png','https://i.imgur.com/BvAw2U3.png','https://i.imgur.com/yOcd1bU.jpg','https://i.imgur.com/8QP41CO.png','https://i.imgur.com/Dm0WW9l.png','https://i.imgur.com/PGSdXTr.jpg','https://i.imgur.com/jjZas0f.png','https://i.imgur.com/dj6e0tQ.jpg','https://i.imgur.com/c13Lrvo.jpg','https://i.imgur.com/LjiYms7.jpg','https://i.imgur.com/0NaWjdi.jpg','https://i.imgur.com/3EMhtZm.jpg','https://i.imgur.com/iEG1SoE.jpg','https://i.imgur.com/eAKypGS.jpg','https://i.imgur.com/erZZwSB.jpg','https://i.imgur.com/UGyWuvb.jpg','https://i.imgur.com/cJIdeWa.jpg','https://i.imgur.com/rENtMLz.jpg','https://i.imgur.com/rENtMLz.jpg','https://i.imgur.com/vOYTuGO.jpg','https://i.imgur.com/r3931Gn.jpg','https://i.imgur.com/8AfsTfd.jpg','https://i.imgur.com/VZf2CSl.jpg','https://i.imgur.com/Utxzn1j.jpg','https://i.imgur.com/T98URFz.jpg','https://i.imgur.com/RdfWTIW.jpg','https://i.imgur.com/cBex5zo.jpg','https://i.imgur.com/UR2qJsC.png','https://i.imgur.com/iva8jMF.jpg','https://i.imgur.com/yPEb08M.jpg','https://i.imgur.com/L8SQGIB.jpg');
client.login(TOKEN);
