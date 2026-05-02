import { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../utils/id";
import { DEFAULT_CATEGORY_ID } from "../utils/storage";

const CATEGORY_EMOJI_OPTIONS = [
  { emoji: "🌱", label: "새싹", color: "#8BCB6A" },
  { emoji: "🧹", label: "청소", color: "#FFEBA3" },
  { emoji: "💼", label: "일", color: "#A78BFA" },
  { emoji: "💚", label: "건강", color: "#7FCB77" },
  { emoji: "⭐", label: "취미", color: "#FFD166" },
  { emoji: "🏃", label: "운동", color: "#7FB3FF" },
  { emoji: "📚", label: "공부", color: "#B8A6F5" },
  { emoji: "☀️", label: "루틴", color: "#FFCF70" },
  { emoji: "🎨", label: "창작", color: "#FFB3A7" },
  { emoji: "🧘", label: "휴식", color: "#8FD7C3" },
];

const DEFAULT_NEW_CATEGORY = CATEGORY_EMOJI_OPTIONS[0];
const SOFT_FALLBACK_COLOR = "#8BCB6A";

const HERO_MESSAGES = [
  "오늘은 하나만 해도 충분해요.",
  "작게 쪼개면 바로 시작할 수 있어요.",
  "완벽보다 시작이 먼저예요.",
  "지금 할 일 하나만 골라요.",
  "멈췄다가 다시 해도 괜찮아요.",
  "작은 완료가 오늘을 바꿔요.",
  "천릿 길도 한 걸음부터!",
  "완벽주의보다는 완료주의!",
  "지금 할 수 있는 만큼만 해봐요.",
  "시작하기 가장 좋은 타이밍은 바로 지금!",
  "할 일을 쪼개면 마음도 가벼워져요.",
  "아무 생각 말고 바로 시작하기!",
];

function calcTaskProgress(task) {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    return task.done ? 100 : 0;
  }

  const done = task.subtasks.filter((s) => s.done).length;
  return Math.round((done / task.subtasks.length) * 100);
}

function calcProgress(goal) {
  const total = goal.tasks.length;
  if (total === 0) return 0;

  const sum = goal.tasks.reduce((acc, task) => acc + calcTaskProgress(task), 0);
  return Math.round(sum / total);
}

function getCategory(categories, categoryId) {
  return (
    categories.find((cat) => cat.id === categoryId) ||
    categories.find((cat) => cat.id === DEFAULT_CATEGORY_ID) ||
    categories[0]
  );
}

