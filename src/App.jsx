import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "./components/Layout";
import GoalList from "./components/GoalList";
import GoalDetail from "./components/GoalDetail";
import AuthPage from "./components/AuthPage";
import OnboardingTour from "./components/OnboardingTour";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  fetchTodoData,
  syncCategoryListChanges,
  syncGoalListChanges,
} from "./lib/todoDb";
import "./App.css";

function getSessionNickname(session) {
  return (
    session?.user?.user_metadata?.nickname?.trim() ||
    session?.user?.user_metadata?.display_name?.trim() ||
    ""
  );
}

export default function App() {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const goalsRef = useRef([]);
  const categoriesRef = useRef([]);
  const saveQueueRef = useRef(Promise.resolve());

  const [activeGoalId, setActiveGoalId] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoError, setTodoError] = useState("");
  const [profileNickname, setProfileNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  const replaceGoals = (nextGoals) => {
    goalsRef.current = nextGoals;
    setGoals(nextGoals);
  };

  const replaceCategories = (nextCategories) => {
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  };

  const enqueueDbSave = (saveTask) => {
    saveQueueRef.current = saveQueueRef.current
      .then(saveTask)
      .catch(() => {
        setTodoError("저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.");
      });
  };

  const applyGoalsUpdate = (updater) => {
    const previousGoals = goalsRef.current;
    const nextGoals =
      typeof updater === "function" ? updater(previousGoals) : updater;

    replaceGoals(nextGoals);
    setTodoError("");

    const userId = session?.user?.id;
    if (!userId) return;

    enqueueDbSave(() => syncGoalListChanges(userId, previousGoals, nextGoals));
  };

  const applyCategoriesUpdate = (updater) => {
    const previousCategories = categoriesRef.current;
    const nextCategories =
      typeof updater === "function" ? updater(previousCategories) : updater;

    replaceCategories(nextCategories);
    setTodoError("");

    const userId = session?.user?.id;
    if (!userId) return;

    enqueueDbSave(() =>
      syncCategoryListChanges(userId, previousCategories, nextCategories)
    );
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (!error) {
        setSession(data.session || null);
      }

      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession || null);
        setActiveGoalId(null);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      replaceGoals([]);
      replaceCategories([]);
      setProfileNickname("");
      setNicknameDraft("");
      setIsEditingNickname(false);
      setNicknameError("");
      setShowOnboarding(false);
      setOnboardingSaving(false);
      setTodoLoading(false);
      setTodoError("");
      return;
    }

    let ignore = false;
    const fallbackNickname = getSessionNickname(session);

    const loadUserData = async () => {
      setTodoLoading(true);
      setTodoError("");

      const profilePromise = supabase
        .from("profiles")
        .select("nickname, onboarding_seen_at")
        .eq("id", session.user.id)
        .maybeSingle();

      const todoPromise = fetchTodoData(session.user.id);
      const [profileResult, todoResult] = await Promise.allSettled([
        profilePromise,
        todoPromise,
      ]);

      if (ignore) return;

      if (profileResult.status === "fulfilled" && !profileResult.value.error) {
        const data = profileResult.value.data;
        const nextNickname = data?.nickname?.trim() || fallbackNickname;
        setProfileNickname(nextNickname);
        setNicknameDraft(nextNickname);
        setShowOnboarding(!data?.onboarding_seen_at);
      } else {
        setProfileNickname(fallbackNickname);
        setNicknameDraft(fallbackNickname);
        setShowOnboarding(false);
      }

      if (todoResult.status === "fulfilled") {
        replaceCategories(todoResult.value.categories);
        replaceGoals(todoResult.value.goals);
      } else {
        replaceCategories([]);
        replaceGoals([]);
        setTodoError("목표 데이터를 불러오지 못했습니다. Supabase 테이블/RLS를 확인해 주세요.");
      }

      setTodoLoading(false);
    };

    loadUserData();

    return () => {
      ignore = true;
    };
  }, [session]);

  const activeGoal = useMemo(() => {
    if (!activeGoalId) return null;
    return goals.find((g) => g.id === activeGoalId) || null;
  }, [goals, activeGoalId]);

  const openGoal = (id) => setActiveGoalId(id);
  const backToList = () => setActiveGoalId(null);

  const updateGoal = (nextGoal) => {
    applyGoalsUpdate((prev) =>
      prev.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
    );
  };

  const deleteGoal = (id) => {
    applyGoalsUpdate((prev) => prev.filter((goal) => goal.id !== id));
    setActiveGoalId((cur) => (cur === id ? null : cur));
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActiveGoalId(null);
    replaceGoals([]);
    replaceCategories([]);
  };

  const completeOnboarding = async () => {
    if (onboardingSaving) return;

    setOnboardingSaving(true);
    setShowOnboarding(false);

    if (!supabase || !session?.user?.id) {
      setOnboardingSaving(false);
      return;
    }

    const seenAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: session.user.id,
          onboarding_seen_at: seenAt,
        },
        { onConflict: "id" }
      );

    if (error) {
      setShowOnboarding(true);
    }

    setOnboardingSaving(false);
  };

  const startEditNickname = () => {
    setNicknameDraft(profileNickname);
    setNicknameError("");
    setIsEditingNickname(true);
  };

  const cancelEditNickname = () => {
    setNicknameDraft(profileNickname);
    setNicknameError("");
    setIsEditingNickname(false);
  };

  const saveNickname = async (event) => {
    event.preventDefault();

    const cleanNickname = nicknameDraft.trim();
    if (cleanNickname.length < 1 || cleanNickname.length > 20) {
      setNicknameError("닉네임은 1자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    if (!supabase || !session?.user?.id) {
      setNicknameError("로그인 정보를 다시 확인해 주세요.");
      return;
    }

    setNicknameSaving(true);
    setNicknameError("");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: session.user.id,
          nickname: cleanNickname,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      setNicknameSaving(false);
      setNicknameError("닉네임 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const { data: userData } = await supabase.auth.updateUser({
      data: {
        nickname: cleanNickname,
        display_name: cleanNickname,
      },
    });

    if (userData?.user) {
      setSession((prev) => (prev ? { ...prev, user: userData.user } : prev));
    }

    setProfileNickname(cleanNickname);
    setNicknameDraft(cleanNickname);
    setIsEditingNickname(false);
    setNicknameSaving(false);
  };

  const greetingText = profileNickname
    ? `${profileNickname}님, 오늘도 화이팅!`
    : "닉네임을 설정해 주세요.";

  if (authLoading) {
    return (
      <Layout>
        <div className="authLoadingCard">로그인 상태를 확인하는 중입니다.</div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <AuthPage />
      </Layout>
    );
  }

  const accountPanel = (
    <section
      className={`accountBar ${isEditingNickname ? "isEditing" : ""}`}
      aria-label="계정 정보"
    >

      <div className="accountHeaderRow">
        <div className="accountAppTitle">ADHD Todo</div>

        {!isEditingNickname && (
          <div className="accountActions">
            <button
              className="accountEditBtn accountIconBtn"
              type="button"
              onClick={startEditNickname}
              aria-label="닉네임 수정"
              title="닉네임 수정"
            >
              ✎
            </button>
            <button
              className="accountLogoutBtn accountIconBtn"
              type="button"
              onClick={handleSignOut}
              aria-label="로그아웃"
              title="로그아웃"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.5A1.5 1.5 0 0 1 10 18.5V17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 12H4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 9l3 3-3 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {isEditingNickname ? (
        <form className="accountNicknameForm" onSubmit={saveNickname}>
          <label className="srOnly" htmlFor="accountNicknameInput">
            닉네임
          </label>
          <input
            id="accountNicknameInput"
            className="accountNicknameInput"
            type="text"
            value={nicknameDraft}
            maxLength={20}
            autoComplete="nickname"
            placeholder="닉네임"
            onChange={(event) => {
              setNicknameDraft(event.target.value);
              setNicknameError("");
            }}
          />
          <div className="accountEditActions">
            <button
              className="accountSaveBtn"
              type="submit"
              disabled={nicknameSaving || !nicknameDraft.trim()}
            >
              {nicknameSaving ? "저장 중" : "저장"}
            </button>
            <button
              className="accountCancelBtn"
              type="button"
              onClick={cancelEditNickname}
              disabled={nicknameSaving}
            >
              취소
            </button>
          </div>
          {nicknameError && (
            <p className="accountNicknameError" role="alert">
              {nicknameError}
            </p>
          )}
        </form>
      ) : (
        <p className="accountGreeting">{greetingText}</p>
      )}
    </section>
  );

  return (
    <Layout>
      {todoError && <div className="authErrorBanner">{todoError}</div>}

      {todoLoading ? (
        <div className="authLoadingCard">내 목표를 불러오는 중입니다.</div>
      ) : !activeGoal ? (
        <GoalList
          goals={goals}
          setGoals={applyGoalsUpdate}
          categories={categories}
          setCategories={applyCategoriesUpdate}
          onOpenGoal={openGoal}
          accountPanel={accountPanel}
          onMobileSignOut={handleSignOut}
        />
      ) : (
        <GoalDetail
          goal={activeGoal}
          categories={categories}
          onBack={backToList}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
        />
      )}

      {!activeGoal && !todoLoading && showOnboarding && (
        <OnboardingTour onFinish={completeOnboarding} />
      )}
    </Layout>
  );
}
