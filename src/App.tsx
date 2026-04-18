import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import axios from "axios";
import "./styles.css";

type ReelType = "video" | "quiz" | "ad";

interface ReelItem {
  id: number;
  type: ReelType;
  title: string;
  description: string;
  url?: string;
  question?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
}

interface Story {
  id: number;
  name: string;
  reels: ReelItem[];
}

const VIDEO_1 = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const VIDEO_2 = "https://www.w3schools.com/html/mov_bbb.mp4";
const VIDEO_3 = "https://www.w3schools.com/html/movie.mp4";

/* =====================================================
   DATA MAKER
===================================================== */
const makeSubject = (id: number, name: string): Story => {
  const reels: ReelItem[] = [];

  for (let i = 1; i <= 10; i++) {
    reels.push({
      id: id * 100 + i,
      type: "video",
      title: `${name} Reel ${i}`,
      description: `${name} learning short ${i}`,
      url: i % 3 === 0 ? VIDEO_1 : i % 2 === 0 ? VIDEO_2 : VIDEO_3
    });

    if (i === 5) {
      reels.push({
        id: id * 100 + 50,
        type: "ad",
        title: "Sponsored Ad",
        description: "This is an advertisement",
        url: VIDEO_2
      });
    }
  }

  reels.push({
    id: id * 100 + 99,
    type: "quiz",
    title: `${name} Quiz`,
    description: "",
    question: `Which subject is this section about?`,
    options: ["Maths", "Physics", "Science", name],
    answer: name,
    explanation: `This full reel set belongs to ${name}.`
  });

  return { id, name, reels };
};

export default function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [reelIndex, setReelIndex] = useState(0);

  const [pageLoading, setPageLoading] = useState(true);
  const [reelLoading, setReelLoading] = useState(true);

  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);

  /* =====================================================
     LOAD DATA
  ==================================================== */
  useEffect(() => {
    const load = async () => {
      setPageLoading(true);

      await axios.get("https://jsonplaceholder.typicode.com/posts/1");

      setStories([
        makeSubject(1, "Science"),
        makeSubject(2, "Maths"),
        makeSubject(3, "Physics")
      ]);

      setPageLoading(false);
    };

    load();
  }, []);

  const reels = useMemo(
    () => stories[storyIndex]?.reels || [],
    [stories, storyIndex]
  );

  const current = reels[reelIndex];

  /* =====================================================
     LOAD REEL
  ==================================================== */
  useEffect(() => {
    if (!current) return;

    setSelectedAnswer("");
    setShowResult(false);
    setProgress(0);
    setReelLoading(true);

    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (
      video &&
      (current.type === "video" || current.type === "ad")
    ) {
      if (current.url?.includes(".m3u8")) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(current.url);
          hls.attachMedia(video);
          hlsRef.current = hls;
        } else {
          video.src = current.url;
        }
      } else {
        video.src = current.url || "";
      }

      const loaded = () => {
        setReelLoading(false);
        video.play().catch(() => {});
        setPaused(false);
      };

      video.addEventListener("loadeddata", loaded);

      return () => {
        video.removeEventListener("loadeddata", loaded);
      };
    } else {
      setReelLoading(false);
    }
  }, [storyIndex, reelIndex, current]);

  /* =====================================================
     VIDEO EVENTS
  ==================================================== */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const ended = () => {
      nextReel();
    };

    video.addEventListener("timeupdate", update);
    video.addEventListener("ended", ended);

    return () => {
      video.removeEventListener("timeupdate", update);
      video.removeEventListener("ended", ended);
    };
  });

  /* =====================================================
     NAVIGATION LOOP
  ==================================================== */
  const nextReel = () => {
    if (reelIndex < reels.length - 1) {
      setReelIndex((v) => v + 1);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((v) => v + 1);
      setReelIndex(0);
    } else {
      setStoryIndex(0);
      setReelIndex(0);
    }
  };

  const prevReel = () => {
    if (reelIndex > 0) {
      setReelIndex((v) => v - 1);
    } else if (storyIndex > 0) {
      const prev = storyIndex - 1;
      setStoryIndex(prev);
      setReelIndex(stories[prev].reels.length - 1);
    } else {
      const last = stories.length - 1;
      setStoryIndex(last);
      setReelIndex(stories[last].reels.length - 1);
    }
  };

  const nextStory = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((v) => v + 1);
    } else {
      setStoryIndex(0);
    }
    setReelIndex(0);
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((v) => v - 1);
    } else {
      setStoryIndex(stories.length - 1);
    }
    setReelIndex(0);
  };

  /* =====================================================
     TOUCH SWIPE
  ==================================================== */
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.changedTouches[0].clientX;
    startY.current = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX.current;
    const diffY = endY - startY.current;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < -40) nextStory();
      if (diffX > 40) prevStory();
    } else {
      if (diffY < -40) nextReel();
      if (diffY > 40) prevReel();
    }
  };

  /* =====================================================
     PLAY / PAUSE
  ==================================================== */
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (paused) video.play().catch(() => {});
    else video.pause();

    setPaused(!paused);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const val = Number(e.target.value);
    video.currentTime = (val / 100) * video.duration;
    setProgress(val);
  };

  if (pageLoading) {
    return (
      <div className="app loaderScreen">
        <div className="miniLoader"></div>
      </div>
    );
  }

  if (!current) return null;

  /* =====================================================
     QUIZ BUTTON STYLE
  ==================================================== */
  const getQuizClass = (option: string) => {
    if (!showResult) {
      return option === selectedAnswer
        ? "quizBtn selected"
        : "quizBtn";
    }

    if (option === current.answer) {
      return "quizBtn correct";
    }

    if (
      option === selectedAnswer &&
      option !== current.answer
    ) {
      return "quizBtn wrong";
    }

    return "quizBtn";
  };

  const isCorrect = selectedAnswer === current.answer;

  return (
    <div className="app">
      <div
        className="phone"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {(current.type === "video" || current.type === "ad") && (
          <video ref={videoRef} className="video" autoPlay playsInline />
        )}

        {current.type === "quiz" && (
          <div className="quizWrap">
            <div className="quizBadge">QUIZ</div>

            <h2>{current.question}</h2>

            {current.options?.map((item) => (
              <button
                key={item}
                className={getQuizClass(item)}
                onClick={() => {
                  if (showResult) return;

                  setSelectedAnswer(item);
                  setShowResult(true);
                }}
              >
                {item}
              </button>
            ))}

            {showResult && (
              <div
                className={
                  isCorrect
                    ? "quizResult success"
                    : "quizResult fail"
                }
              >
                {isCorrect ? "✅ Correct! " : "❌ Wrong! "}
                {current.explanation}
              </div>
            )}
          </div>
        )}

        {reelLoading && (
          <div className="reelLoaderWrap">
            <div className="miniLoader"></div>
          </div>
        )}

        {(current.type === "video" || current.type === "ad") && (
          <button className="playBtn" onClick={togglePlay}>
            {paused ? "▶" : "❚❚"}
          </button>
        )}

        {current.type === "ad" && (
          <div className="adBadge">ADVERTISEMENT</div>
        )}

        <div className="bottomInfo">
          <div className="storyName">{stories[storyIndex].name}</div>
          <div className="title">{current.title}</div>
          <div className="desc">{current.description}</div>

          {(current.type === "video" || current.type === "ad") && (
            <input
              type="range"
              className="seek"
              min="0"
              max="100"
              value={progress}
              onChange={seek}
            />
          )}
        </div>
      </div>
    </div>
  );
}