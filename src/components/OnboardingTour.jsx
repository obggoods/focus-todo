import { useEffect, useLayoutEffect, useState } from "react";

const TOUR_STEPS = [
  {
    targetId: "hero-account-row",
    title: "오늘의 시작점이에요",
    description:
      "왼쪽에서는 응원 문구를 보고, 오른쪽에서는 닉네임 수정과 로그아웃을 할 수 있어요.",
  },
  {
    targetId: "category-tabs",
    title: "목표를 카테고리로 나눠요",
    description:
      "목표가 많아져도 카테고리 탭으로 필요한 목표만 골라볼 수 있어요. 연필 버튼으로 카테고리를 관리할 수 있어요.",
  },
  {
    targetId: "goal-add",
    title: "큰 목표를 하나 적어보세요",
    description:
      "예: 방 청소, 병원 예약하기, 프로젝트 끝내기. 너무 크게 느껴져도 괜찮아요. 다음 화면에서 잘게 쪼개면 돼요.",
  },
  {
    targetId: "goal-cards",
    title: "목표 카드를 눌러 쪼개요",
    description:
      "목표 카드를 열면 태스크와 서브태스크를 추가할 수 있어요. 진행률과 다음 할 일도 여기서 확인해요.",
  },
];

function getTargetRect(targetId) {
  const element = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const padding = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    right: Math.min(viewportWidth - 8, rect.right + padding),
    bottom: Math.min(viewportHeight - 8, rect.bottom + padding),
    width: Math.min(viewportWidth - 16, rect.width + padding * 2),
    height: Math.min(viewportHeight - 16, rect.height + padding * 2),
  };
}

function getCardPosition(rect) {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const cardWidth = Math.min(360, window.innerWidth - 32);
  const gap = 14;
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - gap;
  const fitsBelow = belowTop + 210 < window.innerHeight;
  const top = fitsBelow ? belowTop : Math.max(16, aboveTop - 210);
  const left = Math.min(
    Math.max(16, rect.left),
    Math.max(16, window.innerWidth - cardWidth - 16)
  );

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${cardWidth}px`,
    transform: "none",
  };
}

export default function OnboardingTour({ onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    const updateRect = () => {
      setTargetRect(getTargetRect(step.targetId));
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step.targetId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onFinish();
      if (event.key === "ArrowRight" && !isLastStep) {
        setStepIndex((current) => current + 1);
      }
      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(0, current - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLastStep, onFinish]);

  const moveNext = () => {
    if (isLastStep) {
      onFinish();
      return;
    }

    setStepIndex((current) => current + 1);
  };

  const movePrev = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const cardPosition = getCardPosition(targetRect);

  return (
    <div className="onboardingTour" role="dialog" aria-modal="true" aria-label="ADHD-TODO 사용법 안내">
      {targetRect ? (
        <>
          <div className="tourShade tourShadeTop" style={{ height: `${targetRect.top}px` }} />
          <div className="tourShade tourShadeBottom" style={{ top: `${targetRect.bottom}px` }} />
          <div
            className="tourShade tourShadeLeft"
            style={{
              top: `${targetRect.top}px`,
              width: `${targetRect.left}px`,
              height: `${targetRect.height}px`,
            }}
          />
          <div
            className="tourShade tourShadeRight"
            style={{
              top: `${targetRect.top}px`,
              left: `${targetRect.right}px`,
              height: `${targetRect.height}px`,
            }}
          />
          <div
            className="tourHighlight"
            style={{
              top: `${targetRect.top}px`,
              left: `${targetRect.left}px`,
              width: `${targetRect.width}px`,
              height: `${targetRect.height}px`,
            }}
          />
        </>
      ) : (
        <div className="tourShade tourShadeFull" />
      )}

      <section className="tourCard" style={cardPosition}>
        <div className="tourStepCount">
          {stepIndex + 1}/{TOUR_STEPS.length}
        </div>
        <h2>{step.title}</h2>
        <p>{step.description}</p>

        <div className="tourActions">
          <button className="tourSkipBtn" type="button" onClick={onFinish}>
            건너뛰기
          </button>
          <div className="tourStepActions">
            {stepIndex > 0 && (
              <button className="tourBackBtn" type="button" onClick={movePrev}>
                이전
              </button>
            )}
            <button className="tourNextBtn" type="button" onClick={moveNext}>
              {isLastStep ? "시작하기" : "다음"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
