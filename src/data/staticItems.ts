export interface RepeatableTask {
	id: string;
	title: string;
	emoji: string;
	points: number;
	category: 'namoz' | 'uy';
}

export interface UnlockTask {
	id: string;
	title: string;
	emoji: string;
	points: number;
	category: 'iymon' | 'harf' | 'tajvid' | 'farz';
	description?: string;
}

export interface PenaltyPreset {
	id: string;
	title: string;
	emoji: string;
	points: number; // Negative value
	category: 'diniy' | 'uy';
}

export interface RewardPreset {
	id: string;
	title: string;
	emoji: string;
	cost: number;
}

export const REPEATABLE_TASKS: RepeatableTask[] = [
	// 5 vaqt namoz
	{ id: 'namoz-bomdod', title: 'Bomdod namozi', emoji: '🕌', points: 20, category: 'namoz' },
	{ id: 'namoz-peshin', title: 'Peshin namozi', emoji: '🕌', points: 15, category: 'namoz' },
	{ id: 'namoz-asr', title: 'Asr namozi', emoji: '🕌', points: 15, category: 'namoz' },
	{ id: 'namoz-shom', title: 'Shom namozi', emoji: '🕌', points: 15, category: 'namoz' },
	{ id: 'namoz-xufton', title: 'Xufton namozi', emoji: '🕌', points: 20, category: 'namoz' },
	// Uy ishlari
	{ id: 'uy-dish', title: 'Idishlarni yuvish', emoji: '🍽️', points: 10, category: 'uy' },
	{ id: 'uy-yigish', title: 'Uyni yig’ishtirish', emoji: '🧹', points: 15, category: 'uy' },
	{ id: 'uy-kitob', title: 'Kitob o’qish (30 daqiqa)', emoji: '📖', points: 20, category: 'uy' },
	{ id: 'uy-dars', title: 'Vazifalarni bajarish', emoji: '✍️', points: 15, category: 'uy' },
];

