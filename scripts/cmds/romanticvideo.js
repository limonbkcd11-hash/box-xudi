// romanticvideo.js
// Goat Bot command: Sends a random romantic video with a random sexy caption
// Install deps: npm install axios fs-extra
// Place this file in your Goat Bot commands folder.

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const romanticConfig = {
  name: "romanticvideo",
  aliases: ["rv"],
  version: "1.3",
  author: "Rocky", // ❌ Do not change this
  countDown: 5,
  role: 0,
  shortDescription: "Send romantic video",
  longDescription:
    "Sends a random romantic TikTok/Drive clip as video attachment with hot caption",
  category: "Media",
  guide: {
    en: "{p}{n} — sends a random romantic video",
  },
};

module.exports = {
  threadStates: {},

  config: romanticConfig,

  // 🔒 Author protection
  // (fixed: the loader calls onLoad as a plain function, so `this` is not
  // bound to module.exports here — reference the config object directly
  // instead of `this.config` to avoid "Cannot read properties of undefined")
  onLoad: function () {
    if (romanticConfig.author !== "Rocky") {
      throw new Error("❌ Do not change the author name! File stopped.");
    }
  },

  // 🎥 Google Drive link normalizer
  normalizeDrive: function (input) {
    try {
      if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) {
        return `https://drive.google.com/uc?export=download&id=${input}`;
      }
      const m = String(input).match(/drive\.google\.com\/file\/d\/([^/]+)/);
      if (m && m[1]) {
        return `https://drive.google.com/uc?export=download&id=${m[1]}`;
      }
      const m2 = String(input).match(/[?&]id=([^&]+)/);
      if (m2 && m2[1]) {
        return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
      }
      return input;
    } catch {
      return input;
    }
  },

  // 🔗 Drive links
  drivePool: [
    "https://drive.google.com/uc?export=download&id=1Vo4i2WAuJaDEX139r_AlWH29tMK8HnUE",
    "https://drive.google.com/uc?export=download&id=1yXj4M4kc4iVrg7rjv-1KMJcwoJK7U1CK",
    "https://drive.google.com/uc?export=download&id=18y0QSMRy66i_Xg1hMVqDWkvCwkobee9I",
    "https://drive.google.com/uc?export=download&id=1mAfoOgMnsy9kTGMGU8VGGsHsv8CE_L5e",
    "https://drive.google.com/uc?export=download&id=1-Jf9VP4J9Fda6ajWfdY9AIBYRfx0pezA",
    "https://drive.google.com/uc?export=download&id=1rxhztcl8toe9wmVBsOVOkSSjXLjVu6l3",
    "https://drive.google.com/uc?export=download&id=1DRL5DvDEy3c6pJo3fEL5cnuP3RCP4JZR",
    "https://drive.google.com/uc?export=download&id=16SEQAUEAIpOvzep6COOxfgs6x8Mpt7Qt",
    "https://drive.google.com/uc?export=download&id=1cDWQKgOegwtKMAikMplUy6zv9rS4Wpuv",
    "https://drive.google.com/uc?export=download&id=10I0vgh2KmYoU_AcT7PF8YFyU3V7q1cxT",
    "https://drive.google.com/uc?export=download&id=1V57jxhtVCAHORpxdiIkHcvAbzgWK11ZW",
    "https://drive.google.com/uc?export=download&id=1l7Bm2ClPsoGdrlo6DZ8PmGFHAL7hTCvv",
    "https://drive.google.com/uc?export=download&id=1RTFop6Ct-w4jtJjvmZgj0ZMKtiMTNiwe",
    "https://drive.google.com/uc?export=download&id=1k6zGxl9tkNlIzK09p3uuJjOOqyWiXtPR",
    "https://drive.google.com/uc?export=download&id=1hTMLi02hOEdyI1pcmRZ1SoqlPVlFjoCj",
  ],

  // 💋 Caption pool
  captionPool: [
    "🔥 Love feels even hotter when you’re watching this 💋",
    "💞 Let the vibe melt your heart… and maybe a little more 😘",
    "❤️‍🔥 Just a little taste of passion for you 😉",
    "💫 Sparks flying, hearts racing — can you feel it? 💕",
    "💋 Mood: dangerously romantic 😍",
    "🔥 This one will set your heart on fire 💖",
    "💞 When love gets steamy, everything glows 😘",
    "❤️ For the ones who love love — hot and pure 💫",
    "💋 Soft lips, slow beats, and deep feels 😍",
    "🔥 Turn up the heat, it’s a romantic night 💞",
  ],

  // 🧡 Main logic
  onStart: async function ({ api, event }) {
    const threadID = event.threadID;
    if (!this.threadStates[threadID]) this.threadStates[threadID] = {};

    try {
      api.setMessageReaction("💗", event.messageID, () => {}, true);

      // ✨ Send pre-message
      const preMsg = await api.sendMessage(
        "⏳💖 𝐀𝐩𝐧𝐚𝐫 𝐯𝐢𝐝𝐞𝐨 𝐭𝐢 𝐮𝐩𝐥𝐨𝐚𝐝 𝐤𝐨𝐫𝐚 𝐡𝐨𝐬𝐬𝐞...\n🌸 𝐊𝐢𝐬𝐮 𝐤𝐡𝐨𝐧 𝐨𝐩𝐞𝐤𝐡𝐚 𝐤𝐨𝐫𝐮𝐧 💞\n✨ ʏᴏᴜʀ ʀᴏᴄᴋʏ ʙᴏᴛ 💫",
        threadID
      );

      // Random pick
      const pick = this.drivePool[Math.floor(Math.random() * this.drivePool.length)];
      const caption = this.captionPool[Math.floor(Math.random() * this.captionPool.length)];
      const directUrl = this.normalizeDrive(pick);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `romantic_${Date.now()}.mp4`);

      await this.downloadVideo(directUrl, filePath);

      if (fs.existsSync(filePath) && (await fs.stat(filePath)).size > 0) {
        await api.sendMessage(
          {
            body: `${caption}\n\n💝 𝐎𝐰𝐧𝐞𝐫: 𝐑𝐨𝐜𝐤𝐲\n🔗 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: https://www.facebook.com/bd.king.riyaz.top.voicer.420`,
            attachment: fs.createReadStream(filePath),
          },
          threadID,
          async () => {
            // 🧹 Unsend the pre-message after video is sent
            if (preMsg && preMsg.messageID) {
              try {
                await api.unsendMessage(preMsg.messageID);
              } catch {}
            }
          }
        );

        fs.unlink(filePath).catch(() => {});
      } else {
        api.sendMessage("⚠️ Error: Video could not be saved. Try again.", threadID);
        if (preMsg && preMsg.messageID) api.unsendMessage(preMsg.messageID);
      }
    } catch (err) {
      console.error("romanticvideo error:", err?.response?.data || err);
      api.sendMessage("❌ An error occurred while sending the romantic video.", threadID);
    }
  },

  // 📥 Video downloader
  downloadVideo: async function (url, outPath) {
    try {
      const res = await axios({
        method: "GET",
        url,
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" },
        maxRedirects: 5,
      });

      const ct = res.headers["content-type"] || "";
      if (ct.includes("text/html") && !ct.includes("video")) {
        console.warn("Downloaded HTML instead of video; check Drive link permissions.");
      }
      await fs.writeFile(outPath, res.data);
    } catch (err) {
      console.error("Download error:", err?.response?.status, err?.message);
      throw err;
    }
  },
};