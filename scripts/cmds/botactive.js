module.exports = {
	config: {
		name: "botactive",
		version: "1.1",
		author: "Hridoy",
		countDown: 5,
		role: 2,
		description: "Notify all groups when the bot starts",
		category: "System",
		guide: {
			en: "{pn}: manually resend the bot-active notice to all groups"
		}
	},

	// 🔔 Auto notify all groups when the bot starts
	onLoad: async function ({ api, threadsData }) {
		try {
			setTimeout(async () => {
				const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);

				for (const thread of allThreads) {
					try {
						await api.sendMessage(
							"🤖 Bot is now actived.\n\n📖 Type .help to see commands.",
							thread.threadID
						);
					} catch (err) {
						console.error(`[BOT ACTIVE] Failed to notify ${thread.threadID}:`, err?.message || err);
					}

					// Facebook rate limit এড়াতে
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				console.log("[BOT ACTIVE] Message sent to all groups.");
			}, 5000);
		} catch (err) {
			console.error("[BOT ACTIVE ERROR]", err);
		}
	},

	// 🔁 Manual trigger (admin only): resend the notice on demand
	onStart: async function ({ api, event, threadsData }) {
		const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);

		for (const thread of allThreads) {
			try {
				await api.sendMessage(
					"🤖 Bot is now actived.\n\n📖 Type .help to see commands.",
					thread.threadID
				);
			} catch (err) {
				console.error(`[BOT ACTIVE] Failed to notify ${thread.threadID}:`, err?.message || err);
			}
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		return api.sendMessage(`✅ Notified ${allThreads.length} group(s).`, event.threadID);
	}
};
