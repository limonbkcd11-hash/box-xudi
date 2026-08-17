const moment = require("moment-timezone");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "prayerTimer",
  version: "2.0",
  role: 0,
  author: "Hridoy", // ক্রেডিট চেঞ্জ করলে ফাইল অফ হয়ে যাবে
  description: "নামাজ টাইমে ভিডিও + Random Dua সহ মেসেজ যাবে (Auto-updated Dhaka prayer times)",
  category: "Utility",
  countDown: 5,
};

// 🔐 Credit Protection
if (module.exports.config.author !== "Hridoy") {
  console.log("❌ Credit changed! File stopped.");
  return;
}

module.exports.onLoad = async function ({ api }) {

  // ঢাকার কো-অর্ডিনেট (auto time আনার জন্য ব্যবহার হবে)
  const LAT = 23.8103;
  const LON = 90.4125;
  const METHOD = 1; // Bangladesh এ সাধারণত University of Islamic Sciences, Karachi (method=1) ব্যবহার হয়

  const prayerLabels = {
    Fajr: "🕌 ফজরের নামাজের সময় হয়েছে",
    Dhuhr: "🕌 যোহরের নামাজের সময় হয়েছে",
    Asr: "🕌 আসরের নামাজের সময় হয়েছে",
    Maghrib: "🕌 মাগরিবের নামাজের সময় হয়েছে",
    Isha: "🕌 এশার নামাজের সময় হয়েছে"
  };

  const jummahLabel = "🕌 জুম্মার নামাজের সময় হয়েছে (Friday)";

  const duas = [
    "🤲 اللّهُمَّ اغْفِرْ لِي وَارْحَمْنِي\nহে আল্লাহ, আমাকে ক্ষমা করুন ও দয়া করুন",
    "🤲 رَبِّ زِدْنِي عِلْمًا\nহে আমার রব, আমার জ্ঞান বৃদ্ধি করুন",
    "🤲 اللّهُمَّ اهْدِنِي الصِّرَاطَ الْمُسْتَقِيمَ\nহে আল্লাহ, আমাকে সরল পথে পরিচালিত করুন",
    "🤲 رَبَّنَا تَقَبَّلْ مِنَّا\nহে আমাদের রব, আমাদের আমল কবুল করুন",
    "🤲 اللّهُمَّ ارْزُقْنِي حَلَالًا طَيِّبًا\nহে আল্লাহ, আমাকে হালাল রিযিক দান করুন"
  ];

  // প্রতিদিনের namaz time cache করে রাখা হবে এখানে
  let cachedDate = null;      // "DD-MM-YYYY"
  let cachedTimes = {};       // { Fajr: "05:03", Dhuhr: "12:10", ... } -> 24hr "HH:mm"
  let sentToday = {};         // spam বন্ধ করার জন্য - { "DD-MM-YYYY_Fajr": true }

  console.log("🕌 Prayer Timer Loaded with Auto Time Update...");

  // 🌐 প্রতিদিন ঢাকার সঠিক নামাজের সময় fetch করে
  const fetchTodayPrayerTimes = async () => {
    const today = moment().tz("Asia/Dhaka").format("DD-MM-YYYY");

    if (cachedDate === today) return; // আজকের time আগেই আনা হয়ে গেছে, আবার লাগবে না

    try {
      const url = `https://api.aladhan.com/v1/timings?latitude=${LAT}&longitude=${LON}&method=${METHOD}`;
      const res = await axios.get(url, { timeout: 10000 });
      const t = res.data.data.timings;

      cachedTimes = {
        Fajr: t.Fajr,
        Dhuhr: t.Dhuhr,
        Asr: t.Asr,
        Maghrib: t.Maghrib,
        Isha: t.Isha
      };
      cachedDate = today;
      sentToday = {}; // নতুন দিন শুরু হলে sent flag reset

      console.log(`✅ ${today} এর নামাজের সময় আপডেট হলো:`, cachedTimes);
    } catch (err) {
      console.error("❌ Prayer time fetch করতে সমস্যা হয়েছে:", err.message);
      // fetch fail হলে পুরনো cachedTimes (যদি থাকে) দিয়েই কাজ চলবে
    }
  };

  const checkPrayer = async () => {
    await fetchTodayPrayerTimes();
    if (!cachedDate || Object.keys(cachedTimes).length === 0) return;

    const nowStr = moment().tz("Asia/Dhaka").format("HH:mm");
    const today = cachedDate;
    const isFriday = moment().tz("Asia/Dhaka").day() === 5; // 5 = শুক্রবার

    for (const [prayerName, prayerTime] of Object.entries(cachedTimes)) {
      // শুক্রবার হলে যোহরের বদলে জুম্মা মেসেজ যাবে (একই সময়, একই key তাই দুইবার যাবে না)
      const isJummahSlot = isFriday && prayerName === "Dhuhr";
      const key = `${today}_${prayerName}`;

      if (prayerTime === nowStr && !sentToday[key]) {
        sentToday[key] = true; // ✅ একবার সেন্ড হলে আর স্প্যাম হবে না, সারাদিনে একবারই যাবে

        const timeNow = moment().tz("Asia/Dhaka").format("hh:mm A");
        const dateNow = moment().tz("Asia/Dhaka").format("DD-MM-YYYY");
        const randomDua = duas[Math.floor(Math.random() * duas.length)];
        const label = isJummahSlot ? jummahLabel : prayerLabels[prayerName];

        const finalMsg =
`━━━━━━━━━━━━━━━━━━
${label}
🕒 সময়: ${timeNow}
📅 তারিখ: ${dateNow}
━━━━━━━━━━━━━━━━━━

📿 দোয়া:
${randomDua}

◢◤━━━━━━━━━━━━━━━━◥◣
🤖 ʙᴏᴛ ᴏᴡɴᴇʀ:-ᴋᴀᴋᴀsʜɪ
🤲 সবাই নামাজ আদায় করুন
◥◣━━━━━━━━━━━━━━━━◢◤`;

        try {
          const allThreads = await api.getThreadList(100, null, ["INBOX"]);
          const groupThreads = allThreads.filter(t => t.isGroup);

          const cacheDir = path.join(__dirname, "cache");
          const filePath = path.join(cacheDir, "azan.mp4");

          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
          }

          if (!fs.existsSync(filePath)) {
            const res = await axios({
              url: "https://files.catbox.moe/gr8zqw.mp4",
              method: "GET",
              responseType: "stream"
            });

            await new Promise((resolve, reject) => {
              const writer = fs.createWriteStream(filePath);
              res.data.pipe(writer);
              writer.on("finish", resolve);
              writer.on("error", reject);
            });
          }

          for (const thread of groupThreads) {
            try {
              await api.sendMessage({
                body: finalMsg,
                attachment: fs.createReadStream(filePath)
              }, thread.threadID);
            } catch (sendErr) {
              console.error(`❌ ${thread.threadID} তে পাঠাতে সমস্যা:`, sendErr.message);
            }
          }

          console.log(`✅ ${prayerName} এর নামাজ + দোয়া + আজান পাঠানো হয়েছে`);
        } catch (err) {
          console.error("❌ Prayer Timer Error:", err.message);
        }
      }
    }
  };

  // প্রতি ৩০ সেকেন্ডে চেক করবে, exact minute miss হলেও সমস্যা হবে না
  setInterval(checkPrayer, 30000);
  checkPrayer(); // বট লোড হওয়ার সাথে সাথে একবার cache/time load করে নেবে
};

module.exports.onStart = () => {};
