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
	Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AuthGate } from '@/components/AuthGate';
import { SignOutButton } from '@/components/SignOutButton';
import { colors, spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
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

	// Parent Settings (PIN code, default "1234") and Approval requests queue
	const parentSettings = useQuery(api.kids.getParentSettings);
	const updatePinMutation = useMutation(api.kids.updatePIN);
	const pendingRequests = useQuery(api.kids.listPendingRequests);
	const createRequestMutation = useMutation(api.kids.createPendingRequest);
	const approveRequestMutation = useMutation(api.kids.approveRequest);
	const rejectRequestMutation = useMutation(api.kids.rejectRequest);

	// 2. Role-Based Access Control State
	const [currentRole, setCurrentRole] = useState<'parent' | 'child'>('child'); // Safely default to Child mode!
	const [pinModalVisible, setPinModalVisible] = useState(false);
	const [enteredPin, setEnteredPin] = useState('');
	const [pinError, setPinError] = useState<string | null>(null);

	// Settings modal to change PIN
	const [settingsModalVisible, setSettingsModalVisible] = useState(false);
	const [newPinValue, setNewPinValue] = useState('');

	// Selected Child state
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

	// Unified handler for committing transactions (Direct Parent Action, or pending if Child)
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

		// ROLE GUARD: If currently in Child Mode, do NOT award points directly! Instead, create a pending request (Section 6)
		if (currentRole === 'child') {
			try {
				const type = isClaim ? 'reward' : isUnlock ? 'unlock' : 'task';
				const res = await createRequestMutation({
					childId: activeChild._id,
					type,
					entryId,
					title,
					value,
					emoji: isClaim ? '🎁' : isUnlock ? '📚' : '✨',
				});

				if (res.success) {
					showToast(res.message || 'So’rovingiz muvaffaqiyatli yuborildi! ⏳', 'info');
				} else {
					showToast(res.message || 'Xatolik', 'error');
				}
			} catch (err: any) {
				showToast(err.message || 'So’rov jo’natib bo’lmadi', 'error');
			}
			return;
		}

		// PARENT MODE: Award/Deduct points directly (Section 4)
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

	// Parent Unlock / Security verification (Section 5)
	const handleVerifyPin = () => {
		if (!parentSettings) return;

		if (enteredPin === parentSettings.pin) {
			setCurrentRole('parent');
			setPinModalVisible(false);
			setEnteredPin('');
			setPinError(null);
			showToast('Ota-ona rejimi yoqildi! 🔓', 'success');
		} else {
			setPinError('Xato PIN-kod! Iltimos qayta urinib ko’ring.');
			setEnteredPin('');
		}
	};

	// Save new PIN (Section 5)
	const handleSaveNewPin = async () => {
		if (newPinValue.length !== 4 || isNaN(parseInt(newPinValue, 10))) {
			showToast('PIN-kod ro’ppa-rost 4 xonali raqam bo’lishi shart!', 'error');
			return;
		}

		try {
			await updatePinMutation({ newPin: newPinValue });
			showToast('Xavfsizlik PIN-kodi yangilandi! 🛡️', 'success');
			setNewPinValue('');
			setSettingsModalVisible(false);
		} catch (err: any) {
			showToast(err.message || 'PIN yangilashda xatolik', 'error');
		}
	};

	// Child Requests Approval Handlers (Section 6)
	const handleApproveRequest = async (requestId: string) => {
		try {
			const res = await approveRequestMutation({
				requestId: requestId as any,
				dateStr: getLocalDateString(),
			});
			if (res.success) {
				showToast(res.message || 'Tasdiqlandi! 👍', 'success');
			} else {
				showToast(res.message || 'Xatolik', 'error');
			}
		} catch (err: any) {
			showToast(err.message || 'Xatolik yuz berdi', 'error');
		}
	};

	const handleRejectRequest = async (requestId: string) => {
		try {
			const res = await rejectRequestMutation({ requestId: requestId as any });
			if (res.success) {
				showToast(res.message || 'Rad etildi! ❌', 'error');
			}
		} catch (err: any) {
			showToast('Rad etib bo’lmadi', 'error');
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
		// Only parent role can delete profiles
		if (currentRole !== 'parent') {
			showToast('Faqat ota-ona bolalarni o’chira oladi!', 'error');
			return;
		}

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

		// In Child Mode, ask parent first (creates pending request)
		if (currentRole === 'child') {
			handleActionCommit(reward.id, `Sotib olmoqchi: ${reward.title}`, -reward.cost, false, true);
			return;
		}

		// In Parent Mode, confirm and redeem directly
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
				// Tests are directly awarded to the child after solving!
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

	// Filter requests for the currently selected child
	const activeChildRequests = useMemo(() => {
		if (!pendingRequests || !activeChild) return [];
		return pendingRequests.filter((r) => r.childId === activeChild._id);
	}, [pendingRequests, activeChild]);

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

			{/* ROLE BAR HEADER STATUS (Section 4 & 5) */}
			<View style={styles.roleHeaderBar}>
				<View style={styles.roleIndicator}>
					<View
						style={[
							styles.roleDotIndicator,
							{ backgroundColor: currentRole === 'parent' ? '#10b981' : '#f59e0b' },
						]}
					/>
					<Text style={styles.roleHeaderLabel}>
						Hozirgi rejim:{' '}
						<Text style={{ fontWeight: '800' }}>
							{currentRole === 'parent' ? 'Ota-ona 👨‍👩‍👧' : 'Farzand 🧒'}
						</Text>
					</Text>
				</View>

				<View style={styles.roleActionButtons}>
					{currentRole === 'parent' ? (
						<>
							<TouchableOpacity
								onPress={() => setSettingsModalVisible(true)}
								style={[styles.roleActionButton, { backgroundColor: '#f1f5f9' }]}
							>
								<Ionicons name="settings-outline" size={16} color={colors.text} />
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									setCurrentRole('child');
									showToast('Ota-ona rejimi qulflandi! 🔒', 'info');
								}}
								style={[styles.roleActionButton, styles.roleActionButtonLock]}
							>
								<Ionicons name="lock-closed" size={14} color="#ffffff" />
								<Text style={styles.roleActionButtonLockText}>Qulflash</Text>
							</TouchableOpacity>
						</>
					) : (
						<TouchableOpacity
							onPress={() => setPinModalVisible(true)}
							style={[styles.roleActionButton, styles.roleActionButtonUnlock]}
						>
							<Ionicons name="key" size={14} color="#ffffff" />
							<Text style={styles.roleActionButtonUnlockText}>Ota-ona rejimi</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Live Pending Requests Indicator Notification (Section 6) */}
			{currentRole === 'parent' && pendingRequests && pendingRequests.length > 0 && (
				<View style={styles.pendingAlertBanner}>
					<Ionicons name="alert-circle" size={18} color="#b45309" />
					<Text style={styles.pendingAlertText}>
						Faol so’rovlar: jami{' '}
						<Text style={{ fontWeight: '800' }}>{pendingRequests.length} ta</Text> kutilayotgan amal tasdiqlanishni kutmoqda!
					</Text>
				</View>
			)}

			{/* Main Content scrollable container, leaving room for floating bottom app bar */}
			<View style={styles.mainContentWrapper}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
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
										{isActive && currentRole === 'parent' && (
											<Pressable
												onPress={() => handleDeleteChild(kid._id, kid.name)}
												style={styles.deleteKidMiniButton}
											>
												<Ionicons name="close" size={12} color="#ff4d4f" />
											</Pressable>
										)}
									</Pressable>
								);
							})}

							{currentRole === 'parent' && (
								<Pressable onPress={() => setAddChildModalVisible(true)} style={styles.addKidButton}>
									<Ionicons name="person-add-outline" size={18} color={colors.accent} />
									<Text style={styles.addKidButtonText}>Qo’shish</Text>
								</Pressable>
							)}
						</ScrollView>
					</View>

					{/* Current Child Information & Statistics Banner */}
					{activeChild ? (
						<View style={styles.bannerContainer}>
							<View style={styles.bannerHeader}>
								<Text style={styles.bannerTitle}>{activeChild.emoji} {activeChild.name} profili</Text>
								<View style={styles.badge}>
									<Ionicons name="star" size={14} color="#f59e0b" />
									<Text style={styles.badgeText}>Faol</Text>
								</View>
							</View>

							<View style={styles.statsRow}>
								{/* Stat 1: Total point score (Section 7) */}
								<View style={[styles.statBox, styles.statBoxBlue]}>
									<Text style={styles.statLabel}>Umumiy Ball</Text>
									<Text style={[styles.statValue, { color: colors.accent }]}>
										{Math.max(0, activeChild.score)}
									</Text>
									<View style={[styles.statBadge, { backgroundColor: '#eff6ff' }]}>
										<Ionicons name="trophy" size={11} color={colors.accent} />
										<Text style={[styles.statBadgeText, { color: colors.accent }]}>To’plangan</Text>
									</View>
								</View>

								{/* Stat 2: Today positive sum */}
								<View style={[styles.statBox, styles.statBoxGreen]}>
									<Text style={styles.statLabel}>Bugungi Ball</Text>
									<Text style={[styles.statValue, { color: '#059669' }]}>
										+{stats.today}
									</Text>
									<View style={[styles.statBadge, { backgroundColor: '#ecfdf5' }]}>
										<Ionicons name="flame" size={11} color="#059669" />
										<Text style={[styles.statBadgeText, { color: '#059669' }]}>Bugun</Text>
									</View>
								</View>

								{/* Stat 3: Weekly positive sum */}
								<View style={[styles.statBox, styles.statBoxAmber]}>
									<Text style={styles.statLabel}>Haftalik Ball</Text>
									<Text style={[styles.statValue, { color: '#d97706' }]}>
										+{stats.weekly}
									</Text>
									<View style={[styles.statBadge, { backgroundColor: '#fffbeb' }]}>
										<Ionicons name="calendar" size={11} color="#d97706" />
										<Text style={[styles.statBadgeText, { color: '#d97706' }]}>Hafta</Text>
									</View>
								</View>
							</View>
						</View>
					) : (
						<View style={styles.noChildContainer}>
							<Ionicons name="warning-outline" size={32} color="#f59e0b" />
							<Text style={styles.noChildText}>Iltimos, ota-ona bo’limida bola yarating!</Text>
						</View>
					)}

					{/* PARENT APPROVAL QUEUE MODULE (Section 6) */}
					{currentRole === 'parent' && activeChild && activeChildRequests.length > 0 && (
						<View style={styles.approvalSectionContainer}>
							<View style={styles.approvalHeaderRow}>
								<Ionicons name="checkbox-outline" size={20} color={colors.accent} />
								<Text style={styles.approvalTitleText}>
									{activeChild.name}dan kelgan so’rovlar ({activeChildRequests.length} ta)
								</Text>
							</View>

							{activeChildRequests.map((req) => {
								const isReward = req.type === 'reward';
								return (
									<View key={req._id} style={styles.approvalCard}>
										<View style={styles.approvalCardLeft}>
											<Text style={styles.approvalCardEmoji}>{req.emoji}</Text>
											<View>
												<Text style={styles.approvalCardTitle}>{req.title}</Text>
												<Text style={[styles.approvalCardPoints, { color: isReward ? '#ef4444' : '#10b981' }]}>
													{isReward ? `Cost: -${req.value}` : `Points: +${req.value}`} ball
												</Text>
											</View>
										</View>

										<View style={styles.approvalCardRight}>
											<TouchableOpacity
												onPress={() => handleRejectRequest(req._id)}
												style={[styles.approvalBtn, styles.approvalBtnReject]}
											>
												<Ionicons name="close" size={18} color="#ef4444" />
											</TouchableOpacity>
											<TouchableOpacity
												onPress={() => handleApproveRequest(req._id)}
												style={[styles.approvalBtn, styles.approvalBtnApprove]}
											>
												<Ionicons name="checkmark" size={18} color="#10b981" />
											</TouchableOpacity>
										</View>
									</View>
								);
							})}
						</View>
					)}

					{/* TAB CONTENT AREAS */}
					{activeChild && activeTab === 'tasks' && (
						<View style={styles.section}>
							{/* Subheader with Custom Item trigger */}
							<View style={styles.sectionHeaderRow}>
								<View>
									<Text style={styles.sectionTitle}>Kunlik Amallar va Vazifalar</Text>
									<Text style={styles.sectionSubtitle}>
										{currentRole === 'parent'
											? 'Bolaga ball berish yoki ayirish harakatlari'
											: 'Amalni bajarganingizdan so’ng ball so’rang'}
									</Text>
								</View>
								{currentRole === 'parent' && (
									<TouchableOpacity
										style={styles.addCustomFab}
										onPress={() => {
											setCustomItemType('task');
											setCustomEmoji('✍️');
											setCustomItemModalVisible(true);
										}}
									>
										<Ionicons name="add" size={16} color="#ffffff" />
										<Text style={styles.addCustomFabText}>Yangi</Text>
									</TouchableOpacity>
								)}
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
												{currentRole === 'parent' && 'isCustom' in task && (
													<TouchableOpacity
														onPress={() => handleDeleteCustomItem(task.id)}
														style={styles.trashMiniButton}
													>
														<Ionicons name="trash-outline" size={13} color="#99a2b0" />
													</TouchableOpacity>
												)}
												<TouchableOpacity
													onPress={() => handleActionCommit(task.id, task.title, task.points)}
													style={[styles.addButton, currentRole === 'child' && styles.requestButtonColor]}
												>
													<Ionicons
														name={currentRole === 'parent' ? 'add' : 'paper-plane-outline'}
														size={14}
														color="#ffffff"
														style={{ marginRight: 2 }}
													/>
													<Text style={styles.addButtonText}>
														{currentRole === 'parent' ? 'Bajarildi' : 'So’rash'}
													</Text>
												</TouchableOpacity>
											</View>
										</View>
									);
								})}
							</View>

							{/* Penalties List - ONLY MANAGED/RECORDED BY PARENT ROLE (Section 2) */}
							<View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
								<View>
									<Text style={styles.subCategoryTitle}>⚠️ Qoidabuzarlik va Jazolar</Text>
									<Text style={styles.sectionSubtitle}>Noto’g’ri ishlar uchun ball ota-ona tomonidan ayiriladi</Text>
								</View>
								{currentRole === 'parent' && (
									<TouchableOpacity
										style={[styles.addCustomFab, { backgroundColor: '#ef4444' }]}
										onPress={() => {
											setCustomItemType('penalty');
											setCustomEmoji('⚠️');
											setCustomItemModalVisible(true);
										}}
									>
										<Ionicons name="add" size={16} color="#ffffff" />
										<Text style={styles.addCustomFabText}>Jazo qo’shish</Text>
									</TouchableOpacity>
								)}
							</View>

							{currentRole === 'parent' ? (
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
															<Ionicons name="trash-outline" size={13} color="#99a2b0" />
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
							) : (
								<View style={styles.disabledPenaltiesBlock}>
									<Ionicons name="lock-closed" size={24} color="#94a3b8" />
									<Text style={styles.disabledPenaltiesText}>
										Qoidabuzarlik va jazo choralari faqat Ota-ona rejimi 🔑 orqali qayd etiladi.
									</Text>
								</View>
							)}
						</View>
					)}

					{activeChild && activeTab === 'oneoff' && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Bir martalik darsliklar</Text>
							<Text style={styles.sectionSubtitle}>
								{currentRole === 'parent'
									? 'Taqdim qilingan darslarni o’zlashtirishni tekshiring'
									: 'Darsni o’rganib bo’lgach, ota-onangizga so’rov jo’nating'}
							</Text>

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
														<Ionicons name="checkmark" size={14} color="#10b981" />
														<Text style={styles.completedBadgeText}>Olingan</Text>
													</View>
												) : (
													<TouchableOpacity
														onPress={() =>
															handleActionCommit(task.id, `O’rganildi: ${task.title}`, task.points, true)
														}
														style={[styles.unlockButton, currentRole === 'child' && styles.requestButtonColor]}
													>
														<Text style={styles.unlockButtonText}>
															{currentRole === 'parent' ? `+${task.points}` : 'So’rash'}
														</Text>
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
												<Ionicons
													name="trophy"
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
													<Ionicons name="sparkles" size={16} color="#ffffff" />
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
								{currentRole === 'parent' && (
									<TouchableOpacity
										style={[styles.addCustomFab, { backgroundColor: '#10b981' }]}
										onPress={() => {
											setCustomItemType('reward');
											setCustomEmoji('🎁');
											setCustomItemModalVisible(true);
										}}
									>
										<Ionicons name="add" size={16} color="#ffffff" />
										<Text style={styles.addCustomFabText}>Yangi Mukofot</Text>
									</TouchableOpacity>
								)}
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
													<Ionicons name="checkmark" size={14} color="#596579" />
													<Text style={styles.claimedButtonText}>Olingan ✅</Text>
												</View>
											) : (
												<TouchableOpacity
													disabled={!canAfford}
													onPress={() => initiateClaimReward(reward)}
													style={[
														styles.claimButton,
														canAfford ? styles.claimButtonEnabled : styles.claimButtonDisabled,
														currentRole === 'child' && canAfford && styles.requestButtonColor,
													]}
												>
													<Text
														style={[
															styles.claimButtonText,
															canAfford ? styles.claimButtonTextEnabled : styles.claimButtonTextDisabled,
														]}
													>
														{currentRole === 'parent' ? 'Sotib Olish' : 'So’rov yuborish'}
													</Text>
												</TouchableOpacity>
											)}

											{currentRole === 'parent' && 'isCustom' in reward && (
												<TouchableOpacity
													onPress={() => handleDeleteCustomItem(reward.id)}
													style={styles.deleteRewardMiniButton}
												>
													<Ionicons name="trash-outline" size={12} color="#ff4d4f" />
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
														<Ionicons name="calendar-outline" size={16} color={colors.muted} style={{ marginRight: 6 }} />
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
															<Ionicons name="chevron-up" size={16} color={colors.muted} />
														) : (
															<Ionicons name="chevron-down" size={16} color={colors.muted} />
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
																				<Ionicons name="time-outline" size={10} color={colors.muted} />
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
									<Ionicons name="time-outline" size={40} color="#cbd5e1" />
									<Text style={styles.emptyHistoryText}>
										Hali hech qanday harakatlar tarixi mavjud emas.
									</Text>
								</View>
							)}
						</View>
					)}
				</ScrollView>
			</View>

			{/* MODERN FLOATING BOTTOM NAVIGATION APP BAR */}
			<View style={styles.bottomAppBarContainer}>
				<View style={styles.bottomAppBar}>
					<Pressable
						onPress={() => setActiveTab('tasks')}
						style={[styles.appBarItem, activeTab === 'tasks' && styles.appBarItemActive]}
					>
						<Ionicons
							name="flame"
							size={22}
							color={activeTab === 'tasks' ? colors.accent : '#64748b'}
						/>
						<Text style={[styles.appBarItemLabel, activeTab === 'tasks' && styles.appBarItemLabelActive]}>
							Amallar
						</Text>
						{activeTab === 'tasks' && <View style={styles.activeIndicatorDot} />}
					</Pressable>

					<Pressable
						onPress={() => setActiveTab('oneoff')}
						style={[styles.appBarItem, activeTab === 'oneoff' && styles.appBarItemActive]}
					>
						<Ionicons
							name="ribbon"
							size={22}
							color={activeTab === 'oneoff' ? colors.accent : '#64748b'}
						/>
						<Text style={[styles.appBarItemLabel, activeTab === 'oneoff' && styles.appBarItemLabelActive]}>
							Darslik
						</Text>
						{activeTab === 'oneoff' && <View style={styles.activeIndicatorDot} />}
					</Pressable>

					<Pressable
						onPress={() => setActiveTab('tests')}
						style={[styles.appBarItem, activeTab === 'tests' && styles.appBarItemActive]}
					>
						<Ionicons
							name="book"
							size={22}
							color={activeTab === 'tests' ? colors.accent : '#64748b'}
						/>
						<Text style={[styles.appBarItemLabel, activeTab === 'tests' && styles.appBarItemLabelActive]}>
							Testlar
						</Text>
						{activeTab === 'tests' && <View style={styles.activeIndicatorDot} />}
					</Pressable>

					<Pressable
						onPress={() => setActiveTab('rewards')}
						style={[styles.appBarItem, activeTab === 'rewards' && styles.appBarItemActive]}
					>
						<Ionicons
							name="gift"
							size={22}
							color={activeTab === 'rewards' ? colors.accent : '#64748b'}
						/>
						<Text style={[styles.appBarItemLabel, activeTab === 'rewards' && styles.appBarItemLabelActive]}>
							Sotib olish
						</Text>
						{activeTab === 'rewards' && <View style={styles.activeIndicatorDot} />}
					</Pressable>

					<Pressable
						onPress={() => setActiveTab('logs')}
						style={[styles.appBarItem, activeTab === 'logs' && styles.appBarItemActive]}
					>
						<Ionicons
							name="time"
							size={22}
							color={activeTab === 'logs' ? colors.accent : '#64748b'}
						/>
						<Text style={[styles.appBarItemLabel, activeTab === 'logs' && styles.appBarItemLabelActive]}>
							Jurnal
						</Text>
						{activeTab === 'logs' && <View style={styles.activeIndicatorDot} />}
					</Pressable>
				</View>
			</View>

			{/* FLOATING SUCCESS/WARNING TOAST */}
			{toast && (
				<View
					style={[
						styles.toastContainer,
						toast.type === 'error' && styles.toastError,
						toast.type === 'info' && styles.toastInfo,
					]}
				>
					<Ionicons name="sparkles" size={16} color="#ffffff" style={{ marginRight: spacing.sm }} />
					<Text style={styles.toastText}>{toast.message}</Text>
				</View>
			)}

			{/* MODAL: VERIFY PARENT PROTECTION PIN (Section 5) */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={pinModalVisible}
				onRequestClose={() => setPinModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxWidth: 320 }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Ota-ona xavfsizlik PIN-kodi</Text>
							<TouchableOpacity onPress={() => setPinModalVisible(false)}>
								<Ionicons name="close" size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							<Text style={styles.pinInstructions}>
								Bolalar ruxsatsiz ball qo’shmasligi uchun 4 xonali PIN-kodni kiriting. (Zavod PIN: <Text style={{ fontWeight: '800' }}>1234</Text>)
							</Text>

							<TextInput
								style={styles.pinInput}
								placeholder="****"
								keyboardType="numeric"
								maxLength={4}
								secureTextEntry
								value={enteredPin}
								onChangeText={(val) => {
									setEnteredPin(val);
									setPinError(null);
								}}
							/>

							{pinError && <Text style={styles.pinErrorText}>{pinError}</Text>}
						</View>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnCancel]}
								onPress={() => {
									setPinModalVisible(false);
									setEnteredPin('');
									setPinError(null);
								}}
							>
								<Text style={styles.modalBtnCancelText}>Bekor qilish</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnSubmit]}
								onPress={handleVerifyPin}
							>
								<Text style={styles.modalBtnSubmitText}>Kirish 🔓</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* MODAL: CHANGE PIN SETTINGS (Section 5) */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={settingsModalVisible}
				onRequestClose={() => setSettingsModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxWidth: 320 }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>PIN-kodni almashtirish</Text>
							<TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
								<Ionicons name="close" size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							<Text style={styles.pinInstructions}>
								Ota-ona rejimini himoya qilish uchun yangi 4 xonali raqamli kod kiriting:
							</Text>

							<TextInput
								style={styles.pinInput}
								placeholder="Yangi PIN"
								keyboardType="numeric"
								maxLength={4}
								secureTextEntry
								value={newPinValue}
								onChangeText={setNewPinValue}
							/>
						</View>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnCancel]}
								onPress={() => {
									setSettingsModalVisible(false);
									setNewPinValue('');
								}}
							>
								<Text style={styles.modalBtnCancelText}>Bekor qilish</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, styles.modalBtnSubmit, { backgroundColor: '#10b981' }]}
								onPress={handleSaveNewPin}
							>
								<Text style={styles.modalBtnSubmitText}>Saqlash 🛡️</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

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
								<Ionicons name="close" size={20} color={colors.muted} />
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
								<Ionicons name="close" size={20} color={colors.muted} />
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
								<Ionicons name="close" size={20} color={colors.muted} />
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
		backgroundColor: '#f8fafc',
	},
	mainContentWrapper: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	loadingText: {
		marginTop: spacing.sm,
		fontSize: 15,
		color: colors.muted,
	},
	// ROLE PROTECTION BAR HEADER
	roleHeaderBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: spacing.md,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
	},
	roleIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	roleDotIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 8,
	},
	roleHeaderLabel: {
		fontSize: 12,
		color: colors.text,
	},
	roleActionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	roleActionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 10,
		marginLeft: 6,
	},
	roleActionButtonUnlock: {
		backgroundColor: colors.accent,
	},
	roleActionButtonUnlockText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '800',
		marginLeft: 4,
	},
	roleActionButtonLock: {
		backgroundColor: '#ef4444',
	},
	roleActionButtonLockText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '800',
		marginLeft: 4,
	},
	pendingAlertBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef3c7',
		paddingVertical: 10,
		paddingHorizontal: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: '#fde68a',
	},
	pendingAlertText: {
		fontSize: 11,
		color: '#92400e',
		fontWeight: '600',
		marginLeft: 6,
		flex: 1,
	},
	// APPROVALS LIST UI
	approvalSectionContainer: {
		backgroundColor: '#eff6ff',
		margin: spacing.md,
		borderRadius: 20,
		padding: spacing.md,
		borderWidth: 1.5,
		borderColor: '#bfdbfe',
	},
	approvalHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: spacing.sm,
	},
	approvalTitleText: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.accent,
		marginLeft: 6,
	},
	approvalCard: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 12,
		marginBottom: 6,
		borderWidth: 1,
		borderColor: '#dbeafe',
	},
	approvalCardLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: spacing.sm,
	},
	approvalCardEmoji: {
		fontSize: 24,
		marginRight: 10,
	},
	approvalCardTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.text,
	},
	approvalCardPoints: {
		fontSize: 11,
		fontWeight: '800',
		marginTop: 2,
	},
	approvalCardRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	approvalBtn: {
		width: 32,
		height: 32,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 6,
	},
	approvalBtnReject: {
		backgroundColor: '#fee2e2',
	},
	approvalBtnApprove: {
		backgroundColor: '#dcfce7',
	},
	// KIDS SELECTOR CAROUSEL
	kidsSelectorContainer: {
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
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
		borderRadius: 20,
		paddingVertical: 10,
		paddingHorizontal: 16,
		marginRight: spacing.sm,
		borderWidth: 1.5,
		borderColor: 'transparent',
		position: 'relative',
	},
	kidCardActive: {
		backgroundColor: '#f0f9ff',
		borderColor: colors.accent,
	},
	kidEmoji: {
		fontSize: 26,
		marginRight: 8,
	},
	kidDetails: {
		justifyContent: 'center',
	},
	kidName: {
		fontSize: 14,
		fontWeight: '700',
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
		color: '#0284c7',
		fontWeight: '600',
	},
	deleteKidMiniButton: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		width: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#fca3a3',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
	},
	addKidButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderColor: colors.accent,
		borderStyle: 'dashed',
		borderRadius: 20,
		paddingVertical: 10,
		paddingHorizontal: 16,
		backgroundColor: 'transparent',
	},
	addKidButtonText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '700',
		marginLeft: 6,
	},
	bannerContainer: {
		backgroundColor: colors.surface,
		marginHorizontal: spacing.md,
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: 24,
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.04,
		shadowRadius: 12,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	bannerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	bannerTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: colors.text,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef3c7',
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	badgeText: {
		fontSize: 10,
		color: '#b45309',
		fontWeight: '700',
		marginLeft: 4,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	statBox: {
		flex: 1,
		borderRadius: 18,
		padding: 12,
		alignItems: 'center',
		marginHorizontal: 4,
		borderWidth: 1.5,
	},
	statBoxBlue: {
		backgroundColor: '#f0f9ff',
		borderColor: '#e0f2fe',
	},
	statBoxGreen: {
		backgroundColor: '#f0fdf4',
		borderColor: '#dcfce7',
	},
	statBoxAmber: {
		backgroundColor: '#fffbeb',
		borderColor: '#fef3c7',
	},
	statLabel: {
		fontSize: 9,
		fontWeight: '700',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	statValue: {
		fontSize: 22,
		fontWeight: '900',
		marginVertical: 4,
	},
	statBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 3,
		marginTop: 2,
	},
	statBadgeText: {
		fontSize: 9,
		fontWeight: '700',
		marginLeft: 4,
	},
	noChildContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
		margin: spacing.md,
		padding: spacing.xl,
		borderRadius: 24,
	},
	noChildText: {
		marginTop: spacing.sm,
		fontSize: 14,
		color: colors.text,
		fontWeight: '700',
		textAlign: 'center',
	},
	scrollContent: {
		flex: 1,
	},
	scrollContentInner: {
		paddingBottom: 110, // Ensure content isn't blocked by bottom App Bar
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
		fontWeight: '800',
		color: colors.text,
	},
	sectionSubtitle: {
		fontSize: 12,
		color: colors.muted,
		marginTop: 2,
	},
	subCategoryTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: colors.text,
		marginTop: spacing.md,
		marginBottom: spacing.sm,
	},
	addCustomFab: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.accent,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 16,
		shadowColor: '#2563eb',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 3,
	},
	addCustomFabText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
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
		borderRadius: 22,
		padding: spacing.md,
		margin: '1.5%',
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#f1f5f9',
		justifyContent: 'space-between',
	},
	penaltyCard: {
		borderColor: '#fee2e2',
		borderWidth: 1.5,
	},
	taskHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.sm,
	},
	taskEmoji: {
		fontSize: 30,
	},
	counterBadge: {
		backgroundColor: '#e6f4ea',
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	counterBadgeText: {
		fontSize: 11,
		color: '#137333',
		fontWeight: '800',
	},
	taskTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
		lineHeight: 18,
		minHeight: 36,
	},
	penaltyTitle: {
		color: '#991b1b',
	},
	taskPoints: {
		fontSize: 13,
		fontWeight: '800',
		color: '#10b981',
		marginTop: 6,
		marginBottom: spacing.md,
	},
	cardActionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	trashMiniButton: {
		padding: 8,
		borderRadius: 12,
		backgroundColor: '#f1f5f9',
	},
	addButton: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: '#10b981',
		paddingVertical: 8,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 6,
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 5,
		elevation: 2,
	},
	requestButtonColor: {
		backgroundColor: colors.accent,
		shadowColor: colors.accent,
	},
	addButtonText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '800',
	},
	disabledPenaltiesBlock: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: 20,
		padding: spacing.xl,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#cbd5e1',
		marginTop: spacing.sm,
	},
	disabledPenaltiesText: {
		marginTop: spacing.sm,
		fontSize: 12,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: spacing.sm,
	},
	subTabsContainer: {
		flexDirection: 'row',
		marginVertical: spacing.md,
		backgroundColor: '#e2e8f0',
		borderRadius: 14,
		padding: 4,
	},
	subTabButton: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 12,
	},
	subTabButtonActive: {
		backgroundColor: colors.surface,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	subTabButtonText: {
		fontSize: 12,
		color: colors.muted,
		fontWeight: '700',
	},
	subTabButtonTextActive: {
		color: colors.text,
		fontWeight: '800',
	},
	unlocksList: {
		marginTop: spacing.xs,
	},
	unlockRow: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 22,
		padding: spacing.md,
		marginBottom: spacing.sm,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.02,
		shadowRadius: 4,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	unlockRowCompleted: {
		backgroundColor: '#f0fdf4',
		borderColor: '#bbf7d0',
		borderWidth: 1.5,
	},
	unlockIconCol: {
		width: 46,
		height: 44,
		borderRadius: 14,
		backgroundColor: '#f1f5f9',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: spacing.md,
	},
	unlockEmoji: {
		fontSize: 24,
	},
	unlockContentCol: {
		flex: 1,
		marginRight: spacing.sm,
	},
	unlockTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: colors.text,
	},
	unlockTitleCompleted: {
		color: '#15803d',
	},
	unlockDesc: {
		fontSize: 11,
		color: colors.muted,
		marginTop: 4,
		lineHeight: 16,
	},
	unlockPointsAward: {
		fontSize: 11,
		color: colors.accent,
		fontWeight: '700',
		marginTop: 4,
	},
	unlockActionCol: {
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	completedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#dcfce7',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	completedBadgeText: {
		fontSize: 10,
		color: '#15803d',
		fontWeight: '800',
		marginLeft: 3,
	},
	unlockButton: {
		backgroundColor: colors.accent,
		borderRadius: 12,
		paddingVertical: 8,
		paddingHorizontal: 14,
		justifyContent: 'center',
		alignItems: 'center',
	},
	unlockButtonText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '800',
	},
	quizSelectionGrid: {
		marginTop: spacing.sm,
	},
	quizTopicCard: {
		backgroundColor: colors.surface,
		borderRadius: 24,
		padding: spacing.lg,
		marginBottom: spacing.md,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 8,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	quizTopicEmoji: {
		fontSize: 48,
		marginBottom: spacing.xs,
	},
	quizTopicTitle: {
		fontSize: 16,
		fontWeight: '800',
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
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 24,
		width: '100%',
		alignItems: 'center',
		shadowColor: '#2563eb',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 3,
	},
	startQuizButtonText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '800',
	},
	quizInterfaceCard: {
		backgroundColor: colors.surface,
		borderRadius: 24,
		padding: spacing.md,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.05,
		shadowRadius: 15,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	quizInterfaceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
		paddingBottom: spacing.sm,
		marginBottom: spacing.md,
	},
	quizTopicHeaderTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: colors.text,
	},
	quitQuizMiniBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 10,
		backgroundColor: '#f1f5f9',
	},
	quitQuizMiniBtnTxt: {
		fontSize: 11,
		color: '#ef4444',
		fontWeight: '800',
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
		fontWeight: '700',
		marginBottom: 6,
	},
	progressBarBg: {
		height: 8,
		backgroundColor: '#f1f5f9',
		borderRadius: 4,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	questionText: {
		fontSize: 16,
		fontWeight: '800',
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
		borderRadius: 16,
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
		width: 20,
		height: 18,
		borderRadius: 10,
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
		fontWeight: '500',
	},
	optionTextSelected: {
		color: colors.accent,
		fontWeight: '700',
	},
	nextQuestionButton: {
		backgroundColor: colors.accent,
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextQuestionButtonDisabled: {
		backgroundColor: '#cbd5e1',
	},
	nextQuestionButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '800',
	},
	quizCompletedBody: {
		alignItems: 'center',
		paddingVertical: spacing.lg,
	},
	trophyIconContainer: {
		width: 84,
		height: 84,
		borderRadius: 42,
		backgroundColor: '#fffbeb',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: spacing.md,
		shadowColor: '#f59e0b',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 2,
	},
	quizResultPercent: {
		fontSize: 24,
		fontWeight: '900',
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
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 14,
		marginBottom: spacing.lg,
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 3,
	},
	quizRewardBadgeText: {
		color: '#ffffff',
		fontWeight: '800',
		fontSize: 13,
		marginLeft: 6,
	},
	quizBackToListBtn: {
		borderWidth: 1.5,
		borderColor: colors.accent,
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 22,
	},
	quizBackToListBtnText: {
		color: colors.accent,
		fontWeight: '800',
		fontSize: 13,
	},
	rewardCard: {
		width: '47%',
		backgroundColor: colors.surface,
		borderRadius: 24,
		padding: spacing.md,
		margin: '1.5%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#f1f5f9',
		position: 'relative',
	},
	rewardCardClaimed: {
		backgroundColor: '#f1f5f9',
		borderColor: '#cbd5e1',
		borderWidth: 1.5,
	},
	rewardCardCantAfford: {
		opacity: 0.75,
	},
	rewardEmojiContainer: {
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: '#f8fafc',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: spacing.sm,
	},
	rewardEmoji: {
		fontSize: 30,
	},
	rewardTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.text,
		textAlign: 'center',
		marginBottom: 4,
		minHeight: 36,
	},
	rewardCost: {
		fontSize: 13,
		color: colors.accent,
		fontWeight: '900',
		marginBottom: spacing.md,
	},
	claimButton: {
		borderRadius: 12,
		paddingVertical: 10,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	claimButtonEnabled: {
		backgroundColor: '#10b981',
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 2,
	},
	claimButtonDisabled: {
		backgroundColor: '#e2e8f0',
	},
	claimedButtonState: {
		backgroundColor: '#cbd5e1',
	},
	claimButtonText: {
		fontSize: 11,
		fontWeight: '800',
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
		borderRadius: 12,
		width: 22,
		height: 22,
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
		borderRadius: 20,
		marginBottom: spacing.sm,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.02,
		shadowRadius: 4,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#f1f5f9',
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
		fontWeight: '800',
		color: colors.text,
	},
	dayHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sumPositiveText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#137333',
		marginRight: 6,
		backgroundColor: '#e6f4ea',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
	},
	sumNegativeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#c5221f',
		marginRight: 10,
		backgroundColor: '#fce8e6',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
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
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	logItemRowLast: {
		borderBottomWidth: 0,
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
		fontWeight: '700',
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
		fontWeight: '800',
	},
	emptyHistoryState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 50,
	},
	emptyHistoryText: {
		marginTop: spacing.md,
		fontSize: 12,
		color: colors.muted,
		textAlign: 'center',
	},
	// MODERN PREMIUM BOTTOM APP BAR STYLES
	bottomAppBarContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'transparent',
		paddingHorizontal: spacing.md,
		paddingBottom: Platform.OS === 'ios' ? 24 : 12,
	},
	bottomAppBar: {
		flexDirection: 'row',
		backgroundColor: '#ffffff',
		borderRadius: 24,
		paddingVertical: 8,
		paddingHorizontal: spacing.sm,
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	appBarItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 6,
		position: 'relative',
	},
	appBarItemActive: {
		transform: [{ scale: 1.05 }],
	},
	appBarItemLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: '#64748b',
		marginTop: 3,
	},
	appBarItemLabelActive: {
		color: colors.accent,
		fontWeight: '800',
	},
	activeIndicatorDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.accent,
		position: 'absolute',
		bottom: -2,
	},
	// TOAST STYLES
	toastContainer: {
		position: 'absolute',
		bottom: 90, // Positioned safely above bottom app bar
		left: 20,
		right: 20,
		backgroundColor: '#10b981',
		borderRadius: 16,
		paddingVertical: 14,
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
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
		fontWeight: '800',
		fontSize: 12,
		flex: 1,
	},
	// MODAL STYLES
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.45)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: spacing.md,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderRadius: 28,
		width: '100%',
		maxWidth: 400,
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.15,
		shadowRadius: 24,
		elevation: 10,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: colors.text,
	},
	modalBody: {
		padding: spacing.md,
	},
	inputLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.text,
		marginBottom: 6,
		marginTop: 8,
	},
	textInput: {
		backgroundColor: '#f8fafc',
		borderWidth: 1.5,
		borderColor: '#e2e8f0',
		borderRadius: 14,
		paddingHorizontal: spacing.md,
		paddingVertical: 12,
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
		borderRadius: 14,
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
		fontSize: 24,
	},
	modalFooter: {
		flexDirection: 'row',
		padding: spacing.md,
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		justifyContent: 'flex-end',
	},
	modalBtn: {
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 14,
		marginLeft: spacing.sm,
	},
	modalBtnCancel: {
		backgroundColor: '#f1f5f9',
	},
	modalBtnCancelText: {
		color: colors.muted,
		fontSize: 13,
		fontWeight: '700',
	},
	modalBtnSubmit: {
		backgroundColor: colors.accent,
	},
	modalBtnSubmitText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '800',
	},
	claimConfirmRewardTitle: {
		fontSize: 17,
		fontWeight: '800',
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
	// PIN & SETTINGS SPECIAL STYLES
	pinInstructions: {
		fontSize: 12,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: spacing.md,
	},
	pinInput: {
		backgroundColor: '#f1f5f9',
		borderWidth: 2,
		borderColor: colors.accent,
		borderRadius: 16,
		fontSize: 24,
		fontWeight: '900',
		textAlign: 'center',
		paddingVertical: 12,
		letterSpacing: 8,
		color: colors.text,
		width: '100%',
		marginBottom: spacing.sm,
	},
	pinErrorText: {
		color: '#ef4444',
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: 4,
	},
});