function getCategoryPresetByName(name = "") {
  const normalized = name.trim().toLowerCase();

  if (!normalized) return null;
  if (normalized.includes("기본")) return { emoji: "📂", color: "#94a3b8" };
  if (normalized.includes("운동")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🏃");
  if (normalized.includes("청소") || normalized.includes("집안")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🧹");
  if (normalized.includes("일") || normalized.includes("업무")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "💼");
  if (normalized.includes("건강")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "💚");
  if (normalized.includes("취미")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "⭐");
  if (normalized.includes("공부") || normalized.includes("학습")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "📚");
  if (normalized.includes("루틴") || normalized.includes("아침")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "☀️");
  if (normalized.includes("창작") || normalized.includes("만들")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🎨");
  if (normalized.includes("휴식") || normalized.includes("쉬")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🧘");
  if (normalized.includes("생산") || normalized.includes("집중")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🌱");

  return null;
}

function getCategoryEmoji(category) {
  if (!category) return "🌱";
  if (typeof category.emoji === "string" && category.emoji.trim()) {
    return category.emoji;
  }

  const namePreset = getCategoryPresetByName(category.name);
  if (namePreset?.emoji) return namePreset.emoji;

  const colorPreset = CATEGORY_EMOJI_OPTIONS.find(
    (item) => item.color.toLowerCase() === String(category.color || "").toLowerCase()
  );
  if (colorPreset?.emoji) return colorPreset.emoji;

  const seed = String(category.id || category.name || "category");
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_EMOJI_OPTIONS[hash % CATEGORY_EMOJI_OPTIONS.length].emoji;
}

function getCategoryColor(category) {
  if (!category) return SOFT_FALLBACK_COLOR;
  if (typeof category.color === "string" && category.color.trim()) return category.color;

  const namePreset = getCategoryPresetByName(category.name);
  return namePreset?.color || SOFT_FALLBACK_COLOR;
}

function getNextAction(goal) {
  const task = goal.tasks.find((item) => calcTaskProgress(item) < 100);
  if (!task) return "모든 태스크를 완료했어요.";

  const subtask = Array.isArray(task.subtasks)
    ? task.subtasks.find((item) => !item.done)
    : null;

  return subtask ? subtask.title : task.title;
}

export default function GoalList({
  goals,
  setGoals,
  categories,
  setCategories,
  onOpenGoal,
  accountPanel,
}) {
  const [title, setTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(DEFAULT_CATEGORY_ID);
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState(DEFAULT_NEW_CATEGORY.emoji);
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState(null);
  const [isGoalCategoryMenuOpen, setIsGoalCategoryMenuOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const categoryManagePanelRef = useRef(null);
  const goalCategorySelectRef = useRef(null);

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const visibleGoals = useMemo(() => {
    const filtered =
      filterCategoryId === "all"
        ? goals
        : goals.filter((goal) => goal.categoryId === filterCategoryId);

    return [...filtered].sort((a, b) => {
      const aPct = calcProgress(a);
      const bPct = calcProgress(b);

      const aDone = aPct === 100;
      const bDone = bPct === 100;

      if (aDone !== bDone) return aDone ? 1 : -1;
      if (!aDone && !bDone) return bPct - aPct;
      return 0;
    });
  }, [goals, filterCategoryId]);

  const editingCategory = orderedCategories.find(
    (cat) => cat.id === editingCategoryId
  );

  const selectedNewCategoryPreset =
    CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === newCategoryEmoji) ||
    DEFAULT_NEW_CATEGORY;

  const selectedGoalCategory = getCategory(
    orderedCategories,
    selectedCategoryId || DEFAULT_CATEGORY_ID
  );

  const [heroMessage, setHeroMessage] = useState(() => {
    const index = Math.floor(Math.random() * HERO_MESSAGES.length);
    return HERO_MESSAGES[index];
  });

  const changeHeroMessage = () => {
    setHeroMessage((current) => {
      const candidates = HERO_MESSAGES.filter((message) => message !== current);
      const index = Math.floor(Math.random() * candidates.length);
      return candidates[index] || current;
    });
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setOpenEmojiPickerId(null);
  };

  const closeCategoryManage = () => {
    setIsCategoryManageOpen(false);
    cancelEditCategory();
  };

  useEffect(() => {
    if (!isCategoryManageOpen) return;

    const handlePointerDown = (event) => {
      if (!categoryManagePanelRef.current) return;
      if (categoryManagePanelRef.current.contains(event.target)) return;

      closeCategoryManage();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCategoryManageOpen]);

  useEffect(() => {
    if (!isGoalCategoryMenuOpen) return;

    const handlePointerDown = (event) => {
      if (goalCategorySelectRef.current?.contains(event.target)) return;
      setIsGoalCategoryMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isGoalCategoryMenuOpen]);

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    const exists = categories.some((cat) => cat.name === name);
    if (exists) {
      setNewCategoryName("");
      return;
    }

    const now = Date.now();
    const nextCategory = {
      id: uid(),
      name,
      emoji: selectedNewCategoryPreset.emoji,
      color: selectedNewCategoryPreset.color,
      order: categories.length,
      createdAt: now,
      updatedAt: now,
    };

    setCategories((prev) => [...prev, nextCategory]);
    setSelectedCategoryId(nextCategory.id);
    setFilterCategoryId(nextCategory.id);
    setNewCategoryName("");

    const nextOption = CATEGORY_EMOJI_OPTIONS[categories.length % CATEGORY_EMOJI_OPTIONS.length];
    setNewCategoryEmoji(nextOption.emoji);
    setOpenEmojiPickerId(null);
  };

  const updateCategoryEmoji = (categoryId, option) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
            ...cat,
            emoji: option.emoji,
            color: option.color,
            updatedAt: Date.now(),
          }
          : cat
      )
    );
    setOpenEmojiPickerId(null);
  };

  const startEditCategory = (category) => {
    if (category.id === DEFAULT_CATEGORY_ID) return;

    if (editingCategoryId === category.id) {
      cancelEditCategory();
      return;
    }

    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setNewCategoryName("");
    setOpenEmojiPickerId(null);
  };

  const saveEditCategory = (categoryId) => {
    const name = editingCategoryName.trim();
    if (!name) return;

    const exists = categories.some(
      (cat) => cat.id !== categoryId && cat.name === name
    );
    if (exists) return;

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, name, updatedAt: Date.now() }
          : cat
      )
    );

    cancelEditCategory();
  };

  const deleteCategory = (categoryId) => {
    if (categoryId === DEFAULT_CATEGORY_ID) return;

    const target = categories.find((cat) => cat.id === categoryId);
    if (!target) return;

    const ok = window.confirm(
      `카테고리 "${target.name}"을 삭제할까요?\n이 카테고리의 목표는 기본 카테고리로 이동합니다.`
    );
    if (!ok) return;

    setGoals((prev) =>
      prev.map((goal) =>
        goal.categoryId === categoryId
          ? { ...goal, categoryId: DEFAULT_CATEGORY_ID, updatedAt: Date.now() }
          : goal
      )
    );

    setCategories((prev) =>
      prev
        .filter((cat) => cat.id !== categoryId)
        .map((cat, index) => ({ ...cat, order: index }))
    );

    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(DEFAULT_CATEGORY_ID);
    }

    if (filterCategoryId === categoryId) {
      setFilterCategoryId(DEFAULT_CATEGORY_ID);
    }

    cancelEditCategory();
  };

  const addGoal = () => {
    const t = title.trim();
    if (!t) return;

    const now = Date.now();
    const next = {
      id: uid(),
      title: t,
      description: "",
      categoryId: selectedCategoryId || DEFAULT_CATEGORY_ID,
      createdAt: now,
      updatedAt: now,
      tasks: [],
    };

    setGoals((prev) => [next, ...prev]);
    setTitle("");
    setIsGoalCategoryMenuOpen(false);
  };

  const deleteGoal = (id) => {
    const ok = window.confirm("이 목표를 삭제할까요?");
    if (!ok) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="screen adhdScreen">
      <div className="heroAccountRow" data-tour-id="hero-account-row">
        <button
          type="button"
          className="welcomeCard compactHeroCard heroMessageButton"
          onClick={changeHeroMessage}
          aria-label="응원 메시지 바꾸기"
          title="탭해서 응원 메시지 바꾸기"
        >
          <div className="welcomeCopy">
            <h2>{heroMessage}</h2>
          </div>
          <div className="mascotBubble" aria-hidden="true">
            <img src="/nemo_hero.png" alt="" />
          </div>
        </button>

        {accountPanel}
      </div>

      <section className="panel categoryPanel" ref={categoryManagePanelRef} data-tour-id="category-tabs">

        <div className="categoryHeaderRow">
          <div className="categoryTabs">
            <button
              type="button"
              className={`categoryTab ${filterCategoryId === "all" ? "isActive" : ""} ${isCategoryManageOpen ? "isDisabledForManage" : ""}`}
              onClick={() => {
                if (isCategoryManageOpen) return;
                setFilterCategoryId("all");
                setSelectedCategoryId(DEFAULT_CATEGORY_ID);
              }}
              disabled={isCategoryManageOpen}
            >
              <span className="categoryEmoji" aria-hidden="true">🌍</span>
              전체
            </button>

            {orderedCategories.map((cat) => {
              const isDefault = cat.id === DEFAULT_CATEGORY_ID;
              const isEditingThis = editingCategoryId === cat.id;
              const isLockedInManage = isCategoryManageOpen && isDefault;

              return (
                <div
                  className={`categoryChipWrap ${isCategoryManageOpen && !isDefault ? "isManageMode" : ""}`}
                  key={cat.id}
                >
                  <button
                    type="button"
                    className={`categoryTab ${filterCategoryId === cat.id ? "isActive" : ""} ${isEditingThis ? "isEditing" : ""} ${isLockedInManage ? "isDisabledForManage" : ""}`}
                    onClick={() => {
                      if (isLockedInManage) return;

                      if (isCategoryManageOpen && !isDefault) {
                        startEditCategory(cat);
                        return;
                      }

                      setFilterCategoryId(cat.id);
                      setSelectedCategoryId(cat.id);
                    }}
                    disabled={isLockedInManage}
                    style={{ "--category-color": getCategoryColor(cat) }}
                  >
                    <span className="categoryEmoji" aria-hidden="true">
                      {getCategoryEmoji(cat)}
                    </span>
                    {cat.name}
                  </button>

                  {isCategoryManageOpen && !isDefault && (
                    <button
                      type="button"
                      className="categoryChipDeleteBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(cat.id);
                      }}
                      aria-label={`${cat.name} 카테고리 삭제`}
                      title="카테고리 삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={`manageIconBtn ${isCategoryManageOpen ? "isActive" : ""}`}
            onClick={() => {
              setIsCategoryManageOpen((prev) => {
                const next = !prev;
                if (!next) cancelEditCategory();
                return next;
              });
            }}
            aria-label="카테고리 관리"
            title="카테고리 관리"
          >
            ✎
          </button>
        </div>

        {isCategoryManageOpen && (
          <div className="categoryManageBox compact">
            <div className="categoryManageHint">
              {editingCategory
                ? "이모지도 바꿀 수 있어요!"
                : "카테고리 칩을 눌러 수정이 가능해요."}
            </div>

            <div className="row categoryAddRow">
              <div className="emojiPickerWrap">
                <button
                  type="button"
                  className="emojiPickerButton"
                  style={{
                    "--emoji-bg": editingCategory
                      ? getCategoryColor(editingCategory)
                      : selectedNewCategoryPreset.color,
                  }}
                  onClick={() =>
                    setOpenEmojiPickerId((prev) =>
                      prev === "form" ? null : "form"
                    )
                  }
                  aria-label={
                    editingCategory
                      ? `${editingCategory.name} 이모지 선택`
                      : "새 카테고리 이모지 선택"
                  }
                  title="이모지 선택"
                >
                  {editingCategory ? getCategoryEmoji(editingCategory) : newCategoryEmoji}
                </button>

                {openEmojiPickerId === "form" && (
                  <div
                    className="emojiPalette"
                    role="listbox"
                    aria-label={
                      editingCategory
                        ? `${editingCategory.name} 이모지 팔레트`
                        : "새 카테고리 이모지 팔레트"
                    }
                  >
                    {CATEGORY_EMOJI_OPTIONS.map((option) => {
                      const selectedEmoji = editingCategory
                        ? getCategoryEmoji(editingCategory)
                        : newCategoryEmoji;

                      return (
                        <button
                          type="button"
                          key={`${option.emoji}-${option.label}`}
                          className={`emojiPaletteItem ${selectedEmoji === option.emoji ? "isSelected" : ""}`}
                          style={{ "--emoji-bg": option.color }}
                          onClick={() => {
                            if (editingCategory) {
                              updateCategoryEmoji(editingCategory.id, option);
                            } else {
                              setNewCategoryEmoji(option.emoji);
                              setOpenEmojiPickerId(null);
                            }
                          }}
                          aria-label={`${option.label} 이모지 선택`}
                        >
                          {option.emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                className="input softInput"
                value={editingCategory ? editingCategoryName : newCategoryName}
                placeholder={editingCategory ? "카테고리 이름 수정" : "새 카테고리"}
                maxLength={30}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategoryName(e.target.value);
                  } else {
                    setNewCategoryName(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingCategory) saveEditCategory(editingCategory.id);
                    else addCategory();
                  }

                  if (e.key === "Escape" && editingCategory) {
                    cancelEditCategory();
                  }
                }}
              />

              {editingCategory ? (
                <div className="categoryFormActions">
                  <button
                    className="btn softPrimaryBtn"
                    type="button"
                    onClick={() => saveEditCategory(editingCategory.id)}
                    disabled={!editingCategoryName.trim()}
                  >
                    저장
                  </button>
                  <button
                    className="btn softGhostBtn"
                    type="button"
                    onClick={cancelEditCategory}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  className="btn softPrimaryBtn"
                  type="button"
                  onClick={addCategory}
                  disabled={!newCategoryName.trim()}
                >
                  추가
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="panel goalAddPanel" data-tour-id="goal-add">
        <div className="row goalAddRow">
          <input
            className="input softInput"
            value={title}
            placeholder='새 목표를 입력해보세요. 예: "방 청소"'
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addGoal();
            }}
          />

          <div className="detailCategorySelect goalAddCategorySelect" ref={goalCategorySelectRef}>
            <button
              type="button"
              className={"detailCategoryTrigger " + (isGoalCategoryMenuOpen ? "isOpen" : "")}
              style={{ "--category-color": getCategoryColor(selectedGoalCategory) }}
              onClick={() => setIsGoalCategoryMenuOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isGoalCategoryMenuOpen}
              aria-label="목표 카테고리 선택"
            >
              <span className="detailCategoryIcon" aria-hidden="true">
                {getCategoryEmoji(selectedGoalCategory)}
              </span>
              <span className="detailCategoryName">
                {selectedGoalCategory?.name || "기본"}
              </span>
              <span className="detailCategoryChevron" aria-hidden="true">⌄</span>
            </button>

            {isGoalCategoryMenuOpen && (
              <div className="detailCategoryMenu goalAddCategoryMenu" role="listbox" aria-label="목표 카테고리 선택">
                {orderedCategories.map((cat) => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      role="option"
                      aria-selected={selected}
                      className={"detailCategoryOption " + (selected ? "isSelected" : "")}
                      style={{ "--category-color": getCategoryColor(cat) }}
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setIsGoalCategoryMenuOpen(false);
                      }}
                    >
                      <span className="detailCategoryOptionIcon" aria-hidden="true">
                        {getCategoryEmoji(cat)}
                      </span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button className="btn softPrimaryBtn" onClick={addGoal} disabled={!title.trim()}>
            추가
          </button>
        </div>
      </section>

      <section className="list goalCardList" data-tour-id="goal-cards">
        {visibleGoals.length === 0 ? (
          <div className="empty softEmpty">
            <div className="emptyTitle">표시할 목표가 없습니다</div>
            <div className="emptyText">
              목표를 추가하거나 다른 카테고리를 선택하세요.
            </div>
          </div>
        ) : (
          visibleGoals.map((g) => {
            const pct = calcProgress(g);
            const isCompleted = pct === 100;
            const total = g.tasks.length;
            const done = g.tasks.filter((task) => calcTaskProgress(task) === 100).length;
            const category = getCategory(categories, g.categoryId);
            const categoryColor = getCategoryColor(category);
            const categoryEmoji = getCategoryEmoji(category);
            const nextAction = getNextAction(g);

            return (
              <div
                key={g.id}
                className={`card softGoalCard ${isCompleted ? "completed" : ""}`}
                style={{ "--category-color": categoryColor }}
              >
                <div
                  className="cardMain softGoalCardMain"
                  onClick={() => onOpenGoal(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpenGoal(g.id);
                  }}
                >
                  {category && (
                    <div className="categoryBadge softCategoryBadge">
                      {category.name}
                    </div>
                  )}

                  <div className="softGoalBody">
                    <div className="goalEmojiBadge" aria-hidden="true">
                      {categoryEmoji}
                    </div>

                    <div className="softGoalTextBlock">
                      <div className="cardTitle softGoalTitle">{g.title}</div>

                      <div className="cardMeta softGoalMeta">
                        <span className="pct">{pct}%</span>
                        <span className="dot">•</span>
                        <span className="metaText">
                          {done}/{total} tasks
                        </span>
                      </div>

                      <div className="nextActionText">
                        다음: {nextAction}
                      </div>
                    </div>
                  </div>

                  <div className="barWrap softBarWrap" aria-hidden="true">
                    <div className="bar softBar" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <button
                  className="iconBtn danger softGoalDeleteBtn"
                  type="button"
                  aria-label="목표 삭제"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGoal(g.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