export const UNLOCK_TASKS: UnlockTask[] = [
	// 8 ta iymon iborasi
	{ id: 'iymon-1', title: 'Kalimai Toyyiba', emoji: '💎', points: 50, category: 'iymon', description: 'Laa ilaaha illallohu Muhammadur rasululloh.' },
	{ id: 'iymon-2', title: 'Kalimai Shahodat', emoji: '💎', points: 50, category: 'iymon', description: 'Ashhadu alla ilaaha illallohu va ashhadu anna Muhammadan abduhu va rasuluh.' },
	{ id: 'iymon-3', title: 'Kalimai Tavhid', emoji: '💎', points: 50, category: 'iymon', description: 'Ashhadu alla ilaaha illallohu vahdahu laa sharika lah...' },
	{ id: 'iymon-4', title: 'Kalimai Raddi kufr', emoji: '💎', points: 55, category: 'iymon', description: 'Allohumma inni auzu bika min an ushrika bika...' },
	{ id: 'iymon-5', title: 'Kalimai Istigfor', emoji: '💎', points: 50, category: 'iymon', description: 'Astagfirulloh, astagfirulloh mazzunubi...' },
	{ id: 'iymon-6', title: 'Kalimai Tamjid', emoji: '💎', points: 60, category: 'iymon', description: 'Subhanallohi valhamdulillahi va laa ilaaha illallohu...' },
	{ id: 'iymon-7', title: 'Iymoni Mujmal', emoji: '🛡️', points: 50, category: 'iymon', description: 'Amantu billahi kama huva bi asma’ihi va sifatihi...' },
	{ id: 'iymon-8', title: 'Iymoni Mufassal', emoji: '🛡️', points: 60, category: 'iymon', description: 'Amantu billahi va mala’ikatihi va kutubihi va rusulihi...' },

	// 29 ta arab harfi (Alifbo)
	{ id: 'harf-1', title: 'Alif (ا)', emoji: '🅰️', points: 10, category: 'harf' },
	{ id: 'harf-2', title: 'Ba (ب)', emoji: '🎈', points: 10, category: 'harf' },
	{ id: 'harf-3', title: 'Ta (ت)', emoji: '👑', points: 10, category: 'harf' },
	{ id: 'harf-4', title: 'Sa (ث)', emoji: '❄️', points: 10, category: 'harf' },
	{ id: 'harf-5', title: 'Jim (ج)', emoji: '🐫', points: 10, category: 'harf' },
	{ id: 'harf-6', title: 'Ha (ح)', emoji: '🧼', points: 10, category: 'harf' },
	{ id: 'harf-7', title: 'Xo (خ)', emoji: '🍞', points: 10, category: 'harf' },
	{ id: 'harf-8', title: 'Dal (د)', emoji: '🚪', points: 10, category: 'harf' },
	{ id: 'harf-9', title: 'Zal (ذ)', emoji: '🌽', points: 10, category: 'harf' },
	{ id: 'harf-10', title: 'Ro (ر)', emoji: '🚀', points: 10, category: 'harf' },
	{ id: 'harf-11', title: 'Za (ز)', emoji: '🌸', points: 10, category: 'harf' },
	{ id: 'harf-12', title: 'Sin (س)', emoji: '🐟', points: 10, category: 'harf' },
	{ id: 'harf-13', title: 'Shin (ش)', emoji: '☀️', points: 10, category: 'harf' },
	{ id: 'harf-14', title: 'Sod (ص)', emoji: ' صندوق', points: 10, category: 'harf' },
	{ id: 'harf-15', title: 'Dod (ض)', emoji: '🐸', points: 10, category: 'harf' },
	{ id: 'harf-16', title: 'To (ط)', emoji: '✈️', points: 10, category: 'harf' },
	{ id: 'harf-17', title: 'Zo (ظ)', emoji: '✉️', points: 10, category: 'harf' },
	{ id: 'harf-18', title: 'Ayn (ع)', emoji: '🍇', points: 10, category: 'harf' },
	{ id: 'harf-19', title: 'Gayn (غ)', emoji: '☁️', points: 10, category: 'harf' },
	{ id: 'harf-20', title: 'Fa (ف)', emoji: '🐘', points: 10, category: 'harf' },
	{ id: 'harf-21', title: 'Qof (ق)', emoji: ' قلم', points: 10, category: 'harf' },
	{ id: 'harf-22', title: 'Kaf (ك)', emoji: '📚', points: 10, category: 'harf' },
	{ id: 'harf-23', title: 'Lam (ل)', emoji: '🍋', points: 10, category: 'harf' },
	{ id: 'harf-24', title: 'Mim (م)', emoji: '🍌', points: 10, category: 'harf' },
	{ id: 'harf-25', title: 'Nun (ن)', emoji: '⭐️', points: 10, category: 'harf' },
	{ id: 'harf-26', title: 'Vav (و)', emoji: '🌹', points: 10, category: 'harf' },
	{ id: 'harf-27', title: 'Ha (هـ)', emoji: '🐈', points: 10, category: 'harf' },
	{ id: 'harf-28', title: 'Lam-Alif (لا)', emoji: '🎗️', points: 10, category: 'harf' },
	{ id: 'harf-29', title: 'Ya (ي)', emoji: '🤝', points: 10, category: 'harf' },

	// 9 ta tajvid qoidasi
	{ id: 'tajvid-1', title: 'Izhor qoidasi', emoji: '🗣️', points: 30, category: 'tajvid', description: 'Nun va tanvindan keyin tomoq harflari kelsa aniq o’qiladi.' },
	{ id: 'tajvid-2', title: 'Idgom qoidasi', emoji: '🌀', points: 30, category: 'tajvid', description: 'Yarmaluna harflari kelsa, harflar bir-biriga qo’shib o’qiladi.' },
	{ id: 'tajvid-3', title: 'Iqlob qoidasi', emoji: '🔄', points: 30, category: 'tajvid', description: 'Nun va tanvindan keyin Ba harfi kelsa, Mim harfiga aylanadi.' },
	{ id: 'tajvid-4', title: 'Ixfo qoidasi', emoji: '🤫', points: 35, category: 'tajvid', description: 'Qolgan 15 harf kelsa, tovush dimog’da yashirib o’qiladi.' },
	{ id: 'tajvid-5', title: 'Qalqala qoidasi', emoji: '🔔', points: 30, category: 'tajvid', description: 'Qutbu jaddin harflari sukunli bo’lsa, tebratib o’qiladi.' },
	{ id: 'tajvid-6', title: 'G’unna qoidasi', emoji: '🎵', points: 30, category: 'tajvid', description: 'Mim va Nun harflari shaddali kelsa, dimog’da ushlanadi.' },
	{ id: 'tajvid-7', title: 'Lafzi Jalola (Alloh)', emoji: '☝️', points: 30, category: 'tajvid', description: 'Zammali yoki fathali harfdan keyin kelsa yo’g’on, kasrali bo’lsa ingichka o’qiladi.' },
	{ id: 'tajvid-8', title: 'Mad qoidalari', emoji: '〰️', points: 40, category: 'tajvid', description: 'Cho’ziq unlilar (Alif, Vav, Ya) kelsa tovush cho’ziladi.' },
	{ id: 'tajvid-9', title: 'Vaqf qoidalari', emoji: '🛑', points: 30, category: 'tajvid', description: 'Sura oxirida yoki to’xtash belgilarida to’g’ri to’xtash qoidalari.' },

	// 40 Farz
	{ id: 'farz-40', title: '40 Farzni yodlash', emoji: '📖', points: 100, category: 'farz', description: 'Islomda 5 farz, Iymonda 7 farz, Tahoratda 4 farz, G’uslda 3 farz, Tayammumda 4 farz, Namozda 12 farz, Shuningdek boshqa farzlar.' },
];

