import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameScreen } from './components/GameScreen';
import { VictoryModal } from './components/VictoryModal';
import { QUESTIONS, type Question } from './data/questions';
import { gameAudio } from './utils/audio';
 
type ViewType = 'welcome' | 'playing' | 'gameover' | 'victory';

function App() {
  const [view, setView] = useState<ViewType>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [answersList, setAnswersList] = useState<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [victoryData, setVictoryData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const lessonId = urlParams.get('lessonId');
        const token = urlParams.get('token');

        const isDevelopment = import.meta.env.MODE === 'development';

        if (!lessonId || !token) {
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

        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://oasis-eduline-1.onrender.com';

        // 1. Create Session
        try {
          const sessionRes = await fetch(`${baseUrl}/api/v1/student/games/1/sessions?lessonId=${lessonId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (sessionRes.ok) {
            const sData = await sessionRes.json();
            if (sData?.data?.id) {
              setSessionId(sData.data.id);
              setSessionToken(token);
            }
          }
        } catch (e) {
          console.error("Failed to create session", e);
        }

        // 2. Fetch Questions
        const response = await fetch(`${baseUrl}/api/v1/student/games/1/questions?lessonId=${lessonId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

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
              try {
                choicesArr = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
              } catch (e) {
                choicesArr = [];
              }
              word = q.correctAnswer || 'إجابة';
              image = q.imageUrl || q.image || null;
              audio = q.audioUrl || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (isAnswerFormat) {
              questionText = q.questionTitle || 'بدون سؤال';
              try {
                choicesArr = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || []);
              } catch (e) {
                choicesArr = [];
              }
              word = q.correctAnswer || 'إجابة';
              image = q.image || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (hasChoiceDetails) {
              const details = q.choiceDetails || {};
              questionText = details.title || 'بدون سؤال';
              choicesArr = details.choices || [];
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
    setVictoryData(null);
    setQuestionStartTime(Date.now());
    setView('playing');
  };

  const submitGameSession = async (finalAnswers: any[]) => {
    if (!sessionId || !sessionToken) {
      setView('victory');
      return;
    }

    setIsSubmitting(true);
    setView('victory');

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://oasis-eduline-1.onrender.com';

      // Submit Answers
      await fetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/submit-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ answers: finalAnswers })
      });

      // Complete Session
      const completeRes = await fetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
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

    setAnswersList(prev => {
      const newAnswers = [...prev, answerRecord];

      // Check if there are more questions
      if (currentQuestionIndex + 1 < apiQuestions.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setQuestionStartTime(Date.now());
      } else {
        submitGameSession(newAnswers);
      }
      return newAnswers;
    });

    setScore((prev) => prev + 10);
  };

  const handleWrongAnswer = (wrongWord: string) => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));
    const currentQ = apiQuestions[currentQuestionIndex];

    setAnswersList(prev => [...prev, {
      questionId: currentQ.id,
      selectedAnswer: wrongWord,
      isCorrect: false,
      timeTaken: timeTaken,
      pointsEarned: 0
    }]);

    setScore((prev) => Math.max(0, prev - 5));
  };

  const handleLoseLife = () => {
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        gameAudio.playGameOver();
        // The game is completely finished, show the ONLY final results screen
        submitGameSession(answersList);
        setView('victory');
      }
      return nextLives;
    });
  };

  if (error) {
    return (
      <div className="w-screen min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold p-8 text-center" dir="rtl">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold" dir="rtl">
        جاري تحميل اللعبة...
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen overflow-x-hidden flex items-center justify-center">
      {view === 'welcome' && (
        <WelcomeScreen 
          onStart={handleStartGame} 
          totalQuestions={apiQuestions.length}
          isLoading={isLoading}
          error={error}
        />
      )}

      {view === 'playing' && (
        <GameScreen
          questions={apiQuestions}
          currentQuestionIndex={currentQuestionIndex}
          score={score}
          lives={lives}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onLoseLife={handleLoseLife}
          onBackToWelcome={() => setView('welcome')}
        />
      )}


      {view === 'victory' && (
        <VictoryModal
          score={score}
          totalQuestions={apiQuestions.length}
          correctAnswers={answersList.filter(a => a.isCorrect).length}
          wrongAnswers={answersList.filter(a => !a.isCorrect).length}
          isSubmitting={isSubmitting}
          victoryData={victoryData}
          onRestart={handleStartGame}
          onHome={() => setView('welcome')}
        />
      )}
    </div>
  );
}

export default App;
