import { useState, useEffect, useRef } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameScreen } from './components/GameScreen';
import { VictoryModal } from './components/VictoryModal';
import { ErrorScreen } from './components/ErrorScreen';
import { QUESTIONS, type Question } from './data/questions';
import { gameAudio } from './utils/audio';
import { handleExitSite } from './utils/navigation';
import celebrationRobots from './Celebration/assets/celbr.png';
import panelArt from './assets/results-panel-empty.png';
import celebrationTitle from './ResultsPanel/assets/good.png';
import exitButtonImage from './assets/Exit.png';
import retryButtonImage from './assets/Retry.png';
 
type ViewType = 'welcome' | 'playing' | 'gameover' | 'victory';

function normalizeOptionArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return normalizeOptionArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') {
    const option = value as Record<string, unknown>;
    if ('text' in option || 'imageUrl' in option || 'audioUrl' in option) return [option];
    return Object.values(option);
  }
  return [];
}

function App() {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('view') as ViewType;
      if (v) return v;
    }
    return 'welcome';
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(80);
  const [lives, setLives] = useState(3);

  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Preload Celebration, Results Panel, and Question assets upfront
  useEffect(() => {
    const assets = [
      celebrationRobots,
      panelArt,
      celebrationTitle,
      exitButtonImage,
      retryButtonImage,
    ];
    assets.forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, []);

  useEffect(() => {
    if (apiQuestions.length > 0) {
      apiQuestions.forEach((q) => {
        if (q.image) {
          const img = new Image();
          img.src = q.image;
        }
      });
    }
  }, [apiQuestions]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const latestTokenRef = useRef<string | null>(null);

  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const refreshEndpointRef = useRef<string | null>(null);

  const doRefresh = async (): Promise<string | null> => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const endpoints = ['/api/v1/student/refresh', '/api/v1/auth/refresh'];
      // Use only the endpoint that worked last time to avoid duplicate calls
      const order = refreshEndpointRef.current ? [refreshEndpointRef.current] : endpoints;

      let refreshRes: Response | null = null;
      let usedEndpoint: string | null = null;
      for (const ep of order) {
        refreshRes = await fetch(`${baseUrl}${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: "{}",
          credentials: 'include',
        });
        usedEndpoint = ep;
        if (refreshRes.ok) break;
      }

      if (refreshRes && refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.accessToken || refreshData?.data?.token || refreshData?.accessToken || refreshData?.token;
        if (newToken) {
          console.log("Token refreshed successfully.");
          refreshEndpointRef.current = usedEndpoint;
          setSessionToken(newToken);
          latestTokenRef.current = newToken;
          return newToken;
        }
      } else {
        refreshEndpointRef.current = null;
        console.error("Token refresh failed with status", refreshRes?.status);
      }
    } catch (err) {
      console.error("Error during token refresh", err);
    }
    return null;
  };

  // Concurrent callers (StrictMode double effects, parallel 401s) share one request
  const refreshAccessToken = () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = doRefresh().finally(() => {
        refreshPromiseRef.current = null;
      });
    }
    return refreshPromiseRef.current;
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    let currentToken = latestTokenRef.current;
    if (!currentToken) {
      currentToken = await refreshAccessToken();
    }
    
    const fetchOptions = { ...options };
    if (currentToken) {
      fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${currentToken}` };
    }

    let res = await fetch(url, fetchOptions);

    if (res.status === 401) {
      console.warn("401 Unauthorized encountered. Attempting to refresh token...");
      const newToken = await refreshAccessToken();
      if (newToken) {
        fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${newToken}` };
        res = await fetch(url, fetchOptions);
      }
    }
    
    return res;
  };
  const [answersList, setAnswersList] = useState<any[]>([]);
  const answersRef = useRef<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [victoryData, setVictoryData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const lessonId = urlParams.get('lessonId');
        const token = urlParams.get('token');

        const isDevelopment = import.meta.env.MODE === 'development';

        if (!lessonId) {
          if (isDevelopment) {
            console.warn('Development mode: Missing URL parameters. Using mock evaluationId ("dev-evaluation") and accessCode ("dev-test"). Skipping API fetch and using local mock questions.');
            
            // Provide realistic test data so the game can open normally
            setApiQuestions(QUESTIONS);
            setIsLoading(false);
            return;
          }
          
          setError('عذراً، الرابط غير مكتمل. يرجى التأكد من وجود رقم التقييم ورمز المرور.');
          setIsLoading(false);
          return;
        }

        const baseUrl = import.meta.env.VITE_API_BASE_URL;

        // 1. Create Session
        try {
          const sessionRes = await apiFetch(`${baseUrl}/api/v1/student/games/1/sessions?lessonId=${lessonId}`, {
            method: 'POST',
          });
          if (sessionRes.ok) {
            const sData = await sessionRes.json();
            if (sData?.data?.id) {
              setSessionId(sData.data.id);
            }
          }
        } catch (e) {
          console.error("Failed to create session", e);
        }

        // 2. Fetch Questions
        const response = await apiFetch(`${baseUrl}/api/v1/student/games/1/questions?lessonId=${lessonId}`);

        if (!response.ok) {
          throw new Error('فشل في جلب البيانات من الخادم.');
        }

        const resData = await response.json();

        let fetched: any[] = [];
        if (resData && resData.data && Array.isArray(resData.data.questions)) {
          fetched = resData.data.questions;
        } else if (resData && resData.data && Array.isArray(resData.data.answers)) {
          fetched = resData.data.answers;
        } else if (resData && resData.data && Array.isArray(resData.data)) {
          fetched = resData.data;
        } else if (Array.isArray(resData)) {
          fetched = resData;
        }

        if (fetched.length > 0) {
          const mapped = fetched.map((q: any, idx: number) => {
            // Determine format
            const isOptionsFormat = q.question !== undefined && q.options !== undefined;
            const isAnswerFormat = q.questionTitle !== undefined && q.choices !== undefined;
            const hasChoiceDetails = q.choiceDetails !== undefined;

            let questionText = 'بدون سؤال';
            let choicesArr: any[] = [];
            let word = 'إجابة';
            let distractors: string[] = [];
            let image = null;
            let audio = null;

            if (isOptionsFormat) {
              questionText = q.question || 'بدون سؤال';
              choicesArr = normalizeOptionArray(q.options);
              word = q.correctAnswer || 'إجابة';
              image = q.imageUrl || q.image || choicesArr.find((option: any) => option?.imageUrl)?.imageUrl || null;
              audio = q.audioUrl || choicesArr.find((option: any) => option?.audioUrl)?.audioUrl || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (isAnswerFormat) {
              questionText = q.questionTitle || 'بدون سؤال';
              choicesArr = normalizeOptionArray(q.choices);
              word = q.correctAnswer || 'إجابة';
              image = q.image || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (hasChoiceDetails) {
              const details = q.choiceDetails || {};
              questionText = details.title || 'بدون سؤال';
              choicesArr = normalizeOptionArray(details.choices);
              image = details.image || null;

              const correctIndex = details.correctAnswer !== undefined ? details.correctAnswer : 0;
              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');

              word = mappedChoices[correctIndex] || 'إجابة';
              distractors = mappedChoices.filter((_: any, i: number) => i !== correctIndex);
            }

            // Keep maximum of 3 distractors so total words is never more than 4
            distractors = distractors.slice(0, 3);

            return {
              id: q.id || q.questionId || idx,
              questionText: questionText,
              image: image,
              audioUrl: audio,
              word: word,
              distractors: distractors
            };
          });
          setApiQuestions(mapped);
        } else {
          setError('لا توجد أسئلة متاحة في هذا التقييم.');
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError('حدث خطأ أثناء جلب الأسئلة. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleStartGame = () => {
    setScore(0);
    setLives(3);
    setCurrentQuestionIndex(0);
    setAnswersList([]);
    answersRef.current = [];
    setVictoryData(null);
    setQuestionStartTime(Date.now());
    setView('playing');
  };

  // Retry from the results panel: create a brand-new session, then reset everything.
  const handleRetry = async () => {
    if (isRestarting) return;
    setIsRestarting(true);

    // Drop the old (already completed) session so nothing is submitted to it
    setSessionId(null);

    const lessonId = new URLSearchParams(window.location.search).get('lessonId');
    if (lessonId) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const sessionRes = await apiFetch(`${baseUrl}/api/v1/student/games/1/sessions?lessonId=${lessonId}`, {
          method: 'POST',
        });
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          if (sData?.data?.id) {
            setSessionId(sData.data.id);
          }
        }
      } catch (e) {
        console.error("Failed to create session on retry", e);
      }
    }

    handleStartGame();
    setIsRestarting(false);
  };

  const submitGameSession = async (finalAnswers: any[]) => {
    if (!sessionId || !sessionToken) {
      setView('victory');
      return;
    }

    setIsSubmitting(true);
    setView('victory');

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // The API requires at least 1 answer. If the player lost all lives to enemies
      // before entering any room, record one wrong answer for the current question.
      let answersToSend = finalAnswers;
      if (answersToSend.length === 0) {
        const currentQ = apiQuestions[currentQuestionIndex];
        if (currentQ) {
          const fallbackAnswer = {
            questionId: currentQ.id,
            selectedAnswer: currentQ.distractors?.[0] || 'لم تتم الإجابة',
            isCorrect: false,
            timeTaken: Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000)),
            pointsEarned: 0
          };
          answersToSend = [fallbackAnswer];
          answersRef.current = answersToSend;
          setAnswersList(answersToSend);
        }
      }

      if (answersToSend.length > 0) {
        await apiFetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/submit-answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers: answersToSend })
        });
      }

      // Complete Session
      const completeRes = await apiFetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      if (completeRes.ok) {
        const cData = await completeRes.json();
        if (cData?.data) {
          setVictoryData(cData.data);
        }
      }
    } catch (e) {
      console.error("Error submitting session:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectAnswer = () => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));
    const currentQ = apiQuestions[currentQuestionIndex];

    const answerRecord = {
      questionId: currentQ.id,
      selectedAnswer: currentQ.word,
      isCorrect: true,
      timeTaken: timeTaken,
      pointsEarned: 10
    };

    const newAnswers = [...answersRef.current, answerRecord];
    answersRef.current = newAnswers;
    setAnswersList(newAnswers);

    if (currentQuestionIndex + 1 < apiQuestions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      submitGameSession(newAnswers);
    }

    setScore((prev) => prev + 10);
  };

  const handleWrongAnswer = (wrongWord: string) => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));
    const currentQ = apiQuestions[currentQuestionIndex];

    const answerRecord = {
      questionId: currentQ.id,
      selectedAnswer: wrongWord,
      isCorrect: false,
      timeTaken: timeTaken,
      pointsEarned: 0
    };
    const newAnswers = [...answersRef.current, answerRecord];
    answersRef.current = newAnswers;
    setAnswersList(newAnswers);

    setScore((prev) => Math.max(0, prev - 5));
  };

  const handleLoseLife = () => {
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        gameAudio.playGameOver();
        // The game is completely finished, show the ONLY final results screen
        submitGameSession(answersRef.current);
        setView('victory');
      }
      return nextLives;
    });
  };

  if (error) {
    return <ErrorScreen description={error} onExit={handleExitSite} />;
  }

  if (isLoading) {
    return (
      <div className="w-screen min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold" dir="rtl">
        تحميل
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen overflow-x-hidden flex items-center justify-center">
      {view === 'welcome' && (
        <WelcomeScreen 
          onStart={handleStartGame} 
          onExit={handleExitSite}
          totalQuestions={apiQuestions.length}
          isLoading={isLoading}
          error={error}
        />
      )}

      {view === 'playing' && (
        <GameScreen
          questions={apiQuestions}
          currentQuestionIndex={currentQuestionIndex}
          coins={answersList.filter((answer) => answer.isCorrect).length}
          lives={lives}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onLoseLife={handleLoseLife}
          onBackToWelcome={handleExitSite}
        />
      )}


      {view === 'victory' && (
        <VictoryModal
          score={score}
          totalQuestions={apiQuestions.length || 11}
          correctAnswers={answersList.length ? answersList.filter(a => a.isCorrect).length : 8}
          wrongAnswers={answersList.length ? answersList.filter(a => !a.isCorrect).length : 3}
          victoryData={victoryData || { score: 80, earnedCoins: 20 }}
          onRestart={handleRetry}
          onHome={handleExitSite}
        />
      )}
    </div>
  );
}

export default App;