export const PENALTIES: PenaltyPreset[] = [
	// Diniy jazolar
	{ id: 'jazo-namoz-kech', title: 'Namozni kechiktirish', emoji: '⏰', points: -15, category: 'diniy' },
	{ id: 'jazo-yomon-soz', title: 'Yomon so’z aytish', emoji: '🤬', points: -25, category: 'diniy' },
	{ id: 'jazo-yolgon', title: 'Yolg’on gapirish', emoji: '🤥', points: -30, category: 'diniy' },
	// Uy jazolari
	{ id: 'jazo-tartibsiz', title: 'Xonani tartibsiz qoldirish', emoji: '🧦', points: -10, category: 'uy' },
	{ id: 'jazo-uyqu-kech', title: 'Vaqtida uxlamaslik', emoji: '🦉', points: -15, category: 'uy' },
	{ id: 'jazo-tel-kop', title: 'Telefonni me’yoridan ko’p o’ynash', emoji: '📱', points: -20, category: 'uy' },
];

export const STANDARD_REWARDS: RewardPreset[] = [
	{ id: 'mukofot-kiyim', title: 'Yangi kiyim-kechak', emoji: '👕', cost: 120 },
	{ id: 'mukofot-sayohat', title: 'Oilaviy sayohat', emoji: '✈️', cost: 600 },
	{ id: 'mukofot-oyinchoq', title: 'Yangi o’yinchoq', emoji: '🧸', cost: 150 },
	{ id: 'mukofot-shirinlik', title: 'Yoqtirgan shirinligi', emoji: '🍫', cost: 30 },
	{ id: 'mukofot-park', title: 'Ko’ngilochar parkka borish', emoji: '🎡', cost: 90 },
	{ id: 'mukofot-muzqaymoq', title: 'Muzqaymoq yeyish', emoji: '🍦', cost: 20 },
];
