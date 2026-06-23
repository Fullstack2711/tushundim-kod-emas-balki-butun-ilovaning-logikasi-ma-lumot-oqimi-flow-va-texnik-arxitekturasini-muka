export interface Question {
	id: string;
	question: string;
	options: string[];
	answerIndex: number;
}

export interface QuizTopic {
	id: string;
	title: string;
	emoji: string;
	questions: Question[];
}

export const QUIZ_TOPICS: QuizTopic[] = [
	{
		id: 'iymon',
		title: 'Iymon va Aqiyda',
		emoji: '💎',
		questions: [
			{
				id: 'iy-1',
				question: 'Kalimai Toyyibaning ma’nosi nima?',
				options: [
					'Allohdan o’zga iloh yo’q, Muhammad uning rasulidir',
					'Allohga hamdlar bo’lsin',
					'G’azabdan saqlanish duosi',
					'Tavba qilish kalimasi'
				],
				answerIndex: 0,
			},
			{
				id: 'iy-2',
				question: 'Iymonning nechta ustuni (farzi) bor?',
				options: ['5 ta', '7 ta', '3 ta', '40 ta'],
				answerIndex: 1, // 7 ta ustun (Allohga, farishtalarga, kitoblarga, payg'ambarlarga, oxiratga, taqdirga, qayta tirilishga ishonish)
			},
			{
				id: 'iy-3',
				question: 'Farishtalar nimadan yaratilgan?',
				options: ['Tuproqdan', 'Olovdan', 'Nordan (nurdan)', 'Suvdan'],
				answerIndex: 2,
			},
			{
				id: 'iy-4',
				question: 'Quyidagilardan qaysi biri samoviy kitob emas?',
				options: ['Tavrot', 'Injil', 'Hadis', 'Zabur'],
				answerIndex: 2,
			},
			{
				id: 'iy-5',
				question: 'Payg’ambarlar ichida "Abul-bashar" (insoniyat otasi) unvoni kimga berilgan?',
				options: ['Nuh alayhissalom', 'Odam alayhissalom', 'Ibrohim alayhissalom', 'Muhammad sollallohu alayhi vasallam'],
				answerIndex: 1,
			}
		],
	},
	{
		id: 'namoz',
		title: 'Namoz va Tahorat',
		emoji: '🕌',
		questions: [
			{
				id: 'nz-1',
				question: 'Bir kecha-kunduzda necha vaqt namoz farz qilingan?',
				options: ['3 vaqt', '5 vaqt', '4 vaqt', '7 vaqt'],
				answerIndex: 1,
			},
			{
				id: 'nz-2',
				question: 'Tahoratning farzlari nechta?',
				options: ['3 ta', '4 vaqt', '4 ta', '6 ta'],
				answerIndex: 2, // 4 farz (Yuzni yuvish, qo'llarni chanoq bilan qo'shib yuvish, boshga masx tortish, oyoqlarni to'piq bilan yuvish)
			},
			{
				id: 'nz-3',
				question: 'Bomdod namozi necha rakatdan iborat?',
				options: ['2 rakat sunnat, 2 rakat farz', '4 rakat farz', '3 rakat farz', '2 rakat farz, 4 rakat sunnat'],
				answerIndex: 0,
			},
			{
				id: 'nz-4',
				question: 'Namozning kaliti nima hisoblanadi?',
				options: ['Sajda', 'Tahorat (poklik)', 'Ruku', 'Duolar'],
				answerIndex: 1,
			},
			{
				id: 'nz-5',
				question: 'Qaysi namozda ruku va sajda qilinmaydi?',
				options: ['Vitr namozi', 'Janoza namozi', 'Iyd namozi', 'Xufton namozi'],
				answerIndex: 1,
			}
		],
	},
	{
		id: 'tajvid',
		title: 'Tajvid va Qur’on',
		emoji: '📖',
		questions: [
			{
				id: 'tj-1',
				question: 'Qur’oni Karimda nechta sura bor?',
				options: ['114 ta', '110 ta', '120 ta', '99 ta'],
				answerIndex: 0,
			},
			{
				id: 'tj-2',
				question: 'Qalqala harflari nechta?',
				options: ['3 ta', '5 ta (Qof, To, Ba, Jim, Dal)', '6 ta', '10 ta'],
				answerIndex: 1,
			},
			{
				id: 'tj-3',
				question: 'Qur’on suralari qayerda nozil bo’lgan?',
				options: ['Faqat Madinada', 'Faqat Makkada', 'Makka va Madinada', 'Shomda'],
				answerIndex: 2,
			},
			{
				id: 'tj-4',
				question: 'Eng birinchi nozil bo’lgan sura qaysi?',
				options: ['Fotiha surasi', 'Ixlos surasi', 'Alaq surasining avvalgi 5 oyati', 'Nasr surasi'],
				answerIndex: 2,
			},
			{
				id: 'tj-5',
				question: 'Qur’onni tajvid bilan chiroyli o’qishning hukmi nima?',
				options: ['Farz / Mustahab', 'Makruh', 'Muboh', 'Harom'],
				answerIndex: 0,
			}
		],
	}
];
