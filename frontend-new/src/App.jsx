import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dumbbell, ShoppingBag, User, Plus, Clock, Play, ChevronRight, ChevronLeft,
  MoreHorizontal, Search, Home, Star, Crown, Check, X, Trash2, Edit3, Save,
  Shield, UserCheck, UserX, Wallet, ArrowUpRight, ArrowDownLeft, History, LayoutList,
  MessageCircle, Send, Filter, BadgeCheck, Users, TrendingUp, Timer, Trophy,
  Minimize2, Maximize2, ChevronDown, Award, Bell, Settings, Camera, Upload
} from 'lucide-react';
import Snowflakes from './components/Snowflakes';
import ConfirmationModal from './components/ConfirmationModal';
import { useCloudStorage } from './hooks/useCloudStorage';
import { useApiRetry } from './hooks/useApiRetry';
import ProgramEditor from './components/ProgramEditor';
import ActiveWorkout from './components/ActiveWorkout';
import Feed from './components/Feed';

const tg = window.Telegram?.WebApp;
const ADMIN_ID = Number(import.meta.env.VITE_ADMIN_ID || 6540555219);
const API_URL = import.meta.env.VITE_API_URL || 'https://fitness-backendnew.replit.app/api';

// Список популярных упражнений по категориям
const EXERCISE_LIST = {
  'Грудь': ['Жим лёжа', 'Жим гантелей', 'Разводка гантелей', 'Отжимания', 'Жим в тренажёре', 'Кроссовер'],
  'Спина': ['Тяга штанги в наклоне', 'Подтягивания', 'Тяга верхнего блока', 'Тяга гантели', 'Становая тяга', 'Гиперэкстензия'],
  'Плечи': ['Жим стоя', 'Жим сидя', 'Махи гантелями в стороны', 'Махи перед собой', 'Тяга к подбородку'],
  'Руки': ['Подъём штанги на бицепс', 'Молотки', 'Французский жим', 'Разгибания на трицепс', 'Отжимания на брусьях'],
  'Ноги': ['Приседания со штангой', 'Жим ногами', 'Выпады', 'Разгибания ног', 'Сгибания ног', 'Подъём на носки'],
  'Кор': ['Планка', 'Скручивания', 'Подъём ног', 'Русские скручивания', 'Вакуум'],
  'Кардио': ['Бег', 'Велотренажёр', 'Эллипс', 'Скакалка', 'Бёрпи'],
};

// Эмодзи для категорий упражнений
const CATEGORY_EMOJIS = {
  'Грудь': '🏋️',
  'Спина': '🔙',
  'Плечи': '💪',
  'Руки': '💪',
  'Ноги': '🦵',
  'Кор': '🎯',
  'Кардио': '🏃',
  'Все': '📋',
};

const getTelegramUser = () => {
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    return { id: u.id, firstName: u.first_name || '', lastName: u.last_name || '', username: u.username || '', photoUrl: u.photo_url || null };
  }
  return null;
};

const normalizeProgram = (prog, { fallbackAuthorId } = {}) => {
  if (!prog || typeof prog !== 'object') return prog;

  const exercises = Array.isArray(prog.exercises)
    ? prog.exercises
    : Array.isArray(prog.workouts)
      ? prog.workouts
      : [];

  const authorId = prog.authorId ?? prog.author_id ?? prog.author?.id ?? fallbackAuthorId ?? null;
  const author = prog.author ?? prog.authorName ?? prog.author_name ?? prog.author?.name ?? prog.author?.username ?? '';
  const category = prog.category ?? prog.category_name ?? prog.categoryName ?? prog.category;
  const price = typeof prog.price === 'number' ? prog.price : parseFloat(prog.price) || 0;

  return {
    ...prog,
    exercises,
    authorId,
    author,
    category,
    price,
  };
};

const mergeProgramsById = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return Array.from(map.values());
};

