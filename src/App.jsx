import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import GoalList from "./components/GoalList";
import GoalDetail from "./components/GoalDetail";
import AuthPage from "./components/AuthPage";
import OnboardingTour from "./components/OnboardingTour";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  CATEGORY_STORAGE_KEY,
  STORAGE_KEY,
  normalizeCategories,
  normalizeGoals,
} from "./utils/storage";
import "./App.css";

function getSessionNickname(session) {
  return (
    session?.user?.user_metadata?.nickname?.trim() ||
    session?.user?.user_metadata?.display_name?.trim() ||
    ""
  );
}

export default function App() {
  const [goals, setGoals] = useLocalStorage(STORAGE_KEY, [], normalizeGoals);
  const [categories, setCategories] = useLocalStorage(
    CATEGORY_STORAGE_KEY,
    [],
    normalizeCategories
  );
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileNickname, setProfileNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

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
      setProfileNickname("");
      setNicknameDraft("");
      setIsEditingNickname(false);
      setNicknameError("");
      setShowOnboarding(false);
      setOnboardingSaving(false);
      return;
    }

    let ignore = false;
    const fallbackNickname = getSessionNickname(session);

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, onboarding_seen_at")
        .eq("id", session.user.id)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        setProfileNickname(fallbackNickname);
        setNicknameDraft(fallbackNickname);
        setShowOnboarding(false);
        return;
      }

      const nextNickname = data?.nickname?.trim() || fallbackNickname;
      setProfileNickname(nextNickname);
      setNicknameDraft(nextNickname);
      setShowOnboarding(!data?.onboarding_seen_at);
    };

    loadProfile();

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
    setGoals((prev) => prev.map((g) => (g.id === nextGoal.id ? nextGoal : g)));
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setActiveGoalId((cur) => (cur === id ? null : cur));
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActiveGoalId(null);
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
      <div className="accountAppTitle">아데하데 투두</div>

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
        <div className="accountContentRow">
          <span className="accountGreeting">{greetingText}</span>
          <div className="accountActions">
            <button
              className="accountEditBtn"
              type="button"
              onClick={startEditNickname}
              aria-label="닉네임 수정"
              title="닉네임 수정"
            >
              ✎
            </button>
            <button
              className="accountLogoutBtn"
              type="button"
              onClick={handleSignOut}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <Layout>
      {!activeGoal ? (
        <GoalList
          goals={goals}
          setGoals={setGoals}
          categories={categories}
          setCategories={setCategories}
          onOpenGoal={openGoal}
          accountPanel={accountPanel}
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

      {!activeGoal && showOnboarding && (
        <OnboardingTour onFinish={completeOnboarding} />
      )}
    </Layout>
  );
}
