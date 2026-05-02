import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isSignup = mode === "signup";
  const cleanNickname = nickname.trim();
  const canSubmit =
    email.trim() &&
    password.length >= 6 &&
    (!isSignup || (cleanNickname.length >= 1 && cleanNickname.length <= 20)) &&
    !loading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 6) {
      setErrorMessage("이메일과 6자 이상의 비밀번호를 입력해 주세요.");
      return;
    }

    if (isSignup && (cleanNickname.length < 1 || cleanNickname.length > 20)) {
      setErrorMessage("닉네임은 1자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    if (!supabase) {
      setErrorMessage("Supabase 환경변수가 아직 연결되지 않았습니다.");
      return;
    }

    setLoading(true);

    const { error } = isSignup
      ? await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nickname: cleanNickname,
            display_name: cleanNickname,
          },
        },
      })
      : await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message || "인증 처리에 실패했습니다.");
      return;
    }

    if (isSignup) {
      setMessage(
        "회원가입 요청이 완료됐습니다. 메일함을 확인해 주세요."
      );
      return;
    }

    setMessage("로그인되었습니다.");
  };

  return (
    <div className="authScreen">
      <section className="authCard" aria-label="ADHD-TODO 로그인">
        <div className="authHeader">
          <p className="authEyebrow">ADHD-TODO</p>
          <h1>{isSignup ? "계정 만들기" : "로그인"}</h1>
          <p>
            성인 ADHD 네모가 만든 투두리스트
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="authNotice" role="alert">
            Supabase 환경변수가 없습니다. 프로젝트 루트에 .env.local을 추가해 주세요.
          </div>
        )}

        <form className="authForm" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="authField">
              <span>닉네임</span>
              <input
                className="input softInput"
                type="text"
                value={nickname}
                autoComplete="nickname"
                placeholder="예: 네모"
                maxLength={20}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
          )}

          <label className="authField">
            <span>이메일</span>
            <input
              className="input softInput"
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="authField">
            <span>비밀번호</span>
            <input
              className="input softInput"
              type="password"
              value={password}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="6자 이상"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage && (
            <div className="authError" role="alert">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="authSuccess" role="status">
              {message}
            </div>
          )}

          <button
            className="btn softPrimaryBtn authSubmitBtn"
            type="submit"
            disabled={!canSubmit}
          >
            {loading ? "처리 중" : isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        <button
          className="authModeButton"
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "signup" : "login"));
            setMessage("");
            setErrorMessage("");
          }}
        >
          {isSignup
            ? "이미 계정이 있으면 로그인하기"
            : "처음이면 계정 만들기"}
        </button>
      </section>
    </div>
  );
}
