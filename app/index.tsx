import React, { useState, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Pressable,
	TextInput,
	Modal,
	ActivityIndicator,
	TouchableOpacity,
	SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AuthGate } from '@/components/AuthGate';
import { SignOutButton } from '@/components/SignOutButton';
import { colors, spacing } from '@/theme';
import {
	Plus,
	Trash2,
	Calendar,
	Trophy,
	Award,
	BookOpen,
	AlertTriangle,
	CheckCircle,
	Flame,
	Gift,
	Star,
	ChevronDown,
	ChevronUp,
	Clock,
	User,
	UserPlus,
	Check,
	X,
	ShieldAlert,
	Sparkles,
} from 'lucide-react-native';
import {
	REPEATABLE_TASKS,
	UNLOCK_TASKS,
	PENALTIES,
	STANDARD_REWARDS,
	RewardPreset,
} from '../src/data/staticItems';
import { QUIZ_TOPICS, QuizTopic } from '../src/data/quizQuestions';

export default function HomeScreen() {
	return (
		<AuthGate>
			<KidsPointsApp />
		</AuthGate>
	);
}

function KidsPointsApp() {
	// 1. Data Fetching
	const children = useQuery(api.kids.listChildren);
	const seedDefaultChildrenMutation = useMutation(api.kids.seedDefaultChildren);
	const createChildMutation = useMutation(api.kids.createChild);
	const deleteChildMutation = useMutation(api.kids.deleteChild);
	const recordActionMutation = useMutation(api.kids.recordAction);
	const addCustomItemMutation = useMutation(api.kids.addCustomItem);
	const deleteCustomItemMutation = useMutation(api.kids.deleteCustomItem);

	// 2. State Management
	const [activeChildId, setActiveChildId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'tasks' | 'oneoff' | 'tests' | 'rewards' | 'logs'>('tasks');

	// Active Child object
	const activeChild = useMemo(() => {
		if (!children || children.length === 0) return null;
		if (!activeChildId) return children[0];
		return children.find((c) => c._id === activeChildId) || children[0];
	}, [children, activeChildId]);

	// Auto-seed and Set initial child id
	useEffect(() => {
		if (children) {
			if (children.length === 0) {
				seedDefaultChildrenMutation();
			} else if (!activeChildId) {
				setActiveChildId(children[0]._id);
			}
		}
	}, [children, activeChildId]);

	// Logs and Custom Items Queries for the active child
	const dailyLogsGrouped = useQuery(
		api.kids.getDailyLogs,
		activeChild ? { childId: activeChild._id as any } : 'skip'
	);
	const customItems = useQuery(
		api.kids.getCustomItems,
		activeChild ? { childId: activeChild._id as any } : 'skip'
	);

	// Accordion open/collapsed states for logs tab (key: dateStr, value: boolean)
	const [expandedLogs, setExpandedLogs] = useState<{ [key: string]: boolean }>({});

	// Child creation modal
	const [addChildModalVisible, setAddChildModalVisible] = useState(false);
	const [newChildName, setNewChildName] = useState('');
	const [newChildEmoji, setNewChildEmoji] = useState('👦');

	// Custom item (task/penalty/reward) creation modal
	const [customItemModalVisible, setCustomItemModalVisible] = useState(false);
	const [customItemType, setCustomItemType] = useState<'task' | 'penalty' | 'reward'>('task');
	const [customTitle, setCustomTitle] = useState('');
	const [customValue, setCustomValue] = useState('10');
	const [customEmoji, setCustomEmoji] = useState('✨');

	// Claim reward confirmation modal
	const [claimConfirmVisible, setClaimConfirmVisible] = useState(false);
	const [selectedReward, setSelectedReward] = useState<{ id: string; title: string; cost: number; emoji: string } | null>(null);

	// Sub-tabs for "One-off" Tab
	const [oneoffSubTab, setOneoffSubTab] = useState<'iymon' | 'harf' | 'tajvid' | 'farz'>('iymon');

	// Quiz / Tests tab state
	const [selectedQuizTopic, setSelectedQuizTopic] = useState<QuizTopic | null>(null);
	const [quizStarted, setQuizStarted] = useState(false);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
	const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
	const [quizCompletedResult, setQuizCompletedResult] = useState<{
		percent: number;
		points: number;
		message: string;
	} | null>(null);

	// Toast / Feedback notification
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

	// Trigger toast message
	const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
		setToast({ message, type });
		setTimeout(() => {
			setToast(null);
		}, 3500);
	};

	// Local helper to format Date to "YYYY-MM-DD"
	const getLocalDateString = (d: Date = new Date()) => {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Date format utilities for headers
	const formatHeaderDate = (dateStr: string) => {
		const today = getLocalDateString();
		const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
		if (dateStr === today) return 'Bugun';
		if (dateStr === yesterday) return 'Kecha';

		// Otherwise parse and render beautifully
		try {
			const parts = dateStr.split('-');
			const months = [
				'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
				'Ilyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
			];
			const dayNum = parseInt(parts[2], 10);
			const monthName = months[parseInt(parts[1], 10) - 1];
			return `${dayNum}-${monthName}, ${parts[0]}-yil`;
		} catch (e) {
			return dateStr;
		}
	};

	// 3. STATS CALCULATIONS (Section 7 derived state)
	const stats = useMemo(() => {
		if (!dailyLogsGrouped) return { today: 0, weekly: 0 };

		const todayStr = getLocalDateString();

		// Start of week (Sunday)
		const d = new Date();
		const day = d.getDay(); // 0 Sunday, 1 Monday...
		const diff = d.getDate() - day; // Go back to Sunday
		const sunday = new Date(d.setDate(diff));
		const sundayStr = getLocalDateString(sunday);

		let todaySum = 0;
		let weeklySum = 0;

		dailyLogsGrouped.forEach((group) => {
			const { dateStr, logs } = group;

			logs.forEach((log) => {
				// Only sum positive points for active reinforcement indicators
				if (log.value > 0) {
					if (dateStr === todayStr) {
						todaySum += log.value;
					}
					if (dateStr >= sundayStr) {
						weeklySum += log.value;
					}
				}
			});
		});

		return {
			today: todaySum,
			weekly: weeklySum,
		};
	}, [dailyLogsGrouped]);

	// 4. ACTION CONTROLLERS (Section 4 & 5 repeatable counters)
	const repeatableCounters = useMemo(() => {
		const counters: { [key: string]: number } = {};
		if (!dailyLogsGrouped) return counters;

		const todayStr = getLocalDateString();
		const todayGroup = dailyLogsGrouped.find((g) => g.dateStr === todayStr);

		if (todayGroup) {
			todayGroup.logs.forEach((log) => {
				counters[log.entryId] = (counters[log.entryId] || 0) + 1;
			});
		}

		return counters;
	}, [dailyLogsGrouped]);

	// Unified handler for committing transactions
	const handleActionCommit = async (
		entryId: string,
		title: string,
		value: number,
		isUnlock = false,
		isClaim = false
	) => {
		if (!activeChild) {
			showToast('Iltimos, avval bolani tanlang', 'error');
			return;
		}

		try {
			const res = await recordActionMutation({
				childId: activeChild._id as any,
				entryId,
				title,
				value,
				dateStr: getLocalDateString(),
				isUnlock,
				isClaim,
			});

			if (res.success) {
				showToast(res.message || 'Muvaffaqiyatli saqlandi! 🎉', value >= 0 ? 'success' : 'error');
			} else {
				showToast(res.message || 'Xatolik yuz berdi', 'error');
			}
		} catch (err: any) {
			console.error(err);
			showToast(err.message || 'Tranzaksiya muvaffaqiyatsiz bo’ldi', 'error');
		}
	};

	// Create new child profile
	const handleCreateChild = async () => {
		if (!newChildName.trim()) {
			showToast('Iltimos, ism kiriting', 'error');
			return;
		}

		try {
			const kid = await createChildMutation({
				name: newChildName.trim(),
				emoji: newChildEmoji,
			});
			if (kid) {
				setActiveChildId(kid._id);
				showToast(`Yangi profil yaratildi: ${kid.name} 🎉`);
				setNewChildName('');
				setAddChildModalVisible(false);
			}
		} catch (err: any) {
			showToast(err.message || 'Xatolik', 'error');
		}
	};

	// Delete child profile
	const handleDeleteChild = async (childId: string, name: string) => {
		try {
			await deleteChildMutation({ childId: childId as any });
			showToast(`${name} profili muvaffaqiyatli o’chirildi`);
			if (activeChildId === childId) {
				setActiveChildId(null);
			}
		} catch (err: any) {
			showToast(err.message || 'Profilni o’chirishda xatolik', 'error');
		}
	};

	// Add custom task, penalty, or reward (Section 9)
	const handleAddCustomItem = async () => {
		if (!activeChild) return;
		if (!customTitle.trim()) {
			showToast('Iltimos, nomini kiriting', 'error');
			return;
		}

		const numVal = parseInt(customValue, 10);
		if (isNaN(numVal) || numVal === 0) {
			showToast('Iltimos, to’g’ri ball miqdorini kiriting', 'error');
			return;
		}

		// Penalties are always negative!
		const pointsValue = customItemType === 'penalty' ? -Math.abs(numVal) : Math.abs(numVal);

		try {
			await addCustomItemMutation({
				childId: activeChild._id as any,
				type: customItemType,
				title: customTitle.trim(),
				value: pointsValue,
				emoji: customEmoji,
			});

			showToast('Yangi element qo’shildi! 🌟');
			setCustomTitle('');
			setCustomValue('10');
			setCustomItemModalVisible(false);
		} catch (err: any) {
			showToast(err.message || 'Element qo’shib bo’lmadi', 'error');
		}
	};

	// Delete custom parent item
	const handleDeleteCustomItem = async (itemId: string) => {
		try {
			await deleteCustomItemMutation({ itemId: itemId as any });
			showToast('Element o’chirildi');
		} catch (err: any) {
			showToast('Xatolik', 'error');
		}
	};

	// Claim reward flow (Section 8)
	const initiateClaimReward = (reward: { id: string; title: string; cost: number; emoji: string }) => {
		if (!activeChild) return;

		// Validation checks
		if (activeChild.claimed?.includes(reward.id)) {
			showToast('Bu mukofot allaqachon olingan! 🎁', 'info');
			return;
		}

		if (activeChild.score < reward.cost) {
			showToast(`Ballar yetarli emas! Sarlavhadagi ${reward.cost} ball kerak. 😢`, 'error');
			return;
		}

		setSelectedReward(reward);
		setClaimConfirmVisible(true);
	};

	const confirmClaimReward = async () => {
		if (!activeChild || !selectedReward) return;

		setClaimConfirmVisible(false);
		await handleActionCommit(
			selectedReward.id,
			`Mukofot: ${selectedReward.title}`,
			-selectedReward.cost,
			false, // isUnlock
			true // isClaim
		);
		setSelectedReward(null);
	};

	// Interactive test solving (Section 9)
	const startQuiz = (topic: QuizTopic) => {
		setSelectedQuizTopic(topic);
		setQuizStarted(true);
		setCurrentQuestionIndex(0);
		setSelectedOptionIndex(null);
		setCorrectAnswersCount(0);
		setQuizCompletedResult(null);
	};

	const handleOptionSelect = (index: number) => {
		setSelectedOptionIndex(index);
	};

	const handleNextQuestion = () => {
		if (!selectedQuizTopic || selectedOptionIndex === null) return;

		const currentQuestion = selectedQuizTopic.questions[currentQuestionIndex];
		const isCorrect = selectedOptionIndex === currentQuestion.answerIndex;

		if (isCorrect) {
			setCorrectAnswersCount((prev) => prev + 1);
		}

		const nextIndex = currentQuestionIndex + 1;
		if (nextIndex < selectedQuizTopic.questions.length) {
			setCurrentQuestionIndex(nextIndex);
			setSelectedOptionIndex(null);
		} else {
			// Quiz finished, compute points as per Section 9:
			// - 100% correct = +100 points
			// - 80% to 99% correct = +25 points
			// - < 80% correct = 0 points
			const finalCorrect = isCorrect ? correctAnswersCount + 1 : correctAnswersCount;
			const totalQ = selectedQuizTopic.questions.length;
			const percentage = (finalCorrect / totalQ) * 100;

			let pointsAwarded = 0;
			let msg = '';

			if (percentage === 100) {
				pointsAwarded = 100;
				msg = 'Ajoyib! 100% to’g’ri javob! 🏆 Mukammal natija uchun +100 ball!';
			} else if (percentage >= 80) {
				pointsAwarded = 25;
				msg = 'Yaxshi natija! 80% dan yuqori ball oldingiz! +25 ball!';
			} else {
				pointsAwarded = 0;
				msg = 'Natija 80% dan past. Ball berilmaydi. Yana o’qib qaytadan urinib ko’ring! 📚';
			}

			setQuizCompletedResult({
				percent: Math.round(percentage),
				points: pointsAwarded,
				message: msg,
			});

			if (pointsAwarded > 0 && activeChild) {
				handleActionCommit(
					`test-${selectedQuizTopic.id}-${Date.now()}`,
					`Test: ${selectedQuizTopic.title} (${Math.round(percentage)}%)`,
					pointsAwarded,
					false,
					false
				);
			}
		}
	};

	// Reset test solver
	const quitQuiz = () => {
		setSelectedQuizTopic(null);
		setQuizStarted(false);
		setCurrentQuestionIndex(0);
		setSelectedOptionIndex(null);
		setCorrectAnswersCount(0);
		setQuizCompletedResult(null);
	};

	// Toggle accordion for Log dates
	const toggleLogSection = (dateStr: string) => {
		setExpandedLogs((prev) => ({
			...prev,
			[dateStr]: !prev[dateStr],
		}));
	};

	// Combined list of repeatable tasks (standard + custom tasks)
	const combinedTasks = useMemo(() => {
		const list = [...REPEATABLE_TASKS];
		if (customItems) {
			const customTasks = customItems
				.filter((item) => item.type === 'task')
				.map((item) => ({
					id: item._id,
					title: item.title,
					emoji: item.emoji,
					points: item.value,
					category: 'uy' as const,
					isCustom: true,
				}));
			return [...list, ...customTasks];
		}
		return list;
	}, [customItems]);

	// Combined list of penalties
	const combinedPenalties = useMemo(() => {
		const list = [...PENALTIES];
		if (customItems) {
			const customPenalties = customItems
				.filter((item) => item.type === 'penalty')
				.map((item) => ({
					id: item._id,
					title: item.title,
					emoji: item.emoji,
					points: item.value,
					category: 'uy' as const,
					isCustom: true,
				}));
			return [...list, ...customPenalties];
		}
		return list;
	}, [customItems]);

	// Combined rewards
	const combinedRewards = useMemo(() => {
		const list = [...STANDARD_REWARDS];
		if (customItems) {
			const customRewards = customItems
				.filter((item) => item.type === 'reward')
				.map((item) => ({
					id: item._id,
					title: item.title,
					emoji: item.emoji,
					cost: Math.abs(item.value),
					isCustom: true,
				}));
			return [...list, ...customRewards];
		}
		return list;
	}, [customItems]);

	// Loading placeholder
	if (children === undefined) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={colors.accent} />
				<Text style={styles.loadingText}>Yuklanmoqda...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Kids Points Tizimi',
					headerRight: () => <SignOutButton />,
					headerStyle: { backgroundColor: colors.surface },
					headerShadowVisible: false,
				}}
			/>

			{/* Child profile selector carousel */}
			<View style={styles.kidsSelectorContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kidsScroll}>
					{children.map((kid) => {
						const isActive = activeChild?._id === kid._id;
						return (
							<Pressable
								key={kid._id}
								onPress={() => {
									setActiveChildId(kid._id);
									// reset quiz when changing child
									quitQuiz();
								}}
								style={[styles.kidCard, isActive && styles.kidCardActive]}
							>
								<Text style={styles.kidEmoji}>{kid.emoji}</Text>
								<View style={styles.kidDetails}>
									<Text style={[styles.kidName, isActive && styles.kidNameActive]}>
										{kid.name}
									</Text>
									<Text style={[styles.kidScoreText, isActive && styles.kidScoreTextActive]}>
										★ {kid.score} ball
									</Text>
								</View>
								{isActive && (
									<Pressable
										onPress={() => handleDeleteChild(kid._id, kid.name)}
										style={styles.deleteKidMiniButton}
									>
										<X size={12} color="#ff4d4f" />
									</Pressable>
								)}
							</Pressable>
						);
					})}

					<Pressable onPress={() => setAddChildModalVisible(true)} style={styles.addKidButton}>
						<UserPlus size={18} color={colors.accent} />
						<Text style={styles.addKidButtonText}>Qo’shish</Text>
					</Pressable>
				</ScrollView>
			</View>

			{/* Current Child Information & Statistics Banner */}
			{activeChild ? (
				<View style={styles.bannerContainer}>
					<View style={styles.bannerHeader}>
						<Text style={styles.bannerTitle}>{activeChild.emoji} {activeChild.name} profili</Text>
						<View style={styles.badge}>
							<Star size={14} color="#f59e0b" fill="#f59e0b" />
							<Text style={styles.badgeText}>Faol</Text>
						</View>
					</View>

					<View style={styles.statsRow}>
						{/* Stat 1: Total point score (Section 7) */}
						<View style={styles.statBox}>
							<Text style={styles.statLabel}>Umumiy Ball</Text>
							<Text style={[styles.statValue, { color: colors.accent }]}>
								{Math.max(0, activeChild.score)}
							</Text>
							<View style={[styles.statBadge, { backgroundColor: '#eff6ff' }]}>
								<Trophy size={11} color={colors.accent} />
								<Text style={[styles.statBadgeText, { color: colors.accent }]}>To’plangan</Text>
							</View>
						</View>

						{/* Stat 2: Today positive sum */}
						<View style={styles.statBox}>
							<Text style={styles.statLabel}>Bugungi Ball</Text>
							<Text style={[styles.statValue, { color: '#10b981' }]}>
								+{stats.today}
							</Text>
							<View style={[styles.statBadge, { backgroundColor: '#ecfdf5' }]}>
								<Flame size={11} color="#10b981" />
								<Text style={[styles.statBadgeText, { color: '#10b981' }]}>Bugun</Text>
							</View>
						</View>

						{/* Stat 3: Weekly positive sum */}
						<View style={styles.statBox}>
							<Text style={styles.statLabel}>Haftalik Ball</Text>
							<Text style={[styles.statValue, { color: '#f59e0b' }]}>
								+{stats.weekly}
							</Text>
							<View style={[styles.statBadge, { backgroundColor: '#fffbeb' }]}>
								<Calendar size={11} color="#f59e0b" />
								<Text style={[styles.statBadgeText, { color: '#f59e0b' }]}>Hafta</Text>
							</View>
						</View>
					</View>
				</View>
			) : (
				<View style={styles.noChildContainer}>
					<AlertTriangle size={32} color="#f59e0b" />
					<Text style={styles.noChildText}>Iltimos, avval bola profilini yarating!</Text>
				</View>
			)}

			{/* Main Screen Navigation Tabs */}
			<View style={styles.tabsContainer}>
				<Pressable
					onPress={() => setActiveTab('tasks')}
					style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
				>
					<Flame size={18} color={activeTab === 'tasks' ? colors.accent : colors.muted} />
					<Text style={[styles.tabButtonText, activeTab === 'tasks' && styles.tabButtonTextActive]}>
						Vazifalar
					</Text>
				</Pressable>

				<Pressable
					onPress={() => setActiveTab('oneoff')}
					style={[styles.tabButton, activeTab === 'oneoff' && styles.tabButtonActive]}
				>
					<Award size={18} color={activeTab === 'oneoff' ? colors.accent : colors.muted} />
					<Text style={[styles.tabButtonText, activeTab === 'oneoff' && styles.tabButtonTextActive]}>
						Darsliklar
					</Text>
				</Pressable>

				<Pressable
					onPress={() => setActiveTab('tests')}
					style={[styles.tabButton, activeTab === 'tests' && styles.tabButtonActive]}
				>
					<BookOpen size={18} color={activeTab === 'tests' ? colors.accent : colors.muted} />
					<Text style={[styles.tabButtonText, activeTab === 'tests' && styles.tabButtonTextActive]}>
						Testlar
					</Text>
				</Pressable>

				<Pressable
					onPress={() => setActiveTab('rewards')}
					style={[styles.tabButton, activeTab === 'rewards' && styles.tabButtonActive]}
				>
					<Gift size={18} color={activeTab === 'rewards' ? colors.accent : colors.muted} />
					<Text style={[styles.tabButtonText, activeTab === 'rewards' && styles.tabButtonTextActive]}>
						Mukofotlar
					</Text>
				</Pressable>

				<Pressable
					onPress={() => setActiveTab('logs')}
					style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]}
				>
					<Clock size={18} color={activeTab === 'logs' ? colors.accent : colors.muted} />
					<Text style={[styles.tabButtonText, activeTab === 'logs' && styles.tabButtonTextActive]}>
						Jurnal
					</Text>
				</Pressable>
			</View>

			{/* TAB CONTENT AREAS */}
			<ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
				{activeChild && activeTab === 'tasks' && (
					<View style={styles.section}>
						{/* Subheader with Custom Item trigger */}
						<View style={styles.sectionHeaderRow}>
							<View>
								<Text style={styles.sectionTitle}>Kunlik Amallar va Vazifalar</Text>
								<Text style={styles.sectionSubtitle}>Ball qo’shadigan va ayiradigan harakatlar</Text>
							</View>
							<TouchableOpacity
								style={styles.addCustomFab}
								onPress={() => {
									setCustomItemType('task');
									setCustomEmoji('✍️');
									setCustomItemModalVisible(true);
								}}
							>
								<Plus size={16} color="#ffffff" />
								<Text style={styles.addCustomFabText}>Yangi</Text>
							</TouchableOpacity>
						</View>

						{/* Repeatable chores list */}
						<Text style={styles.subCategoryTitle}>✨ Rag’batlantiruvchi Vazifalar</Text>
						<View style={styles.gridContainer}>
							{combinedTasks.map((task) => {
								const todayCount = repeatableCounters[task.id] || 0;
								return (
									<View key={task.id} style={styles.taskCard}>
										<View style={styles.taskHeader}>
											<Text style={styles.taskEmoji}>{task.emoji}</Text>
											{todayCount > 0 && (
												<View style={styles.counterBadge}>
													<Text style={styles.counterBadgeText}>{todayCount}x</Text>
												</View>
											)}
										</View>
										<Text style={styles.taskTitle}>{task.title}</Text>
										<Text style={styles.taskPoints}>+{task.points} ball</Text>

										<View style={styles.cardActionRow}>
											{'isCustom' in task && (
												<TouchableOpacity
													onPress={() => handleDeleteCustomItem(task.id)}
													style={styles.trashMiniButton}
												>
													<Trash2 size={13} color="#99a2b0" />
												</TouchableOpacity>
											)}
											<TouchableOpacity
												onPress={() => handleActionCommit(task.id, task.title, task.points)}
												style={styles.addButton}
											>
												<Plus size={16} color="#ffffff" />
												<Text style={styles.addButtonText}>Bajarildi</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							})}
						</View>

						{/* Penalties List */}
						<View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
							<View>
								<Text style={styles.subCategoryTitle}>⚠️ Qoidabuzarlik va Jazolar</Text>
								<Text style={styles.sectionSubtitle}>Noto’g’ri ishlar uchun ball ayiriladi</Text>
							</View>
							<TouchableOpacity
								style={[styles.addCustomFab, { backgroundColor: '#f59e0b' }]}
								onPress={() => {
									setCustomItemType('penalty');
									setCustomEmoji('⚠️');
									setCustomItemModalVisible(true);
								}}
							>
								<Plus size={16} color="#ffffff" />
								<Text style={styles.addCustomFabText}>Jazo qo’shish</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.gridContainer}>
							{combinedPenalties.map((penalty) => {
								const todayCount = repeatableCounters[penalty.id] || 0;
								return (
									<View key={penalty.id} style={[styles.taskCard, styles.penaltyCard]}>
										<View style={styles.taskHeader}>
											<Text style={styles.taskEmoji}>{penalty.emoji}</Text>
											{todayCount > 0 && (
												<View style={[styles.counterBadge, { backgroundColor: '#fee2e2' }]}>
													<Text style={[styles.counterBadgeText, { color: '#ef4444' }]}>
														{todayCount} marta
													</Text>
												</View>
											)}
										</View>
										<Text style={[styles.taskTitle, styles.penaltyTitle]}>{penalty.title}</Text>
										<Text style={[styles.taskPoints, { color: '#ef4444' }]}>
											{penalty.points} ball
										</Text>

										<View style={styles.cardActionRow}>
											{'isCustom' in penalty && (
												<TouchableOpacity
													onPress={() => handleDeleteCustomItem(penalty.id)}
													style={styles.trashMiniButton}
												>
													<Trash2 size={13} color="#99a2b0" />
												</TouchableOpacity>
											)}
											<TouchableOpacity
												onPress={() => handleActionCommit(penalty.id, penalty.title, penalty.points)}
												style={[styles.addButton, { backgroundColor: '#ef4444' }]}
											>
												<Text style={styles.addButtonText}>Qayd qilish</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							})}
						</View>
					</View>
				)}

				{activeChild && activeTab === 'oneoff' && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Bir martalik darsliklar</Text>
						<Text style={styles.sectionSubtitle}>Faqat bir marta o’rganib ko’p ball to’plang</Text>

						{/* Sub tabs configuration */}
						<View style={styles.subTabsContainer}>
							{(['iymon', 'harf', 'tajvid', 'farz'] as const).map((tab) => {
								const labels = {
									iymon: '💎 Iymon',
									harf: '🅰️ Alifbo',
									tajvid: '📖 Tajvid',
									farz: '🛡️ 40 Farz',
								};
								const isActive = oneoffSubTab === tab;
								return (
									<Pressable
										key={tab}
										onPress={() => setOneoffSubTab(tab)}
										style={[styles.subTabButton, isActive && styles.subTabButtonActive]}
									>
										<Text style={[styles.subTabButtonText, isActive && styles.subTabButtonTextActive]}>
											{labels[tab]}
										</Text>
									</Pressable>
								);
							})}
						</View>

						{/* Sub tab items */}
						<View style={styles.unlocksList}>
							{UNLOCK_TASKS.filter((task) => task.category === oneoffSubTab).map((task) => {
								const isUnlocked = activeChild.unlocked?.includes(task.id);
								return (
									<View
										key={task.id}
										style={[styles.unlockRow, isUnlocked && styles.unlockRowCompleted]}
									>
										<View style={styles.unlockIconCol}>
											<Text style={styles.unlockEmoji}>{task.emoji}</Text>
										</View>

										<View style={styles.unlockContentCol}>
											<Text style={[styles.unlockTitle, isUnlocked && styles.unlockTitleCompleted]}>
												{task.title}
											</Text>
											{task.description && (
												<Text style={styles.unlockDesc}>{task.description}</Text>
											)}
											<Text style={styles.unlockPointsAward}>+{task.points} ball taqdim etiladi</Text>
										</View>

										<View style={styles.unlockActionCol}>
											{isUnlocked ? (
												<View style={styles.completedBadge}>
													<Check size={14} color="#10b981" />
													<Text style={styles.completedBadgeText}>Olingan</Text>
												</View>
											) : (
												<TouchableOpacity
													onPress={() =>
														handleActionCommit(task.id, `O’rganildi: ${task.title}`, task.points, true)
													}
													style={styles.unlockButton}
												>
													<Text style={styles.unlockButtonText}>+{task.points}</Text>
												</TouchableOpacity>
											)}
										</View>
									</View>
								);
							})}
						</View>
					</View>
				)}

				{activeChild && activeTab === 'tests' && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Bilim sinash testlari</Text>
						<Text style={styles.sectionSubtitle}>
							Bosqichli rag’batlantirish tizimi: 100% to’g’ri bo’lsa +100 ball, 80-99% bo’lsa +25 ball!
						</Text>

						{/* Not in quiz mode: select topic */}
						{!quizStarted && !selectedQuizTopic && (
							<View style={styles.quizSelectionGrid}>
								{QUIZ_TOPICS.map((topic) => (
									<View key={topic.id} style={styles.quizTopicCard}>
										<Text style={styles.quizTopicEmoji}>{topic.emoji}</Text>
										<Text style={styles.quizTopicTitle}>{topic.title}</Text>
										<Text style={styles.quizTopicLength}>
											{topic.questions.length} ta savol mavjud
										</Text>
										<TouchableOpacity
											onPress={() => startQuiz(topic)}
											style={styles.startQuizButton}
										>
											<Text style={styles.startQuizButtonText}>Testni Boshlash</Text>
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}

						{/* Quiz solving mode */}
						{quizStarted && selectedQuizTopic && (
							<View style={styles.quizInterfaceCard}>
								<View style={styles.quizInterfaceHeader}>
									<Text style={styles.quizTopicHeaderTitle}>
										{selectedQuizTopic.emoji} {selectedQuizTopic.title} testi
									</Text>
									<TouchableOpacity onPress={quitQuiz} style={styles.quitQuizMiniBtn}>
										<Text style={styles.quitQuizMiniBtnTxt}>Chiqish</Text>
									</TouchableOpacity>
								</View>

								{!quizCompletedResult ? (
									// Current active question
									<View style={styles.quizActiveQuestionBody}>
										<View style={styles.questionProgressRow}>
											<Text style={styles.questionProgressText}>
												Savol {currentQuestionIndex + 1} / {selectedQuizTopic.questions.length}
											</Text>
											<View style={styles.progressBarBg}>
												<View
													style={[
														styles.progressBarFill,
														{
															width: `${
																((currentQuestionIndex + 1) /
																	selectedQuizTopic.questions.length) *
																100
															}%`,
														},
													]}
												/>
											</View>
										</View>

										<Text style={styles.questionText}>
											{selectedQuizTopic.questions[currentQuestionIndex].question}
										</Text>

										<View style={styles.optionsList}>
											{selectedQuizTopic.questions[currentQuestionIndex].options.map(
												(option, idx) => {
													const isSelected = selectedOptionIndex === idx;
													return (
														<Pressable
															key={idx}
															onPress={() => handleOptionSelect(idx)}
															style={[
																styles.optionButton,
																isSelected && styles.optionButtonSelected,
															]}
														>
															<View
																style={[
																	styles.optionBullet,
																	isSelected && styles.optionBulletSelected,
																]}
															>
																{isSelected && (
																	<View style={styles.optionBulletInner} />
																)}
															</View>
															<Text
																style={[
																	styles.optionText,
																	isSelected && styles.optionTextSelected,
																]}
															>
																{option}
															</Text>
														</Pressable>
													);
												}
											)}
										</View>

										<TouchableOpacity
											disabled={selectedOptionIndex === null}
											onPress={handleNextQuestion}
											style={[
												styles.nextQuestionButton,
												selectedOptionIndex === null && styles.nextQuestionButtonDisabled,
											]}
										>
											<Text style={styles.nextQuestionButtonText}>
												{currentQuestionIndex + 1 === selectedQuizTopic.questions.length
													? 'Natijani Ko’rish'
													: 'Keyingi Savol'}
											</Text>
										</TouchableOpacity>
									</View>
								) : (
									// Quiz completed result
									<View style={styles.quizCompletedBody}>
										<View style={styles.trophyIconContainer}>
											<Trophy
												size={48}
												color={quizCompletedResult.points > 0 ? '#f59e0b' : '#99a2b0'}
											/>
										</View>

										<Text style={styles.quizResultPercent}>
											To’g’ri javob: {quizCompletedResult.percent}%
										</Text>

										<Text style={styles.quizResultMessage}>
											{quizCompletedResult.message}
										</Text>

										{quizCompletedResult.points > 0 && (
											<View style={styles.quizRewardBadge}>
												<Sparkles size={16} color="#ffffff" />
												<Text style={styles.quizRewardBadgeText}>
													+{quizCompletedResult.points} ball o’tkazildi!
												</Text>
											</View>
										)}

										<TouchableOpacity onPress={quitQuiz} style={styles.quizBackToListBtn}>
											<Text style={styles.quizBackToListBtnText}>
												Boshqa testlarni yechish
											</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						)}
					</View>
				)}

				{activeChild && activeTab === 'rewards' && (
					<View style={styles.section}>
						{/* Store header with custom reward option */}
						<View style={styles.sectionHeaderRow}>
							<View>
								<Text style={styles.sectionTitle}>Mukofotlar Do’koni</Text>
								<Text style={styles.sectionSubtitle}>Ballarni ajoyib mukofotlarga almashtiring</Text>
							</View>
							<TouchableOpacity
								style={[styles.addCustomFab, { backgroundColor: '#10b981' }]}
								onPress={() => {
									setCustomItemType('reward');
									setCustomEmoji('🎁');
									setCustomItemModalVisible(true);
								}}
							>
								<Plus size={16} color="#ffffff" />
								<Text style={styles.addCustomFabText}>Yangi Mukofot</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.gridContainer}>
							{combinedRewards.map((reward) => {
								const isClaimed = activeChild.claimed?.includes(reward.id);
								const canAfford = activeChild.score >= reward.cost;

								return (
									<View
										key={reward.id}
										style={[
											styles.rewardCard,
											isClaimed && styles.rewardCardClaimed,
											!canAfford && !isClaimed && styles.rewardCardCantAfford,
										]}
									>
										<View style={styles.rewardEmojiContainer}>
											<Text style={styles.rewardEmoji}>{reward.emoji}</Text>
										</View>
										<Text style={styles.rewardTitle}>{reward.title}</Text>
										<Text style={styles.rewardCost}>{reward.cost} ball</Text>

										{isClaimed ? (
											<View style={[styles.claimButton, styles.claimedButtonState]}>
												<Check size={14} color="#596579" />
												<Text style={styles.claimedButtonText}>Olingan ✅</Text>
											</View>
										) : (
											<TouchableOpacity
												disabled={!canAfford}
												onPress={() => initiateClaimReward(reward)}
												style={[
													styles.claimButton,
													canAfford ? styles.claimButtonEnabled : styles.claimButtonDisabled,
												]}
											>
												<Text
													style={[
														styles.claimButtonText,
														canAfford ? styles.claimButtonTextEnabled : styles.claimButtonTextDisabled,
													]}
												>
													Sotib Olish
												</Text>
											</TouchableOpacity>
										)}

										{'isCustom' in reward && (
											<TouchableOpacity
												onPress={() => handleDeleteCustomItem(reward.id)}
												style={styles.deleteRewardMiniButton}
											>
												<Trash2 size={12} color="#ff4d4f" />
											</TouchableOpacity>
										)}
									</View>
								);
							})}
						</View>
					</View>
				)}

				{activeChild && activeTab === 'logs' && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Kundalik Jurnal va Hisobotlar</Text>
						<Text style={styles.sectionSubtitle}>Ballar tarixi va olingan harakatlar hisoboti</Text>

						{/* Grouped Logs lists */}
						{dailyLogsGrouped && dailyLogsGrouped.length > 0 ? (
							<View style={styles.logsGroupContainer}>
								{dailyLogsGrouped.map((day) => {
									const isExpanded = !!expandedLogs[day.dateStr];
									return (
										<View key={day.dateStr} style={styles.dayGroupCard}>
											{/* Day Header row */}
											<Pressable
												onPress={() => toggleLogSection(day.dateStr)}
												style={styles.dayHeaderRow}
											>
												<View style={styles.dayHeaderLeft}>
													<Calendar size={16} color={colors.muted} style={{ marginRight: 6 }} />
													<Text style={styles.dayDateText}>
														{formatHeaderDate(day.dateStr)}
													</Text>
												</View>

												<View style={styles.dayHeaderRight}>
													{/* Sum indicators */}
													{day.positiveSum > 0 && (
														<Text style={styles.sumPositiveText}>+{day.positiveSum}</Text>
													)}
													{day.negativeSum < 0 && (
														<Text style={styles.sumNegativeText}>{day.negativeSum}</Text>
													)}

													{isExpanded ? (
														<ChevronUp size={16} color={colors.muted} />
													) : (
														<ChevronDown size={16} color={colors.muted} />
													)}
												</View>
											</Pressable>

											{/* Expanded items list */}
											{isExpanded && (
												<View style={styles.dayLogsList}>
													{day.logs.map((log) => {
														const isPositive = log.value >= 0;
														const logTime = new Date(log.timestamp).toLocaleTimeString([], {
															hour: '2-digit',
															minute: '2-digit',
														});

														return (
															<View key={log._id} style={styles.logItemRow}>
																<View style={styles.logLeftCol}>
																	<View
																		style={[
																			styles.indicatorDot,
																			{
																				backgroundColor: isPositive
																					? '#e6f4ea'
																					: '#fce8e6',
																			},
																		]}
																	>
																		<View
																			style={[
																				styles.indicatorDotInner,
																				{
																					backgroundColor: isPositive
																						? '#137333'
																						: '#c5221f',
																				},
																			]}
																		/>
																	</View>
																	<View>
																		<Text style={styles.logTitleText}>{log.title}</Text>
																		<View style={styles.logTimeRow}>
																			<Clock size={10} color={colors.muted} />
																			<Text style={styles.logTimeText}>{logTime}</Text>
																		</View>
																	</View>
																</View>

																<Text
																	style={[
																		styles.logValueText,
																		{ color: isPositive ? '#137333' : '#c5221f' },
																	]}
																>
																	{isPositive ? `+${log.value}` : log.value} ball
																</Text>
															</View>
														);
													})}
												</View>
											)}
										</View>
									);
								})}
							</View>
						) : (
							<View style={styles.emptyHistoryState}>
								<Clock size={40} color="#cbd5e1" />
								<Text style={styles.emptyHistoryText}>
									Hali hech qanday harakatlar tarixi mavjud emas.
								</Text>
							</View>
						)}
					</View>
				)}
			</ScrollView>

			{/* FLOATING SUCCESS/WARNING TOAST */}
			{toast && (
				<View
					style={[
						styles.toastContainer,
						toast.type === 'error' && styles.toastError,
						toast.type === 'info' && styles.toastInfo,
					]}
				>
					<Sparkles size={16} color="#ffffff" style={{ marginRight: spacing.sm }} />
					<Text style={styles.toastText}>{toast.message}</Text>
				</View>
			)}

			{/* MODAL: ADD CHILD */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={addChildModalVisible}
				onRequestClose={() => setAddChildModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Yangi bola qo’shish</Text>
							<TouchableOpacity onPress={() => setAddChildModalVisible(false)}>
								<X size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							<Text style={styles.inputLabel}>Bolaning Ismi</Text>
							<TextInput
								style={styles.textInput}
								placeholder="Ismini kiriting (Masalan: Solih)"
								value={newChildName}
								onChangeText={setNewChildName}
							/>

							<Text style={styles.inputLabel}>Avatarni Tanlang (Emoji)</Text>
							<View style={styles.emojiSelectorContainer}>
								{['👦', '👧', '👶', '🦸', '🦁', '🦉', '🦕', '🌸'].map((emoji) => {
									const isSelected = newChildEmoji === emoji;
									return (
										<TouchableOpacity
											key={emoji}
											onPress={() => setNewChildEmoji(emoji)}
											style={[
												styles.emojiButton,
												isSelected && styles.emojiButtonSelected,
											]}
										>
											<Text style={styles.emojiButtonText}>{emoji}</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnCancel]}
								onPress={() => setAddChildModalVisible(false)}
							>
								<Text style={styles.modalBtnCancelText}>Bekor qilish</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnSubmit]}
								onPress={handleCreateChild}
							>
								<Text style={styles.modalBtnSubmitText}>Yaratish</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* MODAL: ADD CUSTOM TASK, PENALTY, OR REWARD (Section 9) */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={customItemModalVisible}
				onRequestClose={() => setCustomItemModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{customItemType === 'task'
									? 'Yangi Vazifa Qo’shish'
									: customItemType === 'penalty'
										? 'Yangi Jazo Turi'
										: 'Yangi Mukofot Qo’shish'}
							</Text>
							<TouchableOpacity onPress={() => setCustomItemModalVisible(false)}>
								<X size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							<Text style={styles.inputLabel}>Nomi</Text>
							<TextInput
								style={styles.textInput}
								placeholder="Nomini kiriting (Masalan: Qur’on tinglash)"
								value={customTitle}
								onChangeText={setCustomTitle}
							/>

							<Text style={styles.inputLabel}>
								{customItemType === 'reward' ? 'Narxi (Ball)' : 'Ball Miqdori'}
							</Text>
							<TextInput
								style={styles.textInput}
								keyboardType="numeric"
								placeholder="Masalan: 15"
								value={customValue}
								onChangeText={setCustomValue}
							/>

							<Text style={styles.inputLabel}>Belgisi (Emoji)</Text>
							<View style={styles.emojiSelectorContainer}>
								{customItemType === 'task'
									? ['✍️', '📖', '🧼', '🌱', '🚀', '🎒'].map((emoji) => (
											<TouchableOpacity
												key={emoji}
												onPress={() => setCustomEmoji(emoji)}
												style={[
													styles.emojiButton,
													customEmoji === emoji && styles.emojiButtonSelected,
												]}
											>
												<Text style={styles.emojiButtonText}>{emoji}</Text>
											</TouchableOpacity>
										))
									: customItemType === 'penalty'
										? ['⚠️', '🤐', '⏰', '📱', '🧦', '🛑'].map((emoji) => (
												<TouchableOpacity
													key={emoji}
													onPress={() => setCustomEmoji(emoji)}
													style={[
														styles.emojiButton,
														customEmoji === emoji && styles.emojiButtonSelected,
													]}
												>
													<Text style={styles.emojiButtonText}>{emoji}</Text>
												</TouchableOpacity>
											))
										: ['🎁', '🧸', '🍦', '🎡', '🍬', '📚'].map((emoji) => (
												<TouchableOpacity
													key={emoji}
													onPress={() => setCustomEmoji(emoji)}
													style={[
														styles.emojiButton,
														customEmoji === emoji && styles.emojiButtonSelected,
													]}
												>
													<Text style={styles.emojiButtonText}>{emoji}</Text>
												</TouchableOpacity>
											))}
							</View>
						</View>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnCancel]}
								onPress={() => setCustomItemModalVisible(false)}
							>
								<Text style={styles.modalBtnCancelText}>Bekor qilish</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnSubmit]}
								onPress={handleAddCustomItem}
							>
								<Text style={styles.modalBtnSubmitText}>Qo’shish</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* MODAL: CLAIM REWARD CONFIRMATION (Section 8 confirmation dialog) */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={claimConfirmVisible}
				onRequestClose={() => setClaimConfirmVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxWidth: 340 }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Mukofotni sotib olish</Text>
							<TouchableOpacity onPress={() => setClaimConfirmVisible(false)}>
								<X size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>

						<View style={[styles.modalBody, { alignItems: 'center', paddingVertical: spacing.lg }]}>
							<Text style={{ fontSize: 48, marginBottom: spacing.sm }}>
								{selectedReward?.emoji}
							</Text>
							<Text style={styles.claimConfirmRewardTitle}>{selectedReward?.title}</Text>
							<Text style={styles.claimConfirmWarning}>
								Bu mukofot jami{' '}
								<Text style={{ color: colors.accent, fontWeight: '700' }}>
									{selectedReward?.cost} ball
								</Text>{' '}
								turadi. Bolaning umumiy ballidan ayirib, sotib olishni tasdiqlaysizmi?
							</Text>
						</View>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnCancel]}
								onPress={() => setClaimConfirmVisible(false)}
							>
								<Text style={styles.modalBtnCancelText}>Bekor qilish</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnSubmit, { backgroundColor: '#10b981' }]}
								onPress={confirmClaimReward}
							>
								<Text style={styles.modalBtnSubmitText}>Tasdiqlash</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f7f8fb',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f7f8fb',
	},
	loadingText: {
		marginTop: spacing.sm,
		fontSize: 15,
		color: colors.muted,
	},
	kidsSelectorContainer: {
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingVertical: spacing.sm,
	},
	kidsScroll: {
		paddingHorizontal: spacing.md,
		alignItems: 'center',
	},
	kidCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f1f5f9',
		borderRadius: 16,
		paddingVertical: 10,
		paddingHorizontal: 14,
		marginRight: spacing.sm,
		borderWidth: 1.5,
		borderColor: 'transparent',
		position: 'relative',
	},
	kidCardActive: {
		backgroundColor: '#eff6ff',
		borderColor: colors.accent,
	},
	kidEmoji: {
		fontSize: 24,
		marginRight: 8,
	},
	kidDetails: {
		justifyContent: 'center',
	},
	kidName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	kidNameActive: {
		color: colors.accent,
	},
	kidScoreText: {
		fontSize: 11,
		color: colors.muted,
		marginTop: 2,
	},
	kidScoreTextActive: {
		color: colors.accent,
		fontWeight: '500',
	},
	deleteKidMiniButton: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: '#ffffff',
		borderRadius: 10,
		width: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#fca5a5',
	},
	addKidButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderColor: colors.accent,
		borderStyle: 'dashed',
		borderRadius: 16,
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: 'transparent',
	},
	addKidButtonText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
		marginLeft: 6,
	},
	bannerContainer: {
		backgroundColor: colors.surface,
		margin: spacing.md,
		padding: spacing.md,
		borderRadius: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 2,
	},
	bannerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	bannerTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef3c7',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	badgeText: {
		fontSize: 10,
		color: '#d97706',
		fontWeight: '600',
		marginLeft: 3,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	statBox: {
		flex: 1,
		backgroundColor: '#f8fafc',
		borderRadius: 14,
		padding: 10,
		alignItems: 'center',
		marginHorizontal: 3,
	},
	statLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	statValue: {
		fontSize: 20,
		fontWeight: '800',
		marginVertical: 4,
	},
	statBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
		marginTop: 2,
	},
	statBadgeText: {
		fontSize: 9,
		fontWeight: '600',
		marginLeft: 3,
	},
	noChildContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
		margin: spacing.md,
		padding: spacing.xl,
		borderRadius: 20,
	},
	noChildText: {
		marginTop: spacing.sm,
		fontSize: 14,
		color: colors.text,
		fontWeight: '600',
	},
	tabsContainer: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		paddingHorizontal: spacing.sm,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		justifyContent: 'space-between',
	},
	tabButton: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 6,
	},
	tabButtonActive: {
		borderBottomWidth: 2,
		borderBottomColor: colors.accent,
	},
	tabButtonText: {
		fontSize: 10,
		color: colors.muted,
		fontWeight: '500',
		marginTop: 4,
	},
	tabButtonTextActive: {
		color: colors.accent,
		fontWeight: '700',
	},
	scrollContent: {
		flex: 1,
	},
	scrollContentInner: {
		paddingBottom: spacing.xxl,
	},
	section: {
		padding: spacing.md,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	sectionSubtitle: {
		fontSize: 12,
		color: colors.muted,
		marginTop: 2,
	},
	subCategoryTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
		marginTop: spacing.md,
		marginBottom: spacing.sm,
	},
	addCustomFab: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.accent,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	addCustomFabText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 4,
	},
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -4,
	},
	taskCard: {
		width: '47%',
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: spacing.md,
		margin: '1.5%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 5,
		elevation: 1,
		justifyContent: 'space-between',
	},
	penaltyCard: {
		borderColor: '#fee2e2',
		borderWidth: 1,
	},
	taskHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.sm,
	},
	taskEmoji: {
		fontSize: 28,
	},
	counterBadge: {
		backgroundColor: '#e6f4ea',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	counterBadgeText: {
		fontSize: 10,
		color: '#137333',
		fontWeight: '700',
	},
	taskTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.text,
		lineHeight: 18,
		minHeight: 36,
	},
	penaltyTitle: {
		color: '#7f1d1d',
	},
	taskPoints: {
		fontSize: 12,
		fontWeight: '700',
		color: '#10b981',
		marginTop: 4,
		marginBottom: spacing.md,
	},
	cardActionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	trashMiniButton: {
		padding: 6,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
	},
	addButton: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: '#10b981',
		paddingVertical: 6,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 4,
	},
	addButtonText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
	},
	subTabsContainer: {
		flexDirection: 'row',
		marginVertical: spacing.md,
		backgroundColor: '#e2e8f0',
		borderRadius: 12,
		padding: 3,
	},
	subTabButton: {
		flex: 1,
		paddingVertical: 8,
		alignItems: 'center',
		borderRadius: 10,
	},
	subTabButtonActive: {
		backgroundColor: colors.surface,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
	},
	subTabButtonText: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
	},
	subTabButtonTextActive: {
		color: colors.text,
		fontWeight: '700',
	},
	unlocksList: {
		marginTop: spacing.xs,
	},
	unlockRow: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: spacing.md,
		marginBottom: spacing.sm,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
		elevation: 1,
	},
	unlockRowCompleted: {
		backgroundColor: '#f4fbf7',
		borderColor: '#d1fae5',
		borderWidth: 1,
	},
	unlockIconCol: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#f1f5f9',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: spacing.md,
	},
	unlockEmoji: {
		fontSize: 22,
	},
	unlockContentCol: {
		flex: 1,
		marginRight: spacing.sm,
	},
	unlockTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	unlockTitleCompleted: {
		color: '#065f46',
	},
	unlockDesc: {
		fontSize: 11,
		color: colors.muted,
		marginTop: 3,
		lineHeight: 15,
	},
	unlockPointsAward: {
		fontSize: 10,
		color: colors.accent,
		fontWeight: '600',
		marginTop: 4,
	},
	unlockActionCol: {
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	completedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#d1fae5',
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	completedBadgeText: {
		fontSize: 10,
		color: '#065f46',
		fontWeight: '700',
		marginLeft: 3,
	},
	unlockButton: {
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 6,
		paddingHorizontal: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	unlockButtonText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
	},
	quizSelectionGrid: {
		marginTop: spacing.sm,
	},
	quizTopicCard: {
		backgroundColor: colors.surface,
		borderRadius: 18,
		padding: spacing.lg,
		marginBottom: spacing.md,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 5,
		elevation: 1,
	},
	quizTopicEmoji: {
		fontSize: 44,
		marginBottom: spacing.xs,
	},
	quizTopicTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
		textAlign: 'center',
	},
	quizTopicLength: {
		fontSize: 12,
		color: colors.muted,
		marginTop: 4,
		marginBottom: spacing.md,
	},
	startQuizButton: {
		backgroundColor: colors.accent,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 24,
		width: '100%',
		alignItems: 'center',
	},
	startQuizButtonText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
	},
	quizInterfaceCard: {
		backgroundColor: colors.surface,
		borderRadius: 20,
		padding: spacing.md,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 2,
	},
	quizInterfaceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: spacing.sm,
		marginBottom: spacing.md,
	},
	quizTopicHeaderTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	quitQuizMiniBtn: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
	},
	quitQuizMiniBtnTxt: {
		fontSize: 11,
		color: '#ef4444',
		fontWeight: '700',
	},
	quizActiveQuestionBody: {
		marginTop: spacing.xs,
	},
	questionProgressRow: {
		marginBottom: spacing.md,
	},
	questionProgressText: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
		marginBottom: 6,
	},
	progressBarBg: {
		height: 6,
		backgroundColor: '#f1f5f9',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	questionText: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
		lineHeight: 22,
		marginBottom: spacing.md,
	},
	optionsList: {
		marginBottom: spacing.lg,
	},
	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: 14,
		padding: spacing.md,
		marginBottom: spacing.sm,
		borderWidth: 1.5,
		borderColor: '#e2e8f0',
	},
	optionButtonSelected: {
		backgroundColor: '#eff6ff',
		borderColor: colors.accent,
	},
	optionBullet: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#cbd5e1',
		marginRight: spacing.md,
		justifyContent: 'center',
		alignItems: 'center',
	},
	optionBulletSelected: {
		borderColor: colors.accent,
	},
	optionBulletInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.accent,
	},
	optionText: {
		flex: 1,
		fontSize: 13,
		color: colors.text,
		lineHeight: 18,
	},
	optionTextSelected: {
		color: colors.accent,
		fontWeight: '600',
	},
	nextQuestionButton: {
		backgroundColor: colors.accent,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextQuestionButtonDisabled: {
		backgroundColor: '#cbd5e1',
	},
	nextQuestionButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	quizCompletedBody: {
		alignItems: 'center',
		paddingVertical: spacing.lg,
	},
	trophyIconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#fffbeb',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	quizResultPercent: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.text,
		marginBottom: spacing.sm,
	},
	quizResultMessage: {
		fontSize: 14,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 20,
		paddingHorizontal: spacing.md,
		marginBottom: spacing.lg,
	},
	quizRewardBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#10b981',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: spacing.lg,
	},
	quizRewardBadgeText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 13,
		marginLeft: 6,
	},
	quizBackToListBtn: {
		borderWidth: 1.5,
		borderColor: colors.accent,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	quizBackToListBtnText: {
		color: colors.accent,
		fontWeight: '700',
		fontSize: 13,
	},
	rewardCard: {
		width: '47%',
		backgroundColor: colors.surface,
		borderRadius: 18,
		padding: spacing.md,
		margin: '1.5%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 5,
		elevation: 1,
		position: 'relative',
	},
	rewardCardClaimed: {
		backgroundColor: '#f1f5f9',
		borderColor: '#cbd5e1',
		borderWidth: 1,
	},
	rewardCardCantAfford: {
		opacity: 0.7,
	},
	rewardEmojiContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#f8fafc',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: spacing.sm,
	},
	rewardEmoji: {
		fontSize: 28,
	},
	rewardTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
		textAlign: 'center',
		marginBottom: 4,
		minHeight: 36,
	},
	rewardCost: {
		fontSize: 12,
		color: colors.accent,
		fontWeight: '800',
		marginBottom: spacing.md,
	},
	claimButton: {
		borderRadius: 10,
		paddingVertical: 8,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	claimButtonEnabled: {
		backgroundColor: '#10b981',
	},
	claimButtonDisabled: {
		backgroundColor: '#e2e8f0',
	},
	claimedButtonState: {
		backgroundColor: '#cbd5e1',
	},
	claimButtonText: {
		fontSize: 11,
		fontWeight: '700',
	},
	claimButtonTextEnabled: {
		color: '#ffffff',
	},
	claimButtonTextDisabled: {
		color: '#94a3b8',
	},
	claimedButtonText: {
		color: '#475569',
		marginLeft: 4,
	},
	deleteRewardMiniButton: {
		position: 'absolute',
		top: 6,
		right: 6,
		backgroundColor: '#ffffff',
		borderRadius: 10,
		width: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	logsGroupContainer: {
		marginTop: spacing.sm,
	},
	dayGroupCard: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		marginBottom: spacing.sm,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.02,
		shadowRadius: 3,
		elevation: 1,
	},
	dayHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: spacing.md,
		backgroundColor: '#f8fafc',
	},
	dayHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	dayDateText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
	},
	dayHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sumPositiveText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#137333',
		marginRight: 6,
		backgroundColor: '#e6f4ea',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	sumNegativeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#c5221f',
		marginRight: 10,
		backgroundColor: '#fce8e6',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	dayLogsList: {
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.sm,
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
	},
	logItemRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	logLeftCol: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: spacing.sm,
	},
	indicatorDot: {
		width: 14,
		height: 14,
		borderRadius: 7,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
	},
	indicatorDotInner: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	logTitleText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
	},
	logTimeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 3,
	},
	logTimeText: {
		fontSize: 9,
		color: colors.muted,
		marginLeft: 3,
	},
	logValueText: {
		fontSize: 12,
		fontWeight: '700',
	},
	emptyHistoryState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	emptyHistoryText: {
		marginTop: spacing.md,
		fontSize: 12,
		color: colors.muted,
		textAlign: 'center',
	},
	toastContainer: {
		position: 'absolute',
		bottom: 30,
		left: 20,
		right: 20,
		backgroundColor: '#10b981',
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 5,
		zIndex: 9999,
	},
	toastError: {
		backgroundColor: '#ef4444',
	},
	toastInfo: {
		backgroundColor: colors.accent,
	},
	toastText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 12,
		flex: 1,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(17, 24, 39, 0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: spacing.md,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderRadius: 24,
		width: '100%',
		maxWidth: 400,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
		overflow: 'hidden',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	modalBody: {
		padding: spacing.md,
	},
	inputLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 6,
		marginTop: 8,
	},
	textInput: {
		backgroundColor: '#f8fafc',
		borderWidth: 1.5,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		paddingHorizontal: spacing.md,
		paddingVertical: 10,
		fontSize: 14,
		color: colors.text,
		marginBottom: spacing.sm,
	},
	emojiSelectorContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
	},
	emojiButton: {
		width: '21%',
		aspectRatio: 1,
		backgroundColor: '#f1f5f9',
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		margin: '2%',
		borderWidth: 2,
		borderColor: 'transparent',
	},
	emojiButtonSelected: {
		borderColor: colors.accent,
		backgroundColor: '#eff6ff',
	},
	emojiButtonText: {
		fontSize: 22,
	},
	modalFooter: {
		flexDirection: 'row',
		padding: spacing.md,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		justifyContent: 'flex-end',
	},
	modalBtn: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginLeft: spacing.sm,
	},
	modalBtnCancel: {
		backgroundColor: '#f1f5f9',
	},
	modalBtnCancelText: {
		color: colors.muted,
		fontSize: 13,
		fontWeight: '600',
	},
	modalBtnSubmit: {
		backgroundColor: colors.accent,
	},
	modalBtnSubmitText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
	},
	claimConfirmRewardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
		textAlign: 'center',
		marginBottom: 6,
	},
	claimConfirmWarning: {
		fontSize: 13,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: spacing.sm,
	},
});