export default function App() {
  const { fetchWithRetry } = useApiRetry();
  const storage = useCloudStorage();
  const [user, setUser] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: true, confirmText: 'Подтвердить' });
  const [lastReadSupportId, setLastReadSupportId] = useState(localStorage.getItem('lastReadSupportId') || '');
  const [newMessage, setNewMessage] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [trainerPrograms, setTrainerPrograms] = useState([]);
  const [purchasedPrograms, setPurchasedPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRegistration, setNeedsRegistration] = useState(false); // Показать экран регистрации

  const [editingProgram, setEditingProgram] = useState(null);
  const [showProgramEditor, setShowProgramEditor] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutMinimized, setWorkoutMinimized] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [activeCardioTimer, setActiveCardioTimer] = useState(null); // { exIdx, setIdx }
  const timerRef = useRef(null);
  const cardioTimerRef = useRef(null);

  const [workoutHistory, setWorkoutHistory] = useState([]);

  // Load history and programs from cloud/local storage
  useEffect(() => {
    storage.getItem('workoutHistory').then(data => {
      if (Array.isArray(data)) setWorkoutHistory(data);
    });

    // Загрузка программ из кеша при старте (Fix F5 data loss)
    storage.getItem('user_programs').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        console.log('📦 Loaded programs from cache:', data.length);
        setPrograms(data);
      }
    });
  }, [storage]);

  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [exerciseRecords, setExerciseRecords] = useState({});

  const [userRole, setUserRole] = useState('user');
  const [allUsers, setAllUsers] = useState([]);
  const [trainerRequests, setTrainerRequests] = useState([]);

  const [userBalance, setUserBalance] = useState(0);
  const [balanceHistory, setBalanceHistory] = useState([]);

  const [marketPrograms, setMarketPrograms] = useState([]);
  const [marketFilter, setMarketFilter] = useState('Все');
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [selectorTargetIndex, setSelectorTargetIndex] = useState(null); // Index of exercise being edited
  const [searchQuery, setSearchQuery] = useState('');

  // Форма заявки на тренера
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [trainerBio, setTrainerBio] = useState('');
  const [trainerExperience, setTrainerExperience] = useState('');
  const [trainerSpecializations, setTrainerSpecializations] = useState([]);
  const [trainerCertPhoto, setTrainerCertPhoto] = useState('');
  const [viewingRequest, setViewingRequest] = useState(null); // Для модалки деталей заявки
  const [rejectingRequest, setRejectingRequest] = useState(null); // Для модалки отказа
  const [rejectReason, setRejectReason] = useState(''); // Причина отказа

  // Пагинация
  const ITEMS_PER_PAGE = 5;
  const [chatsPage, setChatsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [moderatorsPage, setModeratorsPage] = useState(1);
  const [trainersPage, setTrainersPage] = useState(1);
  const [marketPage, setMarketPage] = useState(1);

  const openConfirm = (title, message, onConfirm, isDanger = true, confirmText = 'Подтвердить') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDanger,
      confirmText
    });
  };

  const getInitData = useCallback(() => {
    // Always get fresh reference to Telegram WebApp (may not be ready at module load time)
    const freshTg = window.Telegram?.WebApp;
    return freshTg?.initData ||
      `user=${encodeURIComponent(JSON.stringify({ id: user?.id || 0, first_name: user?.firstName || 'Guest' }))}`;
  }, [user?.firstName, user?.id]);

  const refreshUserFromServer = useCallback(async ({ allowRegistrationFallback = false, markLoaded = false } = {}) => {

    try {
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { 'x-telegram-init-data': getInitData() },
      });

      if (response.status === 403) {
        if (allowRegistrationFallback) {
          let data = null;
          try {
            data = await response.json();
          } catch (_) { /* ignore */ }

          if (data?.error === 'not_registered') {
            setNeedsRegistration(true);
            if (markLoaded) setIsLoading(false);
            return null;
          }
        }
        return null;
      }

      if (!response.ok) {
        // Не даём никаких привилегий при ошибке
        return null;
      }

      const data = await response.json();
      if (data.user) {
        const serverRole = data.user.role?.toLowerCase();
        let newRole = 'user';
        if (serverRole === 'admin' || serverRole === 'moderator') {
          newRole = 'moderator';
        } else if (serverRole === 'trainer') {
          newRole = 'trainer';
        }

        // Проверяем, была ли роль понижена (безопасность)
        const roleHierarchy = { 'user': 0, 'trainer': 1, 'moderator': 2 };
        if (roleHierarchy[newRole] < roleHierarchy[userRole]) {
          // Роль понижена — принудительно обновляем страницу
          console.log('🔒 Role revoked, reloading page...');
          window.location.reload();
          return null;
        }

        setUserRole(newRole);

        if (data.user.lastSeenNewsId) {
          setLastSeenNewsId(data.user.lastSeenNewsId);
        }

        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            displayName: data.user.displayName ?? prev.displayName,
            avatarUrl: data.user.avatarUrl ?? prev.avatarUrl,
          };
        });

        if (typeof data.user.balance === 'number') {
          setUserBalance(data.user.balance);
        }

        setNeedsRegistration(false);
      }

      if (markLoaded) setIsLoading(false);
      return data.user;
    } catch (e) {
      console.error('Error fetching user info:', e);
      const fallbackId = tg?.initDataUnsafe?.user?.id || user?.id;
      if (fallbackId === ADMIN_ID) {
        setUserRole('moderator');
      }
      if (markLoaded) setIsLoading(false);
      return null;
    }
  }, [getInitData, user?.id, userRole]);

  const loadDataFromServer = useCallback(async () => {
    try {
      const currentUserId = tg?.initDataUnsafe?.user?.id || user?.id;

      const programsRes = await fetchWithRetry(`${API_URL}/programs/my`);
      if (programsRes.ok) {
        const data = await programsRes.json();
        if (data.success && data.programs) {
          const loadedPrograms = data.programs.map(p => normalizeProgram({ ...p, isPersonal: true }, { fallbackAuthorId: currentUserId }));
          setPrograms(loadedPrograms);
          storage.setItem('user_programs', loadedPrograms);
        }
      }

      const purchasedRes = await fetchWithRetry(`${API_URL}/purchases`);
      if (purchasedRes.ok) {
        const data = await purchasedRes.json();
        if (data.success && data.programs) {
          setPurchasedPrograms(data.programs.map(p => normalizeProgram(p)));
        }
      }

      const historyRes = await fetchWithRetry(`${API_URL}/workouts/history`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (data.success && data.history) setWorkoutHistory(data.history);
      }

      const recordsRes = await fetchWithRetry(`${API_URL}/workouts/records`);
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        if (data.success && data.records) setExerciseRecords(data.records);
      }
    } catch (error) {
      console.error('Error loading data from server:', error);
    }
  }, [fetchWithRetry, user?.id]);

  // Периодическая проверка сообщений поддержки (только для обычных пользователей)
  useEffect(() => {
    const isModeratorForSupport = userRole === 'moderator' || user?.id === ADMIN_ID;
    if (user?.id && !isModeratorForSupport) {
      fetchMySupportMessages();
      const interval = setInterval(fetchMySupportMessages, 7000);
      return () => clearInterval(interval);
    }
  }, [user?.id, userRole]);


  // Обновляем прочитанное при входе в таб
  useEffect(() => {
    if (activeTab === 'support' && supportMessages.length > 0) {
      // Find latest message relevant to me
      const myMsgs = supportMessages.filter(m => m.from == user?.id || m.to == user?.id);
      if (myMsgs.length > 0) {
        const lastMsg = myMsgs[myMsgs.length - 1];
        if (lastMsg.from === 'support') {
          const newId = String(lastMsg.id || Date.now());
          setLastReadSupportId(newId);
          localStorage.setItem('lastReadSupportId', newId);
        }
      }
    }
  }, [activeTab, supportMessages, user?.id]);

  // Настройки комиссии и вывода
  const [withdrawalFee, setWithdrawalFee] = useState(3); // % комиссии
  const [adminBalance, setAdminBalance] = useState(0); // Баланс админа от комиссий
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]); // Заявки на вывод
  const [myWithdrawalRequests, setMyWithdrawalRequests] = useState([]); // Мои заявки на вывод
  const [appBalance, setAppBalance] = useState(null); // Баланс приложения CryptoBot

  // Уведомления и новости
  const [notifications, setNotifications] = useState([]); // Персональные уведомления
  const [news, setNews] = useState([]); // Новости от модераторов
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [lastSeenNewsId, setLastSeenNewsId] = useState(''); // ID последней прочитанной новости (с сервера)
  const [showNewYearTheme, setShowNewYearTheme] = useState(true); // Новогодняя тема
  const [newProgramExercises, setNewProgramExercises] = useState([]); // Упражнения для новой программы

  // Настройки профиля
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Итоги тренировки
  const [workoutSummary, setWorkoutSummary] = useState(null);

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }

    const tgUser = getTelegramUser();
    if (tgUser?.id) {
      if (!user || user.id !== tgUser.id) {
        setUser(tgUser);
        setUserBalance(0);
      }
      refreshUserFromServer({ allowRegistrationFallback: true, markLoaded: true });
    } else if (!user) {
      setUser({ id: 0, firstName: 'Гость', lastName: '', username: 'guest', photoUrl: null });
      setIsLoading(false);
    }

    if (tgUser?.id) {
      loadDataFromServer();
    }

    // seenNewsCount теперь сбрасывается при открытии модального окна

    setMarketPrograms([
      {
        id: 'm1', title: 'Набор массы PRO', author: 'Алексей Тренер', authorId: 123, category: 'Масса', price: 199, rating: 4.8, reviews: 124, isPro: true, exercises: [
          { name: 'Жим лёжа', sets: 4, reps: '8-10', weight: '60' },
          { name: 'Тяга штанги', sets: 4, reps: '8-10', weight: '50' },
          { name: 'Приседания', sets: 4, reps: '10-12', weight: '70' },
        ]
      },
      {
        id: 'm2', title: 'Жиросжигание', author: 'Мария Фит', authorId: 456, category: 'Похудение', price: 99, rating: 4.6, reviews: 89, isPro: false, exercises: [
          { name: 'Бёрпи', sets: 3, reps: '15', weight: '' },
          { name: 'Скакалка', sets: 3, reps: '100', weight: '' },
        ]
      },
      {
        id: 'm3', title: 'Силовая 5x5', author: 'Иван Сила', authorId: 789, category: 'Сила', price: 0, rating: 4.9, reviews: 256, isPro: false, exercises: [
          { name: 'Присед', sets: 5, reps: '5', weight: '100' },
          { name: 'Жим', sets: 5, reps: '5', weight: '80' },
          { name: 'Тяга', sets: 5, reps: '5', weight: '120' },
        ]
      },
    ]);

    setIsLoading(false);
  }, [loadDataFromServer, refreshUserFromServer, user?.id]);

  useEffect(() => {
    if (activeWorkout && !workoutMinimized) {
      timerRef.current = setInterval(() => setWorkoutTimer(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeWorkout, workoutMinimized]);

  useEffect(() => {
    if (activeTab === 'profile') {
      refreshUserFromServer();
      if (userRole === 'trainer') {
        fetchMyWithdrawalRequests();
      }
    }
  }, [activeTab, refreshUserFromServer, userRole]);

  const isAdmin = user?.id === ADMIN_ID;
  // Роли: admin > moderator > trainer > user
  const isModerator = userRole === 'moderator' || isAdmin; // Только модераторы и админы
  const isTrainer = userRole === 'trainer'; // Только тренеры (не включает модераторов!)
  const canSeeTrainerPanel = isTrainer || isModerator; // Кто видит панель тренера
  const moderationWithdrawals = withdrawalRequests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING');

  useEffect(() => {
    if (activeTab !== 'profile' || !isTrainer) return;
    fetchMyWithdrawalRequests();
    const interval = setInterval(fetchMyWithdrawalRequests, 15000);
    return () => clearInterval(interval);
  }, [activeTab, isTrainer, user?.id]);

  useEffect(() => {
    if (isAdmin) setAdminBalance(userBalance);
  }, [isAdmin, userBalance]);

  const savePrograms = (p) => { setPrograms(p); }; // Только локально обновляем UI

  const createProgram = () => {
    setEditingProgram({ id: `prog_${Date.now()}`, title: 'Новая программа', exercises: [], createdAt: new Date().toISOString(), isPersonal: true });
    setShowProgramEditor(true);
  };

  const saveProgramFromEditor = async (prog) => {
    try {
      const isTrainerProgram = prog?.isPersonal === false || trainerPrograms.some(p => p.id === prog.id);

      if (isTrainerProgram) {
        await fetchWithRetry(`${API_URL}/content/programs/${prog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: prog.title,
            workouts: prog.exercises || [],
          })
        });

        const normalized = normalizeProgram(
          { ...prog, isPersonal: false },
          { fallbackAuthorId: user?.id }
        );
        setTrainerPrograms(prev => mergeProgramsById([...prev, normalized]));
        fetchPrograms();
      } else {
        // Оптимистичное обновление UI и кэша
        const exists = programs.find(p => p.id === prog.id);
        const updatedPrograms = exists
          ? programs.map(p => p.id === prog.id ? prog : p)
          : [...programs, prog];

        setPrograms(updatedPrograms);
        storage.setItem('user_programs', updatedPrograms);

        // Фоновое сохранение на сервер
        fetchWithRetry(`${API_URL}/programs/my`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prog.id,
            title: prog.title,
            exercises: prog.exercises
          })
        }).catch(err => {
          console.error('Background save error:', err);
          showToast('⚠️ Сохранено локально (нет связи)', 'warning');
        });
      }
      showToast('✅ Программа сохранена!', 'success');
    } catch (error) {
      console.error('Error saving program:', error);
      showToast('❌ Ошибка сохранения', 'error');
    }
    setShowProgramEditor(false);
    setEditingProgram(null);
  };

  const deleteProgram = async (id) => {
    try {
      const isTrainerProgram = trainerPrograms.some(p => p.id === id);
      if (isTrainerProgram) {
        await deleteProgramOnServer(id);
        setTrainerPrograms(prev => prev.filter(p => p.id !== id));
      } else {
        // Optimistic update
        const updated = programs.filter(p => p.id !== id);
        setPrograms(updated);
        storage.setItem('user_programs', updated);

        fetchWithRetry(`${API_URL}/programs/my/${id}`, { method: 'DELETE' })
          .catch(console.error);
      }
      showToast('🗑️ Программа удалена', 'success');
    } catch (error) {
      console.error('Error deleting program:', error);
      showToast('⚠️ Ошибка удаления', 'error');
    }
    setShowProgramEditor(false);
    setEditingProgram(null);
  };

  const getExerciseRecord = useCallback((exerciseName) => {
    return exerciseRecords[exerciseName] || null;
  }, [exerciseRecords]);

  const updateExerciseRecord = (exerciseName, weight, reps) => {
    if (!exerciseName || typeof exerciseName !== 'string') return false;
    const key = exerciseName.toLowerCase();
    const current = exerciseRecords[key];
    const newWeight = parseFloat(weight) || 0;
    const newReps = parseInt(reps) || 0;

    if (!current || newWeight > current.weight || (newWeight === current.weight && newReps > current.reps)) {
      const newRecords = { ...exerciseRecords, [key]: { weight: newWeight, reps: newReps, date: new Date().toISOString() } };
      setExerciseRecords(newRecords);
      // Рекорды сохраняются на сервер при завершении тренировки
      return true;
    }
    return false;
  };

  const startWorkout = (program) => {
    const exerciseSets = {};
    const normalizedProgram = normalizeProgram(program);
    const exercises = normalizedProgram.exercises || [];
    exercises.forEach((ex, i) => {
      const record = getExerciseRecord(ex.name);
      const isCardio = ex.name === 'Скакалка' || (EXERCISE_LIST['Кардио'] && EXERCISE_LIST['Кардио'].includes(ex.name));

      exerciseSets[i] = Array.from({ length: ex.sets || 3 }, () => ({
        prevWeight: record?.weight || ex.weight || '',
        prevReps: record?.reps || ex.reps || '',
        // For cardio, pre-fill weight with time value from program
        weight: isCardio ? (ex.weight || '60') : '',
        reps: '',
        completed: false
      }));
    });
    setActiveWorkout({ program: normalizedProgram, exerciseSets, startTime: Date.now(), exerciseDetails: [] });
    setWorkoutMinimized(false);
    setWorkoutTimer(0);
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;

    let totalVolume = 0, totalSets = 0;
    const exerciseDetails = [];

    Object.entries(activeWorkout.exerciseSets || {}).forEach(([exIdx, sets]) => {
      const exercise = activeWorkout.program.exercises[exIdx];
      const completedSets = [];

      sets.forEach((s, setIdx) => {
        if (s.completed) {
          totalSets++;
          // Если вес не введен, пробуем взять предыдущий
          const w = parseFloat(s.weight) || parseFloat(s.prevWeight) || 0;
          const r = parseInt(s.reps) || parseInt(s.prevReps) || 0;
          totalVolume += w * r;
          completedSets.push({ set: setIdx + 1, weight: w, reps: r });

          if (exercise?.name) {
            updateExerciseRecord(exercise.name, w, r);
          }
        }
      });

      if (completedSets.length > 0 && exercise) {
        exerciseDetails.push({ name: exercise.name, sets: completedSets });
      }
    });

    const record = {
      id: `wh_${Date.now()}`,
      programTitle: activeWorkout.program.title,
      duration: workoutTimer,
      volume: totalVolume,
      totalSets: totalSets,
      exercises: exerciseDetails,
      date: new Date().toISOString()
    };

    const newHistory = [record, ...workoutHistory];
    setWorkoutHistory(newHistory);
    storage.setItem('workoutHistory', newHistory).catch(console.error);

    // Сохраняем тренировку на сервер
    try {
      await fetchWithRetry(`${API_URL}/workouts/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: activeWorkout.program.id,
          workoutTitle: activeWorkout.program.title,
          exercises: exerciseDetails,
          duration: workoutTimer,
          volume: totalVolume,
          records: exerciseRecords,
        })
      });
    } catch (error) {
      console.error('Error saving workout to server:', error);
      showToast('⚠️ Сохранено локально', 'warning');
    }

    setWorkoutSummary({
      duration: workoutTimer,
      volume: totalVolume,
      sets: totalSets,
      title: activeWorkout.program.title
    });
    setActiveWorkout(null);
    setWorkoutMinimized(false);
  };

  const playTimerFinishedSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };


  const toggleCardioTimer = useCallback((exIdx, setIdx) => {
    if (activeCardioTimer?.exIdx === exIdx && activeCardioTimer?.setIdx === setIdx) {
      if (cardioTimerRef.current) clearInterval(cardioTimerRef.current);
      cardioTimerRef.current = null;
      setActiveCardioTimer(null);
    } else {
      if (cardioTimerRef.current) clearInterval(cardioTimerRef.current);

      let startValue = 0;
      setActiveWorkout(prev => {
        if (prev?.exerciseSets?.[exIdx]?.[setIdx]) {
          startValue = parseInt(prev.exerciseSets[exIdx][setIdx].weight) || 0;
        }
        return prev;
      });

      setActiveCardioTimer({ exIdx, setIdx, startValue });

      cardioTimerRef.current = setInterval(() => {
        setActiveWorkout(prev => {
          if (!prev) return prev;
          const newSets = { ...prev.exerciseSets };
          if (!newSets[exIdx]) return prev;
          newSets[exIdx] = [...newSets[exIdx]];

          const s = newSets[exIdx][setIdx];
          const cur = parseInt(s.weight) || 0;

          if (cur <= 0) {
            clearInterval(cardioTimerRef.current);
            cardioTimerRef.current = null;
            playTimerFinishedSound();
            // Restore start value activeCardioTimer logic might need refactoring but this keeps old behavior
            newSets[exIdx][setIdx] = { ...s, weight: startValue, completed: true };
            setActiveCardioTimer(null);
            return { ...prev, exerciseSets: newSets };
          }

          newSets[exIdx][setIdx] = { ...s, weight: cur - 1 };
          return { ...prev, exerciseSets: newSets };
        });
      }, 1000);
    }
  }, [activeCardioTimer]);

  const updateWorkoutSet = useCallback((exIdx, setIdx, field, value) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const newSets = { ...prev.exerciseSets };
      newSets[exIdx] = [...(newSets[exIdx] || [])];
      if (newSets[exIdx][setIdx]) {
        newSets[exIdx][setIdx] = { ...newSets[exIdx][setIdx], [field]: value };
      }
      return { ...prev, exerciseSets: newSets };
    });
  }, []);

  const addWorkoutSet = useCallback((exIdx) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const newSets = { ...prev.exerciseSets };
      const currentSets = newSets[exIdx] || [];
      const last = currentSets[currentSets.length - 1];
      newSets[exIdx] = [...currentSets, { prevWeight: last?.prevWeight || '', prevReps: last?.prevReps || '', weight: '', reps: '', completed: false }];
      return { ...prev, exerciseSets: newSets };
    });
  }, []);

  const updateBalance = (userId, amount) => {
    // Баланс управляется через сервер (CryptoBot API)
    if (userId === user?.id) setUserBalance(prev => prev + amount);
    return userBalance + amount;
  };

  const fetchAppBalance = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/crypto/balance`);
      const data = await response.json();
      const usdt = data.find(c => c.currency_code === 'USDT');
      setAppBalance(usdt ? parseFloat(usdt.available) : 0);
    } catch (e) {
      console.error('Error fetching balance:', e);
    }
  };

  const fetchWithdrawalFee = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/settings/withdrawal-fee`);
      if (response.ok) {
        const data = await response.json();
        if (typeof data.percent === 'number') {
          setWithdrawalFee(data.percent);
        }
      }
    } catch (e) {
      console.error('Error fetching withdrawal fee:', e);
    }
  };

  const saveWithdrawalFee = async (percent) => {
    if (!isAdmin) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/settings/withdrawal-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Ошибка сохранения комиссии', 'error');
        return;
      }
      showToast('✅ Комиссия обновлена', 'success');
      if (typeof data.percent === 'number') {
        setWithdrawalFee(data.percent);
      }
    } catch (e) {
      console.error('Error saving withdrawal fee:', e);
      showToast('Ошибка сети', 'error');
    }
  };

  const fetchWithdrawalRequests = async () => {
    if (!isModerator) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals/pending`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.requests)) {
          setWithdrawalRequests(data.requests);
        }
      }
    } catch (e) {
      console.error('Error fetching withdrawals:', e);
    }
  };

  const fetchMyWithdrawalRequests = async () => {
    if (!user?.id || user?.id === 0) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals/my`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.requests)) {
          setMyWithdrawalRequests(data.requests);
        }
      }
    } catch (e) {
      console.error('Error fetching my withdrawals:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'moderator' && (isAdmin || isModerator)) {
      fetchAppBalance();
      fetchWithdrawalRequests();
    }
  }, [activeTab, isAdmin, isModerator]);
  // Загрузка новостей с сервера
  const fetchNews = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/news`);
      const data = await response.json();
      if (Array.isArray(data)) setNews(data);
    } catch (e) {
      console.error('Error fetching news:', e);
    }
  };

  // Создание новости на сервере
  const createNewsOnServer = async (title, content) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await response.json();
      if (data.success) {
        fetchNews(); // Обновляем список
        return true;
      }
      showToast(data.error || 'Ошибка создания новости', 'error');
      return false;
    } catch (e) {
      console.error('Error creating news:', e);
      return false;
    }
  };

  // Удаление новости на сервере
  const deleteNewsOnServer = async (id) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/news/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) fetchNews();
    } catch (e) {
      console.error('Error deleting news:', e);
    }
  };

  // Загрузка программ с сервера
  const fetchPrograms = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/programs`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data.map(p => normalizeProgram(p));
        // Объединяем с хардкодными программами маркета
        setMarketPrograms(prev => {
          const hardcoded = prev.filter(p => p.id.startsWith('m'));
          return [...hardcoded, ...normalized];
        });
      }
    } catch (e) {
      console.error('Error fetching programs:', e);
    }
  };

  const fetchTrainerPrograms = async () => {
    if (!user?.id) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/trainer/programs`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.programs)) {
        const normalized = data.programs
          .map(p => normalizeProgram(p, { fallbackAuthorId: user?.id }))
          .filter(p => p && p.isPersonal !== true);
        setTrainerPrograms(normalized);
      }
    } catch (e) {
      console.error('Error fetching trainer programs:', e);
    }
  };

  useEffect(() => {
    if (!canSeeTrainerPanel || !user?.id) return;
    fetchTrainerPrograms();
  }, [canSeeTrainerPanel, user?.id]);

  // Создание программы на сервере
  const createProgramOnServer = async (progData) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...progData,
          workouts: progData.workouts ?? progData.exercises,
          isPublished: progData.isPublished ?? true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchPrograms();
        const normalized = normalizeProgram(data.program, { fallbackAuthorId: user?.id });
        setTrainerPrograms(prev => mergeProgramsById([...prev, normalized]));
        return true;
      }
      showToast(data.error || 'Ошибка создания программы', 'error');
      return false;
    } catch (e) {
      console.error('Error creating program:', e);
      return false;
    }
  };

  // Удаление программы на сервере
  const deleteProgramOnServer = async (id) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/programs/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPrograms();
        setTrainerPrograms(prev => prev.filter(p => p.id !== id));
        setPrograms(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error('Error deleting program:', e);
    }
  };

  // Загружаем новости и программы при старте и обновляем каждые 30 секунд
  useEffect(() => {
    fetchNews();
    fetchPrograms();
    fetchWithdrawalFee();
    if (isModerator || user?.id === ADMIN_ID) {
      fetchTrainerRequests();
      fetchSupportMessages();
      fetchRoles();
      fetchWithdrawalRequests();
    } else if (user?.id) {
      fetchMySupportMessages();
    }

    const fetchNewYearTheme = async () => {
      try {
        const response = await fetchWithRetry(`${API_URL}/settings/new-year-theme`);
        if (response.ok) {
          const data = await response.json();
          setShowNewYearTheme(data.enabled);
        }
      } catch (e) {
        console.error('Error fetching new year theme:', e);
      }
    };

    fetchNewYearTheme();
    refreshUserFromServer();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUserFromServer();
        loadDataFromServer();
        fetchNews();
        fetchPrograms();
        fetchNewYearTheme();
        fetchWithdrawalFee();
        if (isModerator || user?.id === ADMIN_ID) {
          fetchTrainerRequests();
          fetchSupportMessages();
          fetchRoles();
          fetchWithdrawalRequests();
        } else if (user?.id) {
          fetchMySupportMessages();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Умный polling: 7 сек для активной вкладки, 60 сек для неактивной
    let newsInterval;
    const startPolling = () => {
      if (newsInterval) clearInterval(newsInterval);
      const interval = document.hidden ? 60000 : 7000; // 60 сек неактивная, 7 сек активная
      newsInterval = setInterval(() => {
        fetchNews();
        refreshUserFromServer();
        loadDataFromServer();
        fetchNewYearTheme();
        if (isModerator || user?.id === ADMIN_ID) {
          fetchTrainerRequests();
          fetchSupportMessages();
          fetchRoles();
          fetchWithdrawalRequests();
        }
      }, interval);
    };

    startPolling();
    const visibilityPolling = () => startPolling();
    document.addEventListener('visibilitychange', visibilityPolling);

    return () => {
      clearInterval(newsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('visibilitychange', visibilityPolling);
    };
  }, [isModerator, loadDataFromServer, refreshUserFromServer, user?.id]);

  const addBalanceTransaction = (type, amount, desc) => {
    const tx = { id: `tx_${Date.now()}`, type, amount, description: desc, date: new Date().toISOString(), userId: user?.id };
    setBalanceHistory(prev => [tx, ...prev]);
    // История баланса теперь только в памяти (не критично для синхронизации)
  };

  const depositStars = async () => {
    // Пополнение через CryptoBot
    const amount = prompt('Сколько USDT добавить на баланс?\n\n(Минимум 1 USDT)');
    if (!amount || isNaN(amount) || parseFloat(amount) < 1) {
      if (amount) alert('Минимальная сумма: 1 USDT');
      return;
    }

    try {
      // Используем реальный initData или создаём mock для тестирования
      let initData = tg?.initData || '';
      if (!initData && user?.id) {
        // Mock initData для тестирования вне Telegram
        initData = 'user=' + encodeURIComponent(JSON.stringify({ id: user.id, first_name: user.firstName || 'Test' }));
      }

      const response = await fetchWithRetry(`${API_URL}/crypto/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json();

      if (data.payUrl) {
        // Открываем ссылку на оплату в CryptoBot
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(data.payUrl);
        } else {
          window.open(data.payUrl, '_blank');
        }
        alert(`💳 Откройте CryptoBot для оплаты ${amount} USDT\n\nПосле оплаты баланс обновится автоматически.`);
      } else {
        alert('❌ Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('❌ Ошибка подключения к серверу');
    }
  };

  const withdrawStars = async () => {
    // Вывод через CryptoBot (для тренеров и модераторов)
    if (!canSeeTrainerPanel && user?.id !== ADMIN_ID) {
      alert('❌ Вывод доступен только тренерам');
      return;
    }

    const amount = prompt(`Сколько USDT вывести?\n\nДоступно: ${userBalance} ⭐\n\n(1 ⭐ = 1 USDT)\n\nКомиссия: ${withdrawalFee}%`);
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return;
    }

    if (parseFloat(amount) > userBalance) {
      alert('❌ Недостаточно средств!');
      return;
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Ошибка создания заявки');
        return;
      }
      refreshUserFromServer();
      fetchMyWithdrawalRequests();
      if (isModerator) fetchWithdrawalRequests();
      alert(`📋 Заявка на вывод ${amount} USDT создана!\n\nОжидайте одобрения модератором.\n\nКомиссия: ${(parseFloat(amount) * withdrawalFee / 100).toFixed(2)} USDT\nК получению: ${(parseFloat(amount) * (1 - withdrawalFee / 100)).toFixed(2)} USDT`);
    } catch (e) {
      console.error('Withdraw request error:', e);
      alert('❌ Ошибка подключения к серверу');
    }
  };

  const purchaseProgram = async (prog) => {
    const normalized = normalizeProgram(prog);
    const price = normalized.price || 0;

    if (price > 0 && userBalance < price) {
      alert(`Недостаточно ⭐ Stars!\nНужно: ${price}\nУ вас: ${userBalance}\n\nПополните баланс.`);
      return;
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/programs/${normalized.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Ошибка при покупке программы');
        return;
      }

      setPurchasedPrograms(prev => {
        if (prev.some(p => p.id === normalized.id)) return prev;
        return [...prev, { ...normalized, purchasedAt: new Date().toISOString() }];
      });

      if (price > 0) {
        addBalanceTransaction('purchase', price, `Покупка: ${normalized.title}`);
        refreshUserFromServer();
      }

      showToast(`✅ Программа "${normalized.title}" добавлена`, 'success');
    } catch (e) {
      console.error('Error purchasing program:', e);
      alert('Ошибка при покупке программы');
    }
  };

  // Отправить заявку на тренера
  const submitTrainerRequest = async () => {
    const requestData = {
      bio: trainerBio,
      experience: trainerExperience,
      specialization: trainerSpecializations.join(', '),
      certPhotoUrl: trainerCertPhoto,
    };

    try {
      const response = await fetchWithRetry(`${API_URL}/trainer/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.success) {
        showToast('✅ Заявка на тренера отправлена!', 'success');
        setShowTrainerForm(false);
        // Сброс формы
        setTrainerBio('');
        setTrainerExperience('');
        setTrainerSpecializations([]);
        setTrainerCertPhoto(null);
        storage.removeItem('pendingTrainerRequest');
      }
    } catch (e) {
      console.error('Error submitting trainer request:', e);
      storage.setItem('pendingTrainerRequest', requestData).catch(console.error);
      showToast('⚠️ Ошибка сети. Заявка сохранена и будет отправлена при восстановлении связи.', 'warning');
      setShowTrainerForm(false);
    }
  };


  // Одобрение/отклонение заявки (админ/модер)
  const handleTrainerRequest = async (requestId, action) => {
    try {
      const endpoint = action === 'approve'
        ? `${API_URL}/content/trainer-requests/${requestId}/approve`
        : `${API_URL}/content/trainer-requests/${requestId}/reject`;

      const response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`✅ Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`, 'success');
        fetchTrainerRequests(); // Обновить список
      } else {
        showToast(data.error || 'Ошибка', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Ошибка сети', 'error');
    }
  };

  // Одобрить заявку на тренера (API)
  const approveTrainer = async (reqId) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/trainer-requests/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        showToast('✅ Заявка одобрена, пользователь стал тренером!', 'success');
        fetchTrainerRequests();
        fetchRoles();
      } else {
        const data = await response.json();
        showToast(data.error || 'Ошибка одобрения', 'error');
      }
    } catch (e) {
      console.error('Error approving trainer:', e);
      showToast('Ошибка сети', 'error');
    }
  };

  // Отклонить заявку на тренера — открывает модалку для ввода причины
  const rejectTrainer = (reqId) => {
    const req = trainerRequests.find(r => r.id === reqId);
    setRejectingRequest(req);
    setRejectReason('');
  };

  // Подтвердить отклонение с причиной
  const confirmRejectTrainer = async () => {
    if (!rejectingRequest) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/content/trainer-requests/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (response.ok) {
        showToast('Заявка отклонена', 'success');
        fetchTrainerRequests();
      }
    } catch (e) {
      console.error('Error rejecting trainer:', e);
    }
    setRejectingRequest(null);
    setRejectReason('');
  };

  // Загрузить заявки на тренера (API)
  const fetchTrainerRequests = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/trainer-requests`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setTrainerRequests(data.map(r => ({
            id: r.id,
            userId: r.telegram_id,
            username: r.user?.username || r.username || '',
            firstName: r.user?.firstName || r.first_name || '',
            lastName: r.user?.lastName || r.last_name || '',
            bio: r.bio || '',
            experience: r.experience || '',
            specialization: r.specialization || '',
            certPhotoUrl: r.cert_photo_url || '',
            createdAt: r.created_at,
          })));
        }
      }
    } catch (e) {
      console.error('Error fetching trainer requests:', e);
    }
  };

  const [rolesList, setRolesList] = useState([]);

  // Загрузить список ролей (API)
  const fetchRoles = async () => {
    console.log('🔍 fetchRoles called, user?.id:', user?.id, 'ADMIN_ID:', ADMIN_ID, 'isAdmin:', user?.id === ADMIN_ID);
    try {
      // Только админ может видеть полный список ролей
      if (user?.id !== ADMIN_ID) {
        console.log('⚠️ fetchRoles: Not admin, skipping');
        return;
      }

      console.log('✅ fetchRoles: Fetching from API...');
      const response = await fetchWithRetry(`${API_URL}/content/roles`);
      console.log('📡 fetchRoles response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ fetchRoles data:', data);
        setRolesList(data);
      } else {
        const errorText = await response.text();
        console.error('❌ fetchRoles error:', response.status, errorText);
      }
    } catch (e) {
      console.error('❌ Error fetching roles:', e);
    }
  };

  // Состояние для уведомлений
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Назначить роль (добавляет, не заменяет)
  const assignRole = async (telegramId, role) => {
    if (!telegramId) {
      showToast('Введите Telegram ID', 'error');
      return;
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/content/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, role }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message, 'success');
        // Небольшая задержка чтобы база успела обновиться
        await new Promise(r => setTimeout(r, 500));
        await fetchRoles(); // Обновляем список тренеров
        if (isAdmin) fetchAdminData(); // Обновляем админку
      } else {
        showToast(data.error || 'Ошибка назначения', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Ошибка сети', 'error');
    }
  };

  // Снять конкретную роль
  const removeRoleFromUser = async (telegramId, role) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/roles/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, role }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message, 'success');
        fetchRoles(); // Обновляем список без перезагрузки
        // Если снимаем роль с текущего пользователя, обновляем его состояние
        if (telegramId === user?.id) {
          refreshUserFromServer();
        }
      } else {
        showToast(data.error || 'Ошибка снятия роли', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Ошибка сети', 'error');
    }
  };

  // Обёртки для обратной совместимости
  const removeTrainerRole = (userId) => removeRoleFromUser(userId, 'TRAINER');
  const removeModeratorRole = (userId) => removeRoleFromUser(userId, 'MODERATOR');
  const setUserAsModerator = (userId) => assignRole(userId, 'MODERATOR');
  const setManualTrainer = (userId) => assignRole(userId, 'TRAINER');

  // Сохранение профиля
  const saveProfile = async () => {
    if (profileDisplayName.trim().length < 2) {
      showToast('Имя должно содержать минимум 2 символа', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetchWithRetry(`${API_URL}/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profileDisplayName.trim(),
          avatarUrl: profileAvatarUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Профиль сохранён!', 'success');
        // Обновляем локальное состояние
        setUser(prev => ({
          ...prev,
          displayName: data.user?.displayName || profileDisplayName,
          avatarUrl: data.user?.avatarUrl || profileAvatarUrl,
        }));
        setShowProfileSettings(false);
      } else {
        showToast(data.error || 'Ошибка сохранения', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Ошибка сети', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Обработка загрузки аватара
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Только JPG, PNG или WEBP', 'error');
      return;
    }

    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Файл слишком большой (макс 5MB)', 'error');
      return;
    }

    // Конвертируем в Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Сброс аккаунта пользователя (API)
  const resetUserAccount = async (userId) => {
    console.log('🔄 resetUserAccount called with userId:', userId);
    try {
      const response = await fetchWithRetry(`${API_URL}/content/reset-account/${userId}`, {
        method: 'POST',
      });
      console.log('📡 resetUserAccount response status:', response.status);
      const data = await response.json();
      console.log('📦 resetUserAccount response data:', data);
      if (data.success) {
        showToast(`✅ Аккаунт ${userId} сброшен!`, 'success');
      } else {
        showToast(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
      }
    } catch (e) {
      console.error('❌ Error resetting account:', e);
      showToast('❌ Ошибка подключения к серверу', 'error');
    }
  };

  // Отправить сообщение в поддержку (API)
  const sendSupportMessage = async () => {
    if (!newMessage.trim()) return;
    const msgText = newMessage.trim();

    try {
      const response = await fetchWithRetry(`${API_URL}/content/support/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });

      const data = await response.json();
      if (data.success) {
        setSupportMessages(prev => [...prev, {
          id: data.message.id,
          text: data.message.message,
          from: data.message.from_user_id,
          fromName: data.message.from_user_name,
          to: 'support',
          date: data.message.created_at,
        }]);
        setNewMessage('');
      }
    } catch (e) {
      console.error('Error sending support message:', e);
      // Save for later
      const pending = await storage.getItem('pendingSupportMessages') || [];
      const newPending = [...(Array.isArray(pending) ? pending : []), { message: msgText, date: new Date().toISOString() }];
      storage.setItem('pendingSupportMessages', newPending).catch(console.error);

      showToast('⚠️ Сообщение сохранено и будет отправлено позже', 'warning');
      setNewMessage('');
    }
  };

  // Ответить пользователю (API)
  const sendModeratorReply = async (toUserId, text) => {
    if (!text.trim()) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/content/support/reply/${toUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setSupportMessages(prev => [...prev, {
          id: data.message.id,
          text: data.message.message,
          from: 'support',
          fromName: 'Поддержка',
          to: toUserId,
          date: data.message.created_at,
        }]);
      }
    } catch (e) {
      console.error('Error sending moderator reply:', e);
    }
  };

  // Мемоизированные сообщения - группировка и сортировка один раз при изменении supportMessages
  const { messagesByUser, uniqueChatUsers } = React.useMemo(() => {
    const byUser = {};
    const users = {};

    // Сортируем один раз
    const sorted = [...supportMessages].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(m => {
      // Группируем по пользователю
      const key = m.from === 'support' ? m.to : m.from;
      if (!byUser[key]) byUser[key] = [];
      byUser[key].push(m);

      // Собираем уникальных пользователей
      if (m.from !== 'support' && m.from && m.from !== 0) {
        users[m.from] = { id: m.from, name: m.fromName, username: m.fromUsername };
      }
    });

    return { messagesByUser: byUser, uniqueChatUsers: Object.values(users) };
  }, [supportMessages]);

  // Получить сообщения пользователя (теперь без сортировки на каждый вызов)
  const getUserMessages = (userId) => messagesByUser[userId] || [];

  // Получить уникальных пользователей чата (теперь мемоизировано)
  const getUniqueChatUsers = () => uniqueChatUsers;

  // Загрузить сообщения поддержки (API)
  const fetchSupportMessages = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/content/support/messages`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSupportMessages(data.map(m => ({
            id: m.id,
            text: m.message,
            from: m.from_user_id === 0 ? 'support' : m.from_user_id,
            fromName: m.from_user_name,
            fromUsername: m.from_username,
            to: m.to_user_id,
            date: m.created_at,
          })));
        }
      }
    } catch (e) {
      console.error('Error fetching support messages:', e);
    }
  };

  // Загрузить мои сообщения (для обычных пользователей)
  const fetchMySupportMessages = async () => {
    if (!user?.id) return;
    try {
      const response = await fetchWithRetry(`${API_URL}/content/support/messages/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSupportMessages(data.map(m => ({
            id: m.id,
            text: m.message,
            from: m.from_user_id === 0 ? 'support' : m.from_user_id,
            fromName: m.from_user_name,
            fromUsername: m.from_username,
            to: m.to_user_id,
            date: m.created_at,
          })));
        }
      }
    } catch (e) {
      console.error('Error fetching my support messages:', e);
    }
  };

  const filteredMarket = React.useMemo(() =>
    marketPrograms.filter(p => {
      const category = p.category || '';
      const title = (p.title || '').toString();
      if (marketFilter !== 'Все' && category !== marketFilter) return false;
      if (searchQuery && !title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }), [marketPrograms, marketFilter, searchQuery]);

  const personalPrograms = React.useMemo(
    () => programs.filter(p => p?.isPersonal !== false),
    [programs]
  );

  const formatTime = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // === ТРЕБУЕТСЯ РЕГИСТРАЦИЯ ЧЕРЕЗ БОТА ===
  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Требуется регистрация</h1>
          <p className="text-gray-400 mb-6">
            Для использования приложения сначала напишите <span className="text-blue-400 font-bold">/start</span> боту
          </p>
          <button
            onClick={() => {
              // Открыть бота в Telegram
              if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
              }
            }}
            className="w-full bg-blue-500 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-600 transition-colors"
          >
            Перейти к боту
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#1a1a1a] text-gray-400 py-3 rounded-xl mt-3 hover:bg-[#222] transition-colors"
          >
            Я уже зарегистрирован — обновить
          </button>
        </div>
      </div>
    );
  }

  // === РЕДАКТОР ПРОГРАММЫ ===
  if (showProgramEditor && editingProgram) {
    return (
      <ProgramEditor
        program={editingProgram}
        setProgram={setEditingProgram}
        onSave={saveProgramFromEditor}
        onClose={() => { setShowProgramEditor(false); setEditingProgram(null); }}
        onDelete={deleteProgram}
        exerciseList={EXERCISE_LIST}
        categoryEmojis={CATEGORY_EMOJIS}
        programs={programs}
      />
    );
  }

  // === ПРОСМОТР ПРОШЛОЙ ТРЕНИРОВКИ ===
  if (viewingWorkout) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white">
        <div className="sticky top-0 bg-[#0d0d0d] border-b border-white/10 p-4 flex items-center justify-between z-10">
          <button onClick={() => setViewingWorkout(null)} className="flex items-center gap-2 text-gray-400">
            <ChevronLeft className="w-5 h-5" /><span>Назад</span>
          </button>
          <span className="text-gray-500">{(viewingWorkout.date || viewingWorkout.completedAt) ? new Date(viewingWorkout.date || viewingWorkout.completedAt).toLocaleDateString('ru-RU') : '—'}</span>
        </div>

        <div className="p-4">
          <h1 className="text-2xl font-bold mb-2">{viewingWorkout.programTitle}</h1>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
              <Timer className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <div className="font-bold">{formatTime(viewingWorkout.duration)}</div>
              <div className="text-xs text-gray-500">Время</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
              <Dumbbell className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <div className="font-bold">{Math.round(viewingWorkout.volume)} кг</div>
              <div className="text-xs text-gray-500">Объём</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
              <Check className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <div className="font-bold">{viewingWorkout.totalSets}</div>
              <div className="text-xs text-gray-500">Подходов</div>
            </div>
          </div>

          <h3 className="font-semibold text-gray-400 mb-3">УПРАЖНЕНИЯ</h3>

          {viewingWorkout.exercises?.map((ex, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 mb-3">
              <h4 className="font-semibold text-blue-400 mb-3">{ex.name}</h4>
              <div className="space-y-2">
                {ex.sets?.map((s, j) => (
                  <div key={j} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg p-3">
                    <span className="text-gray-500">Сет {s.set}</span>
                    <span className="font-medium">{s.weight} кг × {s.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === АКТИВНАЯ ТРЕНИРОВКА ===
  if (activeWorkout && !workoutMinimized) {
    return (
      <ActiveWorkout
        activeWorkout={activeWorkout}
        updateWorkoutSet={updateWorkoutSet}
        addWorkoutSet={addWorkoutSet}
        finishWorkout={finishWorkout}
        setWorkoutMinimized={setWorkoutMinimized}
        workoutTimer={workoutTimer}
        activeCardioTimer={activeCardioTimer}
        toggleCardioTimer={toggleCardioTimer}
        formatTime={formatTime}
        exerciseList={EXERCISE_LIST}
        getExerciseRecord={getExerciseRecord}
      />
    );
  }

  // === MAIN UI ===
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-24">


      {/* Новогодние снежинки */}
      {showNewYearTheme && <Snowflakes />}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
      />

      {/* Toast уведомления */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-lg shadow-lg transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          } text-white font-medium text-sm`}>
          {toast.message}
        </div>
      )}

      {/* Свёрнутая тренировка */}
      {activeWorkout && workoutMinimized && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-500 p-3 z-50 shadow-lg" onClick={() => setWorkoutMinimized(false)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{activeWorkout.program.title}</p>
                <p className="text-sm text-white/70">Тренировка активна</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-lg">{formatTime(workoutTimer)}</span>
              <Maximize2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* ГЛАВНАЯ */}
      {activeTab === 'home' && (
        <div className={`p-4 ${activeWorkout && workoutMinimized ? 'pt-20' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Привет, {user?.firstName || 'Атлет'}! 💪</h1>
              <p className="text-gray-500">Готов к тренировке?</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Колокольчик уведомлений */}
              <button
                onClick={async () => {
                  setShowNotificationsModal(true);
                  // Отмечаем новости как прочитанные на сервере
                  if (news.length > 0) {
                    const latestNewsId = news[0]?.id;
                    if (latestNewsId && latestNewsId !== lastSeenNewsId) {
                      setLastSeenNewsId(latestNewsId);
                      try {
                        await fetchWithRetry(`${API_URL}/user/seen-news`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ newsId: latestNewsId }),
                        });
                      } catch (e) {
                        console.error('Error marking news as seen:', e);
                      }
                    }
                  }
                }}
                className="relative p-2 rounded-full bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-400" />
                {/* Красная точка если есть новые новости которые пользователь ещё не видел */}
                {news.length > 0 && news[0]?.id !== lastSeenNewsId && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-2 rounded-full">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-yellow-500">{userBalance}</span>
              </div>
            </div>
          </div>

          {workoutHistory.length > 0 && (
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-blue-500/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" />Статистика</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{workoutHistory.length}</div>
                  <div className="text-xs text-gray-400">Тренировок</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{Math.round(workoutHistory.reduce((a, w) => a + (w.volume || 0), 0) / 1000)}т</div>
                  <div className="text-xs text-gray-400">Объём</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{Math.round(workoutHistory.reduce((a, w) => a + (w.duration || 0), 0) / 60)}м</div>
                  <div className="text-xs text-gray-500">Время</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Мои программы</h2>
            <button onClick={createProgram} className="bg-blue-500 text-white p-2 rounded-xl"><Plus className="w-5 h-5" /></button>
          </div>

          {personalPrograms.length === 0 && purchasedPrograms.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center mb-6 border border-white/5">
              <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">У вас пока нет программ</p>
              <button onClick={createProgram} className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium">Создать программу</button>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {[...personalPrograms, ...purchasedPrograms].map(prog => (
                <div key={prog.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{prog.title}</h3>
                    <button onClick={() => { setEditingProgram({ ...prog }); setShowProgramEditor(true); }} className="p-2 hover:bg-white/10 rounded-lg">
                      <Edit3 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{prog.exercises?.length || 0} упражнений</p>
                  <button onClick={() => startWorkout(prog)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <Play className="w-5 h-5" />Начать тренировку
                  </button>
                </div>
              ))}
            </div>
          )}

          {workoutHistory.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Последние тренировки</h2>
              <div className="space-y-2">
                {workoutHistory.slice(0, 5).map(w => (
                  <div key={w.id} onClick={() => setViewingWorkout(w)} className="bg-[#1a1a1a] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{w.programTitle}</p>
                        <p className="text-xs text-gray-500">{(w.date || w.completedAt) ? new Date(w.date || w.completedAt).toLocaleDateString('ru-RU') : '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-400">{formatTime(w.duration)}</p>
                      <p className="text-xs text-gray-500">{Math.round(w.volume)} кг</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* МАРКЕТ */}
      {activeTab === 'market' && (
        <div className={`p-4 ${activeWorkout && workoutMinimized ? 'pt-20' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Маркет</h1>
            <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-2 rounded-full">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-yellow-500">{userBalance}</span>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] pl-10 pr-4 py-3 rounded-xl outline-none border border-white/10 focus:border-blue-500"
              placeholder="Поиск программ..." />
          </div>

          {userRole === 'user' && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-400">Стань тренером!</h3>
                  <p className="text-sm text-gray-400">Продавай свои программы</p>
                </div>
                <button onClick={() => setShowTrainerForm(true)} className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium">Подать</button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {['Все', 'Масса', 'Похудение', 'Сила', 'Выносливость'].map(cat => (
              <button key={cat} onClick={() => setMarketFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${marketFilter === cat ? 'bg-blue-500 text-white' : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222]'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredMarket
              .slice((marketPage - 1) * 6, marketPage * 6)
              .map(prog => (
                <div key={prog.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{prog.title}</h3>
                        {prog.isPro && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        {prog.author}
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm">{prog.rating}</span>
                    </div>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-500">{prog.reviews} отзывов</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-500">{prog.exercises?.length || 0} упр.</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold flex items-center gap-1">
                      {prog.price === 0 ? (
                        <span className="text-green-500">Бесплатно</span>
                      ) : (
                        <><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /><span>{prog.price}</span></>
                      )}
                    </div>
                    <button onClick={() => purchaseProgram(prog)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2 rounded-xl flex items-center gap-2 transition-colors">
                      {prog.price === 0 ? 'Получить' : <><Star className="w-4 h-4" />Купить</>}
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {filteredMarket.length > 6 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <button
                onClick={() => setMarketPage(p => Math.max(1, p - 1))}
                disabled={marketPage === 1}
                className={`px-3 py-1.5 rounded-lg text-sm ${marketPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
              >
                ← Назад
              </button>
              <span className="text-xs text-gray-500">{marketPage} / {Math.ceil(filteredMarket.length / 6)}</span>
              <button
                onClick={() => setMarketPage(p => Math.min(Math.ceil(filteredMarket.length / 6), p + 1))}
                disabled={marketPage >= Math.ceil(filteredMarket.length / 6)}
                className={`px-3 py-1.5 rounded-lg text-sm ${marketPage >= Math.ceil(filteredMarket.length / 6) ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ЧАТ ПОДДЕРЖКИ */}
      {activeTab === 'support' && (
        <div className={`flex flex-col h-screen ${activeWorkout && workoutMinimized ? 'pt-16' : ''}`}>
          <div className="p-4 border-b border-white/10">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-500" />
              Техподдержка
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {getUserMessages(user?.id).map(msg => (
              <div key={msg.id} className={`flex ${msg.from === 'support' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${msg.from === 'support' ? 'bg-blue-500/20 text-blue-100' : 'bg-[#1a1a1a]'}`}>
                  {msg.from === 'support' && <p className="text-xs text-blue-400 mb-1">Поддержка</p>}
                  <p>{msg.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(msg.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {getUserMessages(user?.id).length === 0 && (
              <div className="text-center text-gray-500 py-10">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Напишите нам, если у вас есть вопросы</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
            <div className="flex gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendSupportMessage()}
                className="flex-1 bg-[#1a1a1a] px-4 py-3 rounded-xl outline-none border border-white/10 focus:border-blue-500"
                placeholder="Введите сообщение..." />
              <button onClick={sendSupportMessage} className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЛЕНТА */}
      {activeTab === 'feed' && (
        <Feed
          user={user}
          fetchWithRetry={fetchWithRetry}
          showToast={showToast}
        />
      )}

      {/* ПРОФИЛЬ */}
      {activeTab === 'profile' && (
        <div className={`p-4 ${activeWorkout && workoutMinimized ? 'pt-20' : ''}`}>
          {!user?.id ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Войдите в аккаунт</h2>
              <p className="text-gray-400 mb-6">Чтобы увидеть профиль, откройте приложение через бота</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Профиль</h1>
                <button
                  onClick={() => {
                    setProfileDisplayName(user?.displayName || user?.firstName || '');
                    setProfileAvatarUrl(user?.avatarUrl || '');
                    setShowProfileSettings(true);
                  }}
                  className="p-2 bg-[#1a1a1a] rounded-xl hover:bg-[#252525] transition-colors"
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-6 text-center border border-white/5">
                {/* Аватар с новогодней шапкой */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {(user?.displayName || user?.firstName)?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  {/* Новогодняя шапка */}
                  {showNewYearTheme && (
                    <div className="absolute -top-4 -right-1 text-3xl transform rotate-12">
                      🎅
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">
                  {user?.displayName || `${user?.firstName} ${user?.lastName || ''}`}
                </h2>

                {isTrainer && (
                  <div className="flex items-center justify-center gap-1 text-blue-400 mb-2">
                    <BadgeCheck className="w-5 h-5" />
                    <span className="font-medium">Верифицированный тренер</span>
                  </div>
                )}

                <p className="text-gray-500">@{user?.username || 'не указан'}</p>

                {isModerator && (
                  <span className="inline-block mt-2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {isAdmin ? 'ADMIN' : 'MODERATOR'}
                  </span>
                )}
              </div>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-400">Баланс</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />{userBalance}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`grid gap-3 ${isTrainer ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button onClick={depositStars} className="bg-green-500/20 text-green-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors">
                    <ArrowDownLeft className="w-5 h-5" />Пополнить
                  </button>
                  {isTrainer && (
                    <button onClick={withdrawStars} className="bg-red-500/20 text-red-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-500/30 transition-colors">
                      <ArrowUpRight className="w-5 h-5" />Вывести
                    </button>
                  )}
                </div>
                {!isTrainer && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    ⭐ Stars используются для покупки программ
                  </p>
                )}
              </div>

              {isTrainer && (
                <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-6 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-400">МОИ ЗАЯВКИ НА ВЫВОД</h3>
                    <button onClick={fetchMyWithdrawalRequests} className="text-xs text-blue-400 hover:underline">🔄 Обновить</button>
                  </div>
                  {myWithdrawalRequests.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">Нет заявок</div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {myWithdrawalRequests.map(req => {
                        const statusLabel = req.status === 'PENDING'
                          ? 'Ожидает'
                          : req.status === 'PROCESSING'
                            ? 'В обработке'
                            : req.status === 'APPROVED'
                              ? 'Одобрено'
                              : 'Отклонено';
                        const statusClass = req.status === 'PENDING'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : req.status === 'PROCESSING'
                            ? 'bg-blue-500/20 text-blue-400'
                            : req.status === 'APPROVED'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400';
                        const feeAmount = Number(req.feeAmount || 0);
                        const netAmount = Number(req.netAmount || (Number(req.amount || 0) - feeAmount));

                        return (
                          <div key={req.id} className="bg-[#0d0d0d] rounded-xl p-3 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold">{req.amount} USDT</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(req.createdAt).toLocaleString('ru-RU')}
                            </p>
                            {req.status === 'APPROVED' && (
                              <p className="text-xs text-gray-400 mt-2">
                                Комиссия: {feeAmount.toFixed(2)} USDT • К получению: {netAmount.toFixed(2)} USDT
                              </p>
                            )}
                            {req.status === 'REJECTED' && req.reviewedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Отклонено: {new Date(req.reviewedAt).toLocaleString('ru-RU')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {userRole === 'user' && (
                <button onClick={() => setShowTrainerForm(true)}
                  className="w-full bg-green-500/20 border border-green-500/50 rounded-2xl p-4 flex items-center justify-between mb-4 hover:bg-green-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-6 h-6 text-green-500" />
                    <span className="text-green-400 font-medium">Стать тренером</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-green-500" />
                </button>
              )}

              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                <h3 className="font-semibold mb-3 text-gray-400">ИНФОРМАЦИЯ</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500">Telegram ID</span>
                    <span className="font-mono">{user?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500">Роль</span>
                    <span className={`font-medium ${isAdmin ? 'text-purple-400' : userRole === 'moderator' ? 'text-blue-400' : isTrainer ? 'text-green-400' : 'text-gray-400'}`}>
                      {isAdmin ? 'Администратор' : userRole === 'moderator' ? 'Модератор' : isTrainer ? 'Тренер' : 'Пользователь'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Программ</span>
                    <span>{personalPrograms.length + purchasedPrograms.length}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* МОДЕРАЦИЯ */}
      {activeTab === 'moderator' && isModerator && (
        <div className={`p-4 ${activeWorkout && workoutMinimized ? 'pt-20' : ''}`}>
          <h1 className="text-2xl font-bold mb-6">🛡️ Модерация</h1>

          {/* Переключатель новогодней темы */}
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 mb-4 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎄</span>
              <div>
                <p className="font-semibold">Новогодняя тема</p>
                <p className="text-sm text-gray-400">Снежинки для всех пользователей</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const newValue = !showNewYearTheme;
                setShowNewYearTheme(newValue); // Оптимистичное обновление
                try {
                  await fetchWithRetry(`${API_URL}/settings/new-year-theme`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: newValue }),
                  });
                } catch (e) {
                  console.error('Error updating new year theme:', e);
                  setShowNewYearTheme(!newValue); // Откат при ошибке
                }
              }}
              className={`w-14 h-8 rounded-full transition-colors ${showNewYearTheme ? 'bg-green-500' : 'bg-gray-600'} relative`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${showNewYearTheme ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-yellow-500">{trainerRequests.length}</div>
              <div className="text-xs text-gray-500">Заявок</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-blue-500">{getUniqueChatUsers().length}</div>
              <div className="text-xs text-gray-500">Чатов</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-green-500">{rolesList.length}</div>
              <div className="text-xs text-gray-500">Ролей</div>
            </div>
          </div>

          {/* Статистика активности */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-purple-500">{rolesList.length || '—'}</div>
              <div className="text-xs text-gray-500">Всего польз.</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-cyan-500">{programs.length}</div>
              <div className="text-xs text-gray-500">Программ</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-orange-500">{withdrawalRequests.length}</div>
              <div className="text-xs text-gray-500">Выводов</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-gray-400">ЗАЯВКИ НА ТРЕНЕРА</h2>
            {trainerRequests.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 border border-white/5">Нет заявок</div>
            ) : (
              <div className="space-y-2">
                {trainerRequests.map(req => (
                  <div key={req.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-white/5 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{req.firstName || ''} {req.lastName || ''}</p>
                      <p className="text-xs text-gray-500">ID: {req.userId}{req.username ? ` • @${req.username}` : ''}</p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button onClick={() => approveTrainer(req.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">✓</button>
                      <button onClick={() => rejectTrainer(req.id)} className="bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">✕</button>
                      <button onClick={() => setViewingRequest(req)} className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors">···</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-gray-400">ЧАТЫ ПОДДЕРЖКИ</h2>
            {getUniqueChatUsers().length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 border border-white/5">Нет сообщений</div>
            ) : (
              <>
                <div className="space-y-2">
                  {getUniqueChatUsers()
                    .slice((chatsPage - 1) * ITEMS_PER_PAGE, chatsPage * ITEMS_PER_PAGE)
                    .map(chatUser => {
                      const msgs = getUserMessages(chatUser.id);
                      const lastMsg = msgs[msgs.length - 1];
                      return (
                        <div key={chatUser.id} onClick={() => setActiveChatUser(chatUser)}
                          className="bg-[#1a1a1a] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium">{chatUser.name}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">{lastMsg?.text}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      );
                    })}
                </div>
                {getUniqueChatUsers().length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-3 px-2">
                    <button
                      onClick={() => setChatsPage(p => Math.max(1, p - 1))}
                      disabled={chatsPage === 1}
                      className={`px-3 py-1.5 rounded-lg text-sm ${chatsPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                    >
                      ← Назад
                    </button>
                    <span className="text-xs text-gray-500">{chatsPage} / {Math.ceil(getUniqueChatUsers().length / ITEMS_PER_PAGE)}</span>
                    <button
                      onClick={() => setChatsPage(p => Math.min(Math.ceil(getUniqueChatUsers().length / ITEMS_PER_PAGE), p + 1))}
                      disabled={chatsPage >= Math.ceil(getUniqueChatUsers().length / ITEMS_PER_PAGE)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${chatsPage >= Math.ceil(getUniqueChatUsers().length / ITEMS_PER_PAGE) ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {isAdmin && (
            <div className="mb-6">
              <h2 className="font-semibold mb-3 text-gray-400">👑 УПРАВЛЕНИЕ РОЛЯМИ</h2>

              {/* Секция Модераторов */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-purple-500/20 mb-4">
                <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Модераторы
                </h3>

                {/* Текущие модераторы */}
                <div className="space-y-2 mb-4">
                  {rolesList.filter(r => r.roles?.includes('MODERATOR') || r.roles?.includes('ADMIN') || r.role === 'ADMIN').length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Нет назначенных модераторов</p>
                  ) : (
                    rolesList.filter(r => r.roles?.includes('MODERATOR') || r.roles?.includes('ADMIN') || r.role === 'ADMIN').map((r) => (
                      <div key={`mod-${r.telegramId || r.telegram_id}`} className="flex items-center justify-between py-2 px-3 bg-[#0d0d0d] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${r.roles?.includes('ADMIN') ? 'bg-yellow-500' : 'bg-purple-500'} rounded-full`}></span>
                          <div>
                            <p className="font-semibold text-sm">{r.firstName || r.first_name || 'Пользователь'} {r.lastName || r.last_name || ''}</p>
                            <div className="flex items-center gap-1">
                              <p className="font-mono text-xs text-gray-500">ID: {r.telegramId || r.telegram_id}</p>
                              {r.roles?.includes('TRAINER') && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-1 py-0.5 rounded">+тренер</span>
                              )}
                            </div>
                          </div>
                          {r.roles?.includes('ADMIN') && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded ml-2">👑 Главный</span>
                          )}
                        </div>
                        {!r.roles?.includes('ADMIN') && (
                          <button onClick={() => removeModeratorRole(r.telegramId || r.telegram_id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Снять
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Назначить модератора */}
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Назначить нового:</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Telegram ID" className="flex-1 bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-purple-500 text-sm" id="mod-id-input" />
                    <button onClick={() => {
                      const input = document.getElementById('mod-id-input');
                      if (input.value) {
                        setUserAsModerator(input.value);
                        input.value = '';
                      } else {
                        showToast('Введите Telegram ID', 'error');
                      }
                    }} className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                      + Назначить
                    </button>
                  </div>
                </div>
              </div>

              {/* Секция Тренеров */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/20">
                <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" /> Тренеры
                </h3>

                {/* Текущие тренеры */}
                <div className="space-y-2 mb-4">
                  {rolesList.filter(r => r.roles?.includes('TRAINER')).length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Нет назначенных тренеров</p>
                  ) : (
                    rolesList.filter(r => r.roles?.includes('TRAINER')).map((r) => (
                      <div key={`trainer-${r.telegramId || r.telegram_id}`} className="flex items-center justify-between py-2 px-3 bg-[#0d0d0d] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <div>
                            <p className="font-semibold text-sm">{r.firstName || r.first_name || 'Пользователь'} {r.lastName || r.last_name || ''}</p>
                            <div className="flex items-center gap-1">
                              <p className="font-mono text-xs text-gray-500">ID: {r.telegramId || r.telegram_id}</p>
                              {r.roles?.includes('MODERATOR') && (
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">+модератор</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeTrainerRole(r.telegramId || r.telegram_id)}
                          className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Снять
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Назначить тренера */}
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Назначить нового:</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Telegram ID" className="flex-1 bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-green-500 text-sm" id="trainer-id-input" />
                    <button onClick={() => {
                      const input = document.getElementById('trainer-id-input');
                      if (input.value) {
                        setManualTrainer(input.value);
                        input.value = '';
                      } else {
                        showToast('Введите Telegram ID', 'error');
                      }
                    }} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                      + Назначить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Сброс аккаунта (только для админа) */}
          {isAdmin && (
            <div className="mb-6">
              <h2 className="font-semibold mb-3 text-gray-400">🗑️ СБРОС АККАУНТА</h2>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-red-500/20">
                <p className="text-sm text-gray-400 mb-3">Сбросить данные пользователя (баланс, тренировки, программы). Роли сохраняются.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Telegram ID для сброса"
                    className="flex-1 bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-red-500 text-sm"
                    id="reset-account-input"
                  />
                  <button onClick={() => {
                    const input = document.getElementById('reset-account-input');
                    if (input.value) {
                      openConfirm(
                        '⚠️ Сброс аккаунта',
                        `Вы уверены что хотите сбросить аккаунт пользователя ${input.value}?\n\nБудут удалены:\n• Баланс\n• История тренировок\n• Программы\n• Купленные программы\n\nРоли (модератор/тренер) сохранятся!`,
                        () => {
                          resetUserAccount(parseInt(input.value));
                          input.value = '';
                        },
                        true,
                        'Сбросить 🔥'
                      );
                    }
                  }} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                    🗑️ Сбросить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ПУБЛИКАЦИЯ НОВОСТЕЙ */}
          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-gray-400">📰 ПУБЛИКАЦИЯ НОВОСТЕЙ</h2>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
              <input
                type="text"
                placeholder="Заголовок новости"
                className="w-full bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-blue-500 mb-3"
                id="news-title-input"
              />
              <textarea
                placeholder="Текст новости..."
                rows={3}
                className="w-full bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-blue-500 mb-3 resize-none"
                id="news-content-input"
              />
              <button
                onClick={async () => {
                  const titleInput = document.getElementById('news-title-input');
                  const contentInput = document.getElementById('news-content-input');
                  const title = titleInput.value.trim();
                  const content = contentInput.value.trim();

                  if (!title || !content) {
                    showToast('Заполните заголовок и текст новости', 'error');
                    return;
                  }

                  // Создаём на сервере
                  const success = await createNewsOnServer(title, content);
                  if (success) {
                    titleInput.value = '';
                    contentInput.value = '';
                    showToast('✅ Новость опубликована!', 'success');
                  }
                }}
                className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                📢 Опубликовать новость
              </button>

              {/* Список опубликованных новостей */}
              {news.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-2">Опубликовано: {news.length}</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {news.slice().reverse().slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-[#0d0d0d] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">{(item.createdAt || item.created_at) ? new Date(item.createdAt || item.created_at).toLocaleString('ru-RU') : '—'}</p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => {
                              const newTitle = prompt('Редактировать заголовок:', item.title);
                              if (newTitle === null) return;
                              const newContent = prompt('Редактировать текст:', item.content);
                              if (newContent === null) return;
                              const updated = news.map(n => n.id === item.id ? { ...n, title: newTitle, content: newContent } : n);
                              setNews(updated);
                              // Новости сохраняются через API
                            }}
                            className="text-blue-400 text-xs hover:underline"
                          >
                            Ред.
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Удалить новость "${item.title}"?`)) return;
                              deleteNewsOnServer(item.id);
                            }}
                            className="text-red-500 text-xs hover:underline"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* НАСТРОЙКИ КОМИССИИ (только для админа) */}
          {isAdmin && (
            <div className="mb-6">
              <h2 className="font-semibold mb-3 text-gray-400">💰 НАСТРОЙКИ КОМИССИИ</h2>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Комиссия с вывода</p>
                    <p className="text-sm text-gray-500">С каждого вывода тренера</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={withdrawalFee}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setWithdrawalFee(val);
                      }}
                      onBlur={() => saveWithdrawalFee(withdrawalFee)}
                      className="w-20 bg-[#0d0d0d] px-3 py-2 rounded-lg text-center outline-none border border-white/10 focus:border-yellow-500"
                    />
                    <span className="text-yellow-500 font-bold">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-white/10">
                  <div>
                    <p className="text-gray-400">Накоплено с комиссий:</p>
                  </div>
                  <p className="text-xl font-bold text-yellow-500">{adminBalance.toFixed(2)} USDT</p>
                </div>
              </div>
            </div>
          )}

          {/* ВЫВОД СРЕДСТВ (для админа/модератора) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-400">🏦 ВЫВОД СРЕДСТВ</h2>
              <button onClick={fetchAppBalance} className="text-xs text-blue-400 hover:underline">🔄 Обновить</button>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
              {/* Баланс CryptoBot */}
              <div className={`flex items-center justify-between p-3 mb-4 rounded-lg ${appBalance !== null && appBalance > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div>
                  <p className="text-xs text-gray-400">Баланс CryptoBot кошелька:</p>
                  <p className={`text-xl font-bold ${appBalance !== null && appBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {appBalance !== null ? `${appBalance} USDT` : 'Загрузка...'}
                  </p>
                </div>
                {appBalance !== null && appBalance === 0 && (
                  <p className="text-xs text-red-400 max-w-[120px] text-right">⚠️ Нет средств для выплат</p>
                )}
              </div>

              <p className="text-sm text-gray-400 mb-3">Вывести средства на CryptoBot:</p>
              <div className="flex gap-2 mb-4">
                <input
                  type="number"
                  placeholder="Сумма USDT"
                  min="1"
                  step="0.01"
                  className="flex-1 bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-green-500"
                  id="withdraw-amount-input"
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('withdraw-amount-input');
                    const amount = parseFloat(input.value);
                    if (!amount || amount < 1) {
                      showToast('Минимальная сумма: 1 USDT', 'error');
                      return;
                    }
                    setIsWithdrawing(true);
                    try {
                      const response = await fetchWithRetry(`${API_URL}/crypto/withdraw`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount, asset: 'USDT' }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        showToast(`✅ Вывод ${amount} USDT успешно отправлен!`, 'success');
                        input.value = '';
                        fetchAppBalance();
                        refreshUserFromServer();
                      } else {
                        throw new Error(data.error || 'Ошибка вывода');
                      }
                    } catch (error) {
                      showToast('❌ ' + error.message, 'error');
                    } finally {
                      setIsWithdrawing(false);
                    }
                  }}
                  disabled={isWithdrawing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isWithdrawing ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white`}
                >
                  {isWithdrawing ? '⏳' : '💸 Вывести'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Средства будут отправлены на ваш CryptoBot кошелёк
              </p>
            </div>
          </div>

          {/* ЗАЯВКИ НА ВЫВОД (модерация) */}
          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-gray-400">📋 ЗАЯВКИ НА ВЫВОД</h2>
            {moderationWithdrawals.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 border border-white/5">
                Нет заявок на вывод
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {moderationWithdrawals
                    .slice((withdrawalsPage - 1) * ITEMS_PER_PAGE, withdrawalsPage * ITEMS_PER_PAGE)
                    .map(req => {
                      const isProcessing = req.status === 'PROCESSING';
                      return (
                        <div key={req.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold">{req.userName}</p>
                              <p className="text-sm text-gray-500">@{req.username || 'нет'} • ID: {req.userId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-400">{req.amount} USDT</p>
                              <p className="text-xs text-gray-500">
                                Комиссия: {(req.amount * withdrawalFee / 100).toFixed(2)} USDT
                              </p>
                              <p className={`text-xs font-medium ${isProcessing ? 'text-blue-400' : 'text-yellow-400'}`}>
                                {isProcessing ? 'В обработке' : 'Ожидает'}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(req.createdAt).toLocaleString('ru-RU')}
                          </p>
                          <div className="flex gap-2">
                            {isProcessing ? (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Повторить обработку вывода ${req.amount} USDT для ${req.userName}?`)) return;
                                  try {
                                    const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals/${req.id}/approve`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                    });
                                    const data = await response.json();

                                    if (data.success) {
                                      await fetchWithdrawalRequests();
                                      refreshUserFromServer();
                                      fetchAppBalance();
                                      const netAmount = data.request?.netAmount ?? (req.amount * (1 - withdrawalFee / 100));
                                      showToast(`✅ Обработка завершена! ${Number(netAmount).toFixed(2)} USDT отправлено`, 'success');
                                    } else {
                                      throw new Error(data.error || 'Ошибка вывода');
                                    }
                                  } catch (error) {
                                    showToast('❌ ' + error.message, 'error');
                                  }
                                }}
                                className="flex-1 bg-blue-500/20 text-blue-400 py-2 rounded-lg font-medium hover:bg-blue-500/30 transition-colors"
                              >
                                ↻ Повторить
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Одобрить вывод ${req.amount} USDT для ${req.userName}?`)) return;
                                    try {
                                      const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals/${req.id}/approve`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                      });
                                      const data = await response.json();

                                      if (data.success) {
                                        await fetchWithdrawalRequests();
                                        refreshUserFromServer();
                                        fetchAppBalance();
                                        const netAmount = data.request?.netAmount ?? (req.amount * (1 - withdrawalFee / 100));
                                        showToast(`✅ Вывод одобрен! ${Number(netAmount).toFixed(2)} USDT отправлено`, 'success');
                                      } else {
                                        throw new Error(data.error || 'Ошибка вывода');
                                      }
                                    } catch (error) {
                                      showToast('❌ ' + error.message, 'error');
                                    }
                                  }}
                                  className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                                >
                                  ✅ Одобрить
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Отклонить заявку на вывод от ${req.userName}?`)) return;
                                    try {
                                      const response = await fetchWithRetry(`${API_URL}/crypto/withdrawals/${req.id}/reject`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reason: 'Отклонено модератором' }),
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        await fetchWithdrawalRequests();
                                        refreshUserFromServer();
                                        showToast('❌ Заявка отклонена', 'error');
                                      } else {
                                        throw new Error(data.error || 'Ошибка');
                                      }
                                    } catch (error) {
                                      showToast('❌ ' + error.message, 'error');
                                    }
                                  }}
                                  className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                                >
                                  ❌ Отклонить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                {moderationWithdrawals.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-3 px-2">
                    <button
                      onClick={() => setWithdrawalsPage(p => Math.max(1, p - 1))}
                      disabled={withdrawalsPage === 1}
                      className={`px-3 py-1.5 rounded-lg text-sm ${withdrawalsPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                    >
                      ← Назад
                    </button>
                    <span className="text-xs text-gray-500">{withdrawalsPage} / {Math.ceil(moderationWithdrawals.length / ITEMS_PER_PAGE)}</span>
                    <button
                      onClick={() => setWithdrawalsPage(p => Math.min(Math.ceil(moderationWithdrawals.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={withdrawalsPage >= Math.ceil(moderationWithdrawals.length / ITEMS_PER_PAGE)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${withdrawalsPage >= Math.ceil(moderationWithdrawals.length / ITEMS_PER_PAGE) ? 'bg-gray-700 text-gray-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
      }

      {/* Модальное окно чата с пользователем (для модератора) */}
      {
        activeChatUser && isModerator && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChatUser(null)} className="text-gray-400">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <p className="font-semibold">{activeChatUser.name}</p>
                  <p className="text-sm text-gray-500">@{activeChatUser.username}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d]">
              {getUserMessages(activeChatUser.id).map(msg => (
                <div key={msg.id} className={`flex ${msg.from === 'support' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 ${msg.from === 'support' ? 'bg-blue-500' : 'bg-[#1a1a1a]'}`}>
                    <p>{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
              <div className="flex gap-2">
                <input type="text" className="flex-1 bg-[#1a1a1a] px-4 py-3 rounded-xl outline-none border border-white/10 focus:border-blue-500"
                  placeholder="Ответить..." id="mod-reply-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      sendModeratorReply(activeChatUser.id, e.target.value);
                      e.target.value = '';
                    }
                  }} />
                <button onClick={() => {
                  const input = document.getElementById('mod-reply-input');
                  if (input.value) { sendModeratorReply(activeChatUser.id, input.value); input.value = ''; }
                }} className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ПАНЕЛЬ ТРЕНЕРА */}
      {
        activeTab === 'trainer' && canSeeTrainerPanel && (
          <div className={`p-4 ${activeWorkout && workoutMinimized ? 'pt-20' : ''}`}>
            <h1 className="text-2xl font-bold mb-6">💪 Панель тренера</h1>

            {/* Создание программы */}
            <div className="mb-6">
              <h2 className="font-semibold mb-3 text-gray-400">📝 СОЗДАТЬ ПРОГРАММУ</h2>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <input
                  type="text"
                  placeholder="Название программы"
                  className="w-full bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-green-500 mb-3"
                  id="trainer-prog-title"
                />
                <textarea
                  placeholder="Описание программы..."
                  rows={2}
                  className="w-full bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-green-500 mb-3 resize-none"
                  id="trainer-prog-desc"
                />
                <select
                  className="w-full bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 mb-3"
                  id="trainer-prog-category"
                >
                  <option value="Масса">Масса</option>
                  <option value="Похудение">Похудение</option>
                  <option value="Сила">Сила</option>
                  <option value="Выносливость">Выносливость</option>
                  <option value="Другое">Другое</option>
                </select>
                <div className="flex gap-3 mb-3">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="prog-price-type" value="free" defaultChecked onChange={() => document.getElementById('trainer-prog-price').disabled = true} />
                    <span className="text-gray-400">Бесплатно</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="prog-price-type" value="paid" onChange={() => document.getElementById('trainer-prog-price').disabled = false} />
                    <span className="text-gray-400">Платно</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Цена USDT"
                    disabled
                    className="flex-1 bg-[#0d0d0d] px-3 py-2 rounded-lg outline-none border border-white/10 focus:border-yellow-500 disabled:opacity-50"
                    id="trainer-prog-price"
                  />
                </div>

                {/* Упражнения */}
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Упражнения:</p>
                  <div className="space-y-2 mb-3">
                    {newProgramExercises.map((ex, i) => (
                      <div key={i} className="bg-[#0d0d0d] p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          {ex.isCustom ? (
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) => {
                                const updated = [...newProgramExercises];
                                updated[i].name = e.target.value;
                                setNewProgramExercises(updated);
                              }}
                              placeholder="Введите название упражнения"
                              className="flex-1 bg-[#1a1a1a] px-3 py-2 rounded-lg outline-none text-sm border border-white/10"
                            />
                          ) : (
                            <select
                              value={ex.name}
                              onChange={(e) => {
                                const updated = [...newProgramExercises];
                                if (e.target.value === '__custom__') {
                                  updated[i].name = '';
                                  updated[i].isCustom = true;
                                } else {
                                  updated[i].name = e.target.value;
                                }
                                setNewProgramExercises(updated);
                              }}
                              className="flex-1 bg-[#1a1a1a] px-3 py-2 rounded-lg outline-none text-sm border border-white/10"
                            >
                              <option value="">Выберите упражнение</option>
                              {Object.entries(EXERCISE_LIST).map(([category, exercises]) => (
                                <optgroup key={category} label={category}>
                                  {exercises.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </optgroup>
                              ))}
                              <option value="__custom__">📝 Другое (ввести вручную)</option>
                            </select>
                          )}
                          <button
                            onClick={() => setNewProgramExercises(newProgramExercises.filter((_, idx) => idx !== i))}
                            className="text-red-500 p-2"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Подходы:</span>
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => {
                                const updated = [...newProgramExercises];
                                updated[i].sets = parseInt(e.target.value) || 0;
                                setNewProgramExercises(updated);
                              }}
                              className="w-14 bg-[#1a1a1a] px-2 py-1 rounded text-center text-sm"
                            />
                          </div>
                          <span className="text-gray-500">×</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Повторы:</span>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => {
                                const updated = [...newProgramExercises];
                                updated[i].reps = e.target.value;
                                setNewProgramExercises(updated);
                              }}
                              className="w-16 bg-[#1a1a1a] px-2 py-1 rounded text-center text-sm"
                              placeholder="10-12"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setNewProgramExercises([...newProgramExercises, { name: '', sets: 3, reps: '10', isCustom: false }])}
                    className="w-full bg-[#0d0d0d] text-blue-400 py-2 rounded-lg text-sm border border-dashed border-blue-500/30 hover:bg-blue-500/10"
                  >
                    + Добавить упражнение
                  </button>
                </div>

                <button
                  onClick={async () => {
                    const title = document.getElementById('trainer-prog-title').value.trim();
                    const description = document.getElementById('trainer-prog-desc').value.trim();
                    const category = document.getElementById('trainer-prog-category').value;
                    const priceInput = document.getElementById('trainer-prog-price');
                    const isFree = priceInput.disabled;
                    const price = isFree ? 0 : parseFloat(priceInput.value) || 0;

                    if (!title) {
                      showToast('Укажите название программы', 'error');
                      return;
                    }

                    // Создаём на сервере
                    const success = await createProgramOnServer({
                      title,
                      description,
                      category,
                      price,
                      exercises: newProgramExercises.filter(e => e.name.trim()),
                    });

                    if (success) {
                      document.getElementById('trainer-prog-title').value = '';
                      document.getElementById('trainer-prog-desc').value = '';
                      setNewProgramExercises([]);
                      showToast('✅ Программа создана!', 'success');
                    }
                  }}
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  ➕ Создать программу
                </button>
              </div>
            </div>

            {/* Мои программы */}
            <div className="mb-6">
              <h2 className="font-semibold mb-3 text-gray-400">📚 МОИ ПРОГРАММЫ</h2>
              {trainerPrograms.length === 0 ? (
                <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 border border-white/5">
                  У вас пока нет программ
                </div>
              ) : (
                <div className="space-y-3">
                  {trainerPrograms.map(prog => (
                    <div key={prog.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{prog.title}</p>
                          <p className="text-xs text-gray-500">{prog.category} • {prog.price > 0 ? `${prog.price} USDT` : 'Бесплатно'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingProgram(prog)}
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              openConfirm('Удаление', `Удалить программу "${prog.title}"?`, () => deleteProgramOnServer(prog.id), true, 'Удалить');
                            }}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {prog.description && <p className="text-sm text-gray-400">{prog.description}</p>}
                      {prog.exercises?.length > 0 && (
                        <p className="text-xs text-green-400 mt-1">💪 {prog.exercises.length} упражнений</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Статистика тренера */}
            <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl p-4 border border-green-500/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" />Ваша статистика</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{trainerPrograms.length}</div>
                  <div className="text-xs text-gray-400">Программ</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">0</div>
                  <div className="text-xs text-gray-400">Продаж</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{userBalance}</div>
                  <div className="text-xs text-gray-400">Заработано</div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* МОДАЛЬНОЕ ОКНО УВЕДОМЛЕНИЙ */}
      {
        showNotificationsModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-500" />
                Уведомления
              </h2>
              <button onClick={() => setShowNotificationsModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0d0d0d]">
              {/* Новости */}
              {news.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">📰 НОВОСТИ</h3>
                  <div className="space-y-3">
                    {news.slice().reverse().map(item => (
                      <div key={item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-blue-400">{item.title}</p>
                            <p className="text-gray-300 mt-1">{item.content}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date((item.createdAt || item.created_at)).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Персональные уведомления */}
              {notifications.filter(n => n.userId === user?.id).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">🔔 ЛИЧНЫЕ УВЕДОМЛЕНИЯ</h3>
                  <div className="space-y-3">
                    {notifications.filter(n => n.userId === user?.id).slice().reverse().map(item => (
                      <div key={item.id} className={`bg-[#1a1a1a] rounded-xl p-4 border ${item.type === 'success' ? 'border-green-500/30' : item.type === 'error' ? 'border-red-500/30' : 'border-white/5'}`}>
                        <div className="flex items-start justify-between">
                          <p className={`${item.type === 'success' ? 'text-green-400' : item.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                            {item.message}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(item.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Пусто */}
              {news.length === 0 && notifications.filter(n => n.userId === user?.id).length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Нет уведомлений</p>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* НАВИГАЦИЯ */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur border-t border-white/10 z-40">
        <div className="flex overflow-x-auto px-2 py-2 gap-1 no-scrollbar">
          <button onClick={() => setActiveTab('home')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-500'}`}>
            <Home className="w-6 h-6" /><span className="text-xs mt-1">Главная</span>
          </button>
          {user?.id !== 0 && (
            <button onClick={() => setActiveTab('feed')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'feed' ? 'text-blue-500' : 'text-gray-500'}`}>
              <LayoutList className="w-6 h-6" /><span className="text-xs mt-1">Лента</span>
            </button>
          )}
          {user?.id !== 0 && (
            <button onClick={() => setActiveTab('market')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'market' ? 'text-blue-500' : 'text-gray-500'}`}>
              <ShoppingBag className="w-6 h-6" /><span className="text-xs mt-1">Маркет</span>
            </button>
          )}
          {user?.id !== 0 && (
            <button onClick={() => setActiveTab('support')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors relative ${activeTab === 'support' ? 'text-blue-500' : 'text-gray-500'}`}>
              <div className="relative">
                <MessageCircle className="w-6 h-6" />
                {(() => {
                  const msgs = getUserMessages(user?.id);
                  return msgs.length > 0 && msgs[msgs.length - 1].from === 'support' && String(msgs[msgs.length - 1].id) !== lastReadSupportId && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#0d0d0d]" />
                  );
                })()}
              </div>
              <span className="text-xs mt-1">Поддержка</span>
            </button>
          )}
          <button onClick={() => setActiveTab('profile')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-blue-500' : 'text-gray-500'}`}>
            <User className="w-6 h-6" /><span className="text-xs mt-1">Профиль</span>
          </button>
          {canSeeTrainerPanel && (
            <button onClick={() => setActiveTab('trainer')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'trainer' ? 'text-green-500' : 'text-gray-500'}`}>
              <Dumbbell className="w-6 h-6" /><span className="text-xs mt-1">Тренер</span>
            </button>
          )}
          {isModerator && (
            <button onClick={() => setActiveTab('moderator')} className={`min-w-[70px] flex flex-col items-center p-2 rounded-xl transition-colors relative ${activeTab === 'moderator' ? 'text-blue-500' : 'text-gray-500'}`}>
              <Shield className="w-6 h-6" />
              <span className="text-xs mt-1">Модер</span>
              {(trainerRequests.length > 0 || getUniqueChatUsers().length > 0) && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {trainerRequests.length + getUniqueChatUsers().length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Модалка результатов тренировки */}
      {
        workoutSummary && (
          <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-8 text-center border border-white/10 relative overflow-hidden">
              {/* Конфетти эффект (простой CSS) */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{ animationDuration: '1s' }}></div>
                <div className="absolute top-10 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
                <div className="absolute bottom-10 left-10 w-2 h-2 bg-green-500 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
              </div>

              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <Trophy className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-200 to-amber-500 text-transparent bg-clip-text">Отличная работа!</h2>
              <p className="text-gray-400 mb-8">{workoutSummary.title}</p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#0d0d0d] p-3 rounded-2xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Время</p>
                  <p className="font-bold text-lg">
                    {Math.floor(workoutSummary.duration / 60)}м {workoutSummary.duration % 60}с
                  </p>
                </div>
                <div className="bg-[#0d0d0d] p-3 rounded-2xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Объём</p>
                  <p className="font-bold text-lg text-green-400">{Math.round(workoutSummary.volume)} <span className="text-xs">кг</span></p>
                </div>
                <div className="bg-[#0d0d0d] p-3 rounded-2xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Подходы</p>
                  <p className="font-bold text-lg text-blue-400">{workoutSummary.sets}</p>
                </div>
              </div>

              <button
                onClick={() => setWorkoutSummary(null)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20"
              >
                Продолжить путь 🚀
              </button>
            </div>
          </div>
        )
      }

      {/* Модалка настроек профиля */}
      {
        showProfileSettings && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setShowProfileSettings(false)}>
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6 border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Настройки профиля</h2>
                <button onClick={() => setShowProfileSettings(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Аватар */}
              <div className="text-center mb-6">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  {profileAvatarUrl ? (
                    <img src={profileAvatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {profileDisplayName?.charAt(0) || user?.firstName?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">Нажмите на камеру чтобы загрузить фото</p>
              </div>

              {/* Имя */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Отображаемое имя</label>
                <input
                  type="text"
                  value={profileDisplayName}
                  onChange={e => setProfileDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                  maxLength={50}
                  className="w-full bg-[#0d0d0d] px-4 py-3 rounded-xl outline-none border border-white/10 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Минимум 2 символа</p>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowProfileSettings(false)}
                  className="flex-1 py-3 rounded-xl bg-[#252525] text-gray-400 hover:bg-[#303030] transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving || profileDisplayName.trim().length < 2}
                  className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {profileSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* МОДАЛЬНОЕ ОКНО ЗАЯВКИ НА ТРЕНЕРА */}
      {
        showTrainerForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTrainerForm(false)}>
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-green-500" />
                  Заявка на тренера
                </h2>

                {/* О себе */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">О себе</label>
                  <textarea
                    value={trainerBio}
                    onChange={e => setTrainerBio(e.target.value.slice(0, 500))}
                    placeholder="Расскажите о себе, своём опыте..."
                    className="w-full bg-[#0d0d0d] rounded-xl p-3 text-white placeholder-gray-500 border border-white/10 focus:border-green-500 outline-none resize-none h-24"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{trainerBio.length}/500</p>
                </div>

                {/* Опыт */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Опыт</label>
                  <select
                    value={trainerExperience}
                    onChange={e => setTrainerExperience(e.target.value)}
                    className="w-full bg-[#0d0d0d] rounded-xl p-3 text-white border border-white/10 focus:border-green-500 outline-none"
                  >
                    <option value="">Выберите опыт</option>
                    <option value="Менее года">Менее года</option>
                    <option value="1-3 года">1-3 года</option>
                    <option value="3-5 лет">3-5 лет</option>
                    <option value="5+ лет">5+ лет</option>
                  </select>
                </div>

                {/* Специализация */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Специализация</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Силовые', 'Кардио', 'Йога', 'Функциональный', 'Бодибилдинг', 'Кроссфит'].map(spec => (
                      <label key={spec} className="flex items-center gap-2 bg-[#0d0d0d] p-3 rounded-xl cursor-pointer border border-white/10 hover:border-green-500/50">
                        <input
                          type="checkbox"
                          checked={trainerSpecializations.includes(spec)}
                          onChange={e => {
                            if (e.target.checked) {
                              setTrainerSpecializations(prev => [...prev, spec]);
                            } else {
                              setTrainerSpecializations(prev => prev.filter(s => s !== spec));
                            }
                          }}
                          className="w-4 h-4 accent-green-500"
                        />
                        <span className="text-sm">{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Фото сертификата */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">Сертификат МС/КМС (необязательно)</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setTrainerCertPhoto(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="cert-photo-input"
                    />
                    {trainerCertPhoto ? (
                      <div className="relative">
                        <img src={trainerCertPhoto} alt="Сертификат" className="w-full h-40 object-cover rounded-xl" />
                        <button
                          onClick={() => setTrainerCertPhoto('')}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="cert-photo-input" className="flex flex-col items-center justify-center h-32 bg-[#0d0d0d] rounded-xl border-2 border-dashed border-white/20 cursor-pointer hover:border-green-500/50">
                        <Upload className="w-8 h-8 text-gray-500 mb-2" />
                        <span className="text-sm text-gray-500">Загрузить фото</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Кнопки */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTrainerForm(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-600 text-white font-medium hover:bg-gray-500 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={submitTrainerRequest}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ЗАЯВКИ */}
      {
        viewingRequest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingRequest(null)}>
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Заявка на тренера</h2>
                  <button onClick={() => setViewingRequest(null)} className="text-gray-500 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="font-semibold text-lg">{viewingRequest.firstName} {viewingRequest.lastName}</p>
                  <p className="text-sm text-gray-500">@{viewingRequest.username || 'нет'} • ID: {viewingRequest.userId}</p>
                </div>

                {viewingRequest.bio && (
                  <div className="mb-4 p-3 bg-[#0d0d0d] rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">О себе:</p>
                    <p className="text-sm text-gray-300">{viewingRequest.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {viewingRequest.experience && (
                    <div className="p-3 bg-[#0d0d0d] rounded-lg">
                      <p className="text-xs text-gray-500">Опыт:</p>
                      <p className="text-sm text-green-400 font-medium">{viewingRequest.experience}</p>
                    </div>
                  )}
                  {viewingRequest.specialization && (
                    <div className="p-3 bg-[#0d0d0d] rounded-lg">
                      <p className="text-xs text-gray-500">Специализация:</p>
                      <p className="text-sm text-blue-400">{viewingRequest.specialization}</p>
                    </div>
                  )}
                </div>

                {viewingRequest.certPhotoUrl && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Сертификат:</p>
                    <img src={viewingRequest.certPhotoUrl} alt="Сертификат" className="w-full h-48 object-cover rounded-lg border border-white/10" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { approveTrainer(viewingRequest.id); setViewingRequest(null); }}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => { rejectTrainer(viewingRequest.id); setViewingRequest(null); }}
                    className="flex-1 bg-red-500/20 text-red-500 py-3 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* МОДАЛЬНОЕ ОКНО ПРИЧИНЫ ОТКАЗА */}
      {
        rejectingRequest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRejectingRequest(null)}>
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-red-400">Отклонить заявку</h2>
                  <button onClick={() => setRejectingRequest(null)} className="text-gray-500 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-[#0d0d0d] rounded-lg">
                  <p className="font-semibold">{rejectingRequest.firstName} {rejectingRequest.lastName}</p>
                  <p className="text-sm text-gray-500">ID: {rejectingRequest.userId}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Причина отказа</label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Укажите причину отказа..."
                    className="w-full bg-[#0d0d0d] rounded-xl p-3 text-white placeholder-gray-500 border border-white/10 focus:border-red-500 outline-none resize-none h-24"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectingRequest(null)}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-500 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={confirmRejectTrainer}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-colors"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
