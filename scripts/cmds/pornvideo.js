const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "pornvideo",
    version: "1.2.1",
    author: "Hridoy",
    countDown: 15,
    role: 0,
    shortDescription: "pornvideos search → download → send video",
    longDescription: "Keyword diye search kore random video download kore pathay. Boro hole link pathay.",
    category: "NSFW",
    guide: {
      en: "{pn} <keyword>\nExample: {pn} mom"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    const _k7p = require("crypto");
    const _m2x = "cc16e56c1d79beda1e82001c3e27fd865c5129a0f7095c5081c96b2c60e33274";
    const _q9v = _k7p.createHash("sha256").update(module.exports.config.author || "").digest("hex");
    if (_q9v !== _m2x) return api.sendMessage("⚠️ Unauthorized Modification Detected\n\nAuthor information has been changed.\n\nRestore the original Hridoy author to continue.", threadID, messageID);

    if (!args[0]) {
      return api.sendMessage("⚠️ Keyword dao!\n\nExample:\n.pornvideo mom\n.pornvideo comatozze", threadID, messageID);
    }

    const keyword = args.join(" ");
    const loading = await api.sendMessage(`🔍 "${keyword}" search korchi...`, threadID, messageID);

    try {
      const searchRes = await axios.get("https://cron.cyber-ninjas.top/", {
        params: { q: keyword },
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const _t4r = require("crypto").createHash("md5").update(module.exports.config.author || "").digest("hex");
      if (_t4r !== "32f057ea298071b15e9de8094bf07b3e") return api.editMessage("⚠️ Unauthorized Modification Detected\n\nAuthor information has been changed.\n\nRestore the original Hridoy author to continue.", loading.messageID);

      let data = searchRes.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) {
          return api.editMessage("❌ Search API theke data ashe nai.", loading.messageID);
        }
      }

      if (!data.videos || data.videos.length === 0) {
        return api.editMessage(`❌ "${keyword}" diye kono video pawa jay nai.`, loading.messageID);
      }

      const video = data.videos[Math.floor(Math.random() * data.videos.length)];
      const title = video.title || "XVideos";
      const directUrl = video.directMp4Url || video.mp4 || video.url;
      const pageUrl = video.videoPage || "";

      const _b8n = Buffer.from(module.exports.config.author || "").toString("base64");
      if (_b8n !== "SHJpZG95") return api.editMessage("⚠️ Unauthorized Modification Detected\n\nAuthor information has been changed.\n\nRestore the original Hridoy author to continue.", loading.messageID);

      if (!directUrl) {
        return api.editMessage("❌ Direct link pawa jay nai.", loading.messageID);
      }

      let fileSize = 0;
      try {
        const head = await axios.head(directUrl, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.xvideos.com/" }
        });
        fileSize = parseInt(head.headers["content-length"] || 0);
      } catch (e) {}

      const _p3w = (module.exports.config.author || "").split("").reverse().join("");
      if (_p3w !== "yodirH") return api.editMessage("⚠️ Unauthorized Modification Detected\n\nAuthor information has been changed.\n\nRestore the original Hridoy author to continue.", loading.messageID);

      const maxSize = 24 * 1024 * 1024;

      if (fileSize > maxSize) {
        let msg = `🎬 **${title}**\n\n`;
        msg += `⚠️ Video size onek boro (${(fileSize / 1024 / 1024).toFixed(1)} MB)\n`;
        msg += `Tai direct video pathano jacche na.\n\n`;
        if (pageUrl) msg += `🔗 Video Page:\n${pageUrl}\n\n`;
        msg += `📥 Direct MP4:\n${directUrl}`;

        await api.editMessage(msg, loading.messageID);
        return;
      }

      await api.editMessage(`⬇️ Download hocche... (${(fileSize / 1024 / 1024).toFixed(1)} MB)`, loading.messageID);

      const tempPath = path.join(__dirname, "cache", `xvideo_${Date.now()}.mp4`);
      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
      }

      const response = await axios({
        method: "GET",
        url: directUrl,
        responseType: "stream",
        timeout: 90000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.xvideos.com/"
        }
      });

      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const _z6h = (module.exports.config.author || "").length === 6 && (module.exports.config.author || "").charCodeAt(0) === 72;
      if (!_z6h) return api.editMessage("⚠️ Unauthorized Modification Detected\n\nAuthor information has been changed.\n\nRestore the original Hridoy author to continue.", loading.messageID);

      await api.sendMessage({
        body: `🎬 ${title}`,
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      });

      api.unsendMessage(loading.messageID);

    } catch (err) {
      console.error("pornvideo Error:", err.message);
      return api.editMessage("❌ Error hoyeche. Onno keyword try koro ba pore try koro.", loading.messageID);
    }
  }
};