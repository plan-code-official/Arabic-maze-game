import React, { useState, useEffect, useRef } from 'react';
import { Heart, ArrowLeft, Volume2, Music, Target } from 'lucide-react';
import { MazeCanvas } from './MazeCanvas';
import type { Question } from '../data/questions';

interface GameScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  lives: number;
  onCorrectAnswer: () => void;
  onWrongAnswer: (word: string) => void;
  onLoseLife: () => void;
  onBackToWelcome: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  questions,
  currentQuestionIndex,
  score,
  lives,
  onCorrectAnswer,
  onWrongAnswer,
  onLoseLife,
  onBackToWelcome,
}) => {
  const currentQuestion = questions[currentQuestionIndex];

  // Distribute correct word + 3 distractors randomly
  // To keep it persistent for this question, we memoize it or generate it once.
  // We can use a simple seeded shuffle based on currentQuestionIndex, or state.
  // Using state is simple: when currentQuestionIndex changes, we generate a shuffled array of words.
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [lastIndex, setLastIndex] = useState<number>(-1);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('game-active');
    document.body.classList.add('game-active');

    return () => {
      document.documentElement.classList.remove('game-active');
      document.body.classList.remove('game-active');
    };
  }, []);

  useEffect(() => {
    if (currentQuestion?.audioUrl) {
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex, currentQuestion?.audioUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Play prevented:', e));
    }
  };

  // Touch pad external direction input
  const extDir = null;

  if (lastIndex !== currentQuestionIndex && currentQuestion) {
    const allWords = [currentQuestion.word, ...currentQuestion.distractors];
    // Simple random shuffle
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    setShuffledWords(allWords);
    setLastIndex(currentQuestionIndex);
  }

  const triggerNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  const handleWrong = (word: string) => {
    onWrongAnswer(word);
    triggerNotification('خطأ', 'error');
  };

  const handleCorrect = () => {
    triggerNotification('أحسنت', 'success');
    onCorrectAnswer();
  };

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <Heart
          key={i}
          className={`w-6 h-6 transition-all duration-300 ${i < lives
            ? 'text-[#ff007f] fill-[#ff007f] filter drop-shadow-[0_0_5px_rgba(255,0,127,0.7)]'
            : 'text-gray-600 fill-transparent'
            }`}
        />
      );
    }
    return <div className="flex gap-1">{hearts}</div>;
  };

  return (
    <div className="game-screen w-full max-w-[1440px] mx-auto p-3 sm:p-5 lg:p-7 flex flex-col items-center justify-start gap-3 lg:gap-5">

      {/* 1. Header panel */}
      <div className="game-header glass-panel w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 relative z-10">
        <button
          onClick={onBackToWelcome}
          className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4 ml-1 p-2" />
          الرئيسية
        </button>

        {/* HUD Info */}
        <div className="game-hud flex items-center gap-3 sm:gap-6">
          {/* Level */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">المرحلة</span>
            <span className="text-xl font-black text-[#00f0ff]" dir="ltr">{currentQuestionIndex + 1} / {questions.length}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">النقاط</span>
            <span className="text-xl font-black text-[#39ff14]" dir="ltr">{score}</span>
          </div>

          {/* Lives */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">المحاولات</span>
            <div dir="ltr">{renderHearts()}</div>
          </div>
        </div>
      </div>

      {/* 2. Main layout */}
      <div className="game-main flex-1 w-full min-h-0 flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-8 pb-2">

        {/* Left Side (Actually Right in RTL): Question Display */}
        <div className="question-panel glass-panel w-full lg:w-[320px] p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-0 flex-shrink-0 border border-[#00f0ff]/20 shadow-lg rounded-2xl relative overflow-hidden">
          {/* Question Text and/or Image */}
          {currentQuestion && (
            <div className="question-content relative z-10 w-full h-full flex flex-col items-center justify-center gap-2 sm:gap-3">
              <Target className="question-decoration absolute text-[#00f0ff] opacity-5 filter blur-sm" aria-hidden="true" />

              {currentQuestion.image && (
                <div className="question-image-wrap w-full min-h-0 flex items-center justify-center relative z-10">
                  <img
                    src={currentQuestion.image}
                    alt="صورة السؤال"
                    className="question-image max-w-full max-h-full object-contain drop-shadow-lg cursor-zoom-in"
                    onClick={() => setZoomedImage(currentQuestion.image)}
                  />
                </div>
              )}

              {currentQuestion.questionText && (
                <div className="question-text text-xl sm:text-2xl lg:text-3xl text-white font-black text-center leading-relaxed shrink-0 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-white/10 w-full relative z-10 shadow-lg">
                  {currentQuestion.questionText}
                </div>
              )}

              {/* Optional Audio */}
              {currentQuestion.audioUrl && (
                <div className="question-audio w-full shrink-0 flex items-center justify-center">
                  <audio
                    ref={audioRef}
                    src={currentQuestion.audioUrl}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <button
                    onClick={toggleAudio}
                    style={{ background: 'transparent', border: 'none', outline: 'none' }}
                    aria-label={isPlayingAudio ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                    className={`appearance-none bg-transparent border-none outline-none focus:outline-none shadow-none transition-all duration-300 transform active:scale-90 hover:scale-110 ${isPlayingAudio ? 'translate-y-1 opacity-80' : 'animate-[bounce_2.5s_infinite]'
                      }`}
                  >
                    <div className={`filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-transform ${isPlayingAudio ? 'animate-pulse text-[#39ff14]' : 'text-[#ff007f]'}`}>
                      {isPlayingAudio ? (
                        <Music className="w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28" />
                      ) : (
                        <Volume2 className="w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Maze Board */}
        <div className="maze-column relative flex-1 flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 flex-shrink-0">
          {/* Toast Notification overlay */}
          {notification && (
            <div className={`answer-feedback-card answer-feedback-card--inline ${notification.type === 'success' ? 'answer-feedback-card--success' : 'answer-feedback-card--wrong'}`} dir="rtl">
              <svg className="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {notification.type === 'success' ? <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></> : <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>}
              </svg><span className="answer-feedback__text">{notification.text}</span>
            </div>
          )}

          <MazeCanvas
            level={currentQuestionIndex + 1}
            words={shuffledWords}
            correctWord={currentQuestion?.word}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            onLoseLife={onLoseLife}
            lives={lives}
            isPaused={false}
            externalDirection={extDir}
          />
        </div>

      </div>

      {zoomedImage && (
        <div className="question-image-modal" role="dialog" aria-modal="true" onClick={() => setZoomedImage(null)}>
          <div className="question-image-modal__content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="question-image-modal__close" onClick={() => setZoomedImage(null)} aria-label="إغلاق الصورة">×</button>
            <img src={zoomedImage} alt="صورة السؤال مكبرة" />
          </div>
        </div>
      )}

    </div>
  );
};
